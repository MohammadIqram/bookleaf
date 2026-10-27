import { z } from 'zod';
import { getLLMProvider } from './providers/index.js';
import { aiCircuitBreaker } from './circuitBreaker.js';
import { AiFallback } from './fallback.js';
import { buildClassifierPrompt } from './prompts/classifierPrompt.js';
import { SYSTEM_PROMPT } from './prompts/systemPrompt.js';
import { extractContextFacts } from './priority.js';
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../config/constants.js';
import prisma from '../config/prisma.js';
import logger from '../utils/logger.js';

const classifierOutputSchema = z.object({
  category: z.enum(TICKET_CATEGORIES),
  priority: z.enum(TICKET_PRIORITIES),
  confidence: z.number().min(0).max(1).optional().default(0.85),
  reasoning: z.string().min(5).max(300),
});

export class Classifier {
  /**
   * Classifies a ticket into one of the 6 categories and scores priority.
   *
   * @param {object} ticket
   * @param {object} author
   * @param {object} book
   * @returns {Promise<{ category: string, priority: string, source: 'AI' | 'RULES', reasoning: string }>}
   */
  static async classify(ticket, author, book) {
    const contextFacts = extractContextFacts(ticket, author, book);

    // 1. Check Circuit Breaker
    if (aiCircuitBreaker.isOpen()) {
      logger.warn(`[Classifier] Circuit breaker is OPEN. Invoking deterministic rules fallback.`);
      const fallback = AiFallback.classifyAndPrioritize(ticket.subject, ticket.description);
      return { ...fallback, source: 'RULES', aiStatus: 'FAILED' };
    }

    const provider = getLLMProvider();
    const prompt = buildClassifierPrompt({
      subject: ticket.subject,
      description: ticket.description,
      contextFacts,
    });

    const startTime = Date.now();

    try {
      const response = await provider.complete({
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 150,
        temperature: 0,
        json: true,
      });

      aiCircuitBreaker.recordSuccess();

      // Log AI Usage
      await prisma.aiUsageLog.create({
        data: {
          ticketId: ticket.id,
          task: 'classify',
          model: response.model,
          tokensIn: response.tokensIn,
          tokensOut: response.tokensOut,
          latencyMs: response.latencyMs,
          success: true,
        },
      });

      const parsedJson = JSON.parse(response.content);
      const validated = classifierOutputSchema.parse(parsedJson);

      return {
        category: validated.category,
        priority: validated.priority,
        source: 'AI',
        aiStatus: 'DONE',
        reasoning: validated.reasoning,
      };
    } catch (err) {
      aiCircuitBreaker.recordFailure(err);

      // Log failed AI usage
      try {
        await prisma.aiUsageLog.create({
          data: {
            ticketId: ticket.id,
            task: 'classify',
            model: provider?.model || 'unknown',
            tokensIn: 0,
            tokensOut: 0,
            latencyMs: Date.now() - startTime,
            success: false,
            errorType: err.message?.slice(0, 100),
          },
        });
      } catch (_logErr) {
        // Silently continue if log fails
      }

      logger.warn(`[Classifier] AI classification failed: ${err.message}. Falling back to deterministic rules.`);
      const fallback = AiFallback.classifyAndPrioritize(ticket.subject, ticket.description);
      return {
        ...fallback,
        source: 'RULES',
        aiStatus: 'FAILED',
      };
    }
  }
}

export default Classifier;
