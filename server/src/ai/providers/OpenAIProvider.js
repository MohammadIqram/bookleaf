import { LLMProvider } from './LLMProvider.js';
import { env } from '../../config/env.js';
import logger from '../../utils/logger.js';

export class OpenAIProvider extends LLMProvider {
  constructor(apiKey = env.OPENAI_API_KEY, model = env.OPENAI_MODEL) {
    super();
    this.apiKey = apiKey;
    this.model = model || 'gpt-4o-mini';
  }

  async complete({ system, messages, maxTokens = 500, temperature = 0, json = false }) {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured.');
    }

    const startTime = Date.now();
    const formattedMessages = [];

    if (system) {
      formattedMessages.push({ role: 'system', content: system });
    }

    for (const m of messages) {
      formattedMessages.push({ role: m.role, content: m.content });
    }

    const payload = {
      model: this.model,
      max_tokens: maxTokens,
      temperature,
      messages: formattedMessages,
    };

    if (json) {
      payload.response_format = { type: 'json_object' };
    }

    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const errText = await response.text();
          if ((response.status === 429 || response.status >= 500) && retries < maxRetries) {
            retries++;
            const backoff = Math.pow(2, retries) * 500;
            logger.warn(`[OpenAI] HTTP ${response.status}. Retrying in ${backoff}ms (attempt ${retries}/${maxRetries})...`);
            await new Promise((resolve) => setTimeout(resolve, backoff));
            continue;
          }
          throw new Error(`OpenAI API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const latencyMs = Date.now() - startTime;
        const content = data.choices?.[0]?.message?.content || '';
        const tokensIn = data.usage?.prompt_tokens || 0;
        const tokensOut = data.usage?.completion_tokens || 0;

        return {
          content,
          model: this.model,
          tokensIn,
          tokensOut,
          latencyMs,
        };
      } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          throw new Error('OpenAI API request timed out after 15 seconds.');
        }
        if (retries < maxRetries && !err.message.includes('not configured')) {
          retries++;
          const backoff = Math.pow(2, retries) * 500;
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
        throw err;
      }
    }
  }
}

export default OpenAIProvider;
