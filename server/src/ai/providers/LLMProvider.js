/**
 * Interface and base class for LLM Providers.
 */
export class LLMProvider {
  /**
   * @param {{
   *   system?: string,
   *   messages: Array<{ role: 'user' | 'assistant' | 'system', content: string }>,
   *   maxTokens?: number,
   *   temperature?: number,
   *   json?: boolean
   * }} params
   * @returns {Promise<{
   *   content: string,
   *   model: string,
   *   tokensIn: number,
   *   tokensOut: number,
   *   latencyMs: number
   * }>}
   */
  async complete(_params) {
    throw new Error('complete() must be implemented by LLMProvider subclasses');
  }
}

export default LLMProvider;
