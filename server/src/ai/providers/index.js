import { env } from '../../config/env.js';
import { AnthropicProvider } from './AnthropicProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import logger from '../../utils/logger.js';

let cachedProvider = null;

export function getLLMProvider() {
  if (cachedProvider) return cachedProvider;

  const providerType = env.LLM_PROVIDER?.toLowerCase() || 'anthropic';

  if (providerType === 'openai') {
    logger.info(`[AI] Initialized OpenAI provider (Model: ${env.OPENAI_MODEL})`);
    cachedProvider = new OpenAIProvider();
  } else {
    logger.info(`[AI] Initialized Anthropic provider (Model: ${env.ANTHROPIC_MODEL})`);
    cachedProvider = new AnthropicProvider();
  }

  return cachedProvider;
}

export default getLLMProvider;
