import { LLMProvider } from './LLMProvider.js';
import { env } from '../../config/env.js';
import logger from '../../utils/logger.js';

export class AnthropicProvider extends LLMProvider {
  constructor(apiKey = env.ANTHROPIC_API_KEY, model = env.ANTHROPIC_MODEL) {
    super();
    this.apiKey = apiKey;
    this.model = model || 'claude-3-haiku-20240307';
  }

  async complete({ system, messages, maxTokens = 500, temperature = 0, json = false }) {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured.');
    }

    const startTime = Date.now();
    const formattedMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const payload = {
      model: this.model,
      max_tokens: maxTokens,
      temperature,
      messages: formattedMessages,
    };

    if (system) {
      payload.system = system;
    }

    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
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
            logger.warn(`[Anthropic] HTTP ${response.status}. Retrying in ${backoff}ms (attempt ${retries}/${maxRetries})...`);
            await new Promise((resolve) => setTimeout(resolve, backoff));
            continue;
          }
          throw new Error(`Anthropic API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const latencyMs = Date.now() - startTime;
        const content = data.content?.[0]?.text || '';
        const tokensIn = data.usage?.input_tokens || 0;
        const tokensOut = data.usage?.output_tokens || 0;

        return {
          content: json ? this.extractJson(content) : content,
          model: this.model,
          tokensIn,
          tokensOut,
          latencyMs,
        };
      } catch (err) {
        clearTimeout(timeout);
        if (err.name === 'AbortError') {
          throw new Error('Anthropic API request timed out after 15 seconds.');
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

  extractJson(text) {
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed;
    }
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return match[0];
    return trimmed;
  }
}

export default AnthropicProvider;
