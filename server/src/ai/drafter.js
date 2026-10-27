import { getLLMProvider } from './providers/index.js';
import { aiCircuitBreaker } from './circuitBreaker.js';
import { AiDraftCache } from './cache.js';
import { knowledgeBase } from './knowledgeBase/index.js';
import { buildDraftPrompt, DRAFT_PROMPT_VERSION } from './prompts/draftPrompt.js';
import { SYSTEM_PROMPT } from './prompts/systemPrompt.js';
import { AiFallback } from './fallback.js';
import prisma from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

export class Drafter {
  /**
   * Generates or retrieves cached email response draft for an admin
   *
   * @param {string} ticketId
   * @param {boolean} [forceRegenerate=false]
   */
  static async generateDraft(ticketId, forceRegenerate = false) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        author: {
          include: {
            books: {
              select: {
                id: true,
                title: true,
                status: true,
                totalCopiesSold: true,
                royaltyPending: true,
              },
            },
          },
        },
        book: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 4, // Latest 4 messages only to conserve tokens
          include: { sender: { select: { name: true, role: true } } },
        },
      },
    });

    if (!ticket) {
      throw AppError.notFound('Ticket not found', 'TICKET_NOT_FOUND');
    }

    const lastMessage = ticket.messages[0];
    const inputHash = AiDraftCache.computeInputHash({
      ticketId,
      subject: ticket.subject,
      description: ticket.description,
      lastMessageId: lastMessage?.id,
      promptVersion: DRAFT_PROMPT_VERSION,
    });

    // 1. Check database draft cache unless force regeneration is requested
    if (!forceRegenerate) {
      const cached = await AiDraftCache.getCachedDraft(inputHash);
      if (cached) {
        logger.info(`[Drafter] Cache HIT for ticket ${ticket.ticketNumber} (inputHash: ${inputHash.slice(0, 8)}...)`);
        return {
          id: cached.id,
          body: cached.body,
          model: cached.model,
          isCached: true,
          inputHash: cached.inputHash,
          promptVersion: cached.promptVersion,
        };
      }
    }

    // 2. Check Circuit Breaker
    if (aiCircuitBreaker.isOpen()) {
      logger.warn('[Drafter] Circuit breaker is OPEN. AI drafting unavailable.');
      const staticTemplate = AiFallback.getStaticTemplate(ticket.category, ticket.author.name);
      return {
        body: staticTemplate,
        model: 'static-fallback-template',
        isFallback: true,
        isCached: false,
      };
    }

    // 3. Prepare Selective Smart Context
    const category = ticket.category || 'General Inquiry';
    const kbSection = knowledgeBase.getRelevantSection(category);
    const fewShotExample = knowledgeBase.getMatchingExample(category);

    // Book Context (Only the specific book if linked, or concise author catalog summary)
    let bookContext = '';
    if (ticket.book) {
      const b = ticket.book;
      bookContext = `Title: "${b.title}"
ISBN: ${b.isbn}
Status: ${b.status}
Genre: ${b.genre}
MRP: ₹${b.mrp || 'N/A'}
Author Royalty per Copy: ₹${b.royaltyPerCopy || 'N/A'}
Total Copies Sold: ${b.totalCopiesSold}
Total Royalty Earned: ₹${b.totalRoyaltyEarned}
Royalty Paid to Date: ₹${b.royaltyPaid}
Royalty Pending: ₹${b.royaltyPending}
Last Payout Date: ${b.lastPayoutDate ? b.lastPayoutDate.toISOString().split('T')[0] : 'None (First cycle)'}
Available On: ${b.availableOn.join(', ') || 'None yet'}`;
    } else {
      const titles = ticket.author.books.map((b) => `"${b.title}" (${b.status})`).join(', ');
      bookContext = `Author has ${ticket.author.books.length} book(s) in catalog: ${titles || 'No books yet'}.`;
    }

    // Chronological conversation history (latest 4 messages, chronologically ordered)
    const reversedMessages = [...ticket.messages].reverse();
    const conversationHistory = reversedMessages
      .map((m) => `[${m.senderType === 'ADMIN' ? 'Support Agent' : 'Author'} (${m.sender?.name || 'User'})]: ${m.body}`)
      .join('\n\n');

    const prompt = buildDraftPrompt({
      authorName: ticket.author.name,
      category,
      kbSection,
      toneGuidelines: knowledgeBase.toneGuidelines,
      fewShotExample,
      bookContext,
      conversationHistory,
      authorQuery: lastMessage?.body || ticket.description,
    });

    const provider = getLLMProvider();
    const startTime = Date.now();

    try {
      const response = await provider.complete({
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 500,
        temperature: 0.2,
      });

      aiCircuitBreaker.recordSuccess();

      // Log AI Usage
      await prisma.aiUsageLog.create({
        data: {
          ticketId,
          task: 'draft',
          model: response.model,
          tokensIn: response.tokensIn,
          tokensOut: response.tokensOut,
          latencyMs: response.latencyMs,
          success: true,
        },
      });

      // Save generated draft to database cache
      const savedDraft = await AiDraftCache.saveDraft({
        ticketId,
        body: response.content.trim(),
        model: response.model,
        promptVersion: DRAFT_PROMPT_VERSION,
        inputHash,
        tokensIn: response.tokensIn,
        tokensOut: response.tokensOut,
      });

      return {
        id: savedDraft.id,
        body: savedDraft.body,
        model: savedDraft.model,
        isCached: false,
        inputHash: savedDraft.inputHash,
        promptVersion: savedDraft.promptVersion,
      };
    } catch (err) {
      aiCircuitBreaker.recordFailure(err);

      // Log failed AI usage
      try {
        await prisma.aiUsageLog.create({
          data: {
            ticketId,
            task: 'draft',
            model: provider?.model || 'unknown',
            tokensIn: 0,
            tokensOut: 0,
            latencyMs: Date.now() - startTime,
            success: false,
            errorType: err.message?.slice(0, 100),
          },
        });
      } catch (_logErr) {
        // Silently continue
      }

      logger.warn(`[Drafter] AI draft generation failed: ${err.message}`);
      // Return graceful static fallback
      const staticTemplate = AiFallback.getStaticTemplate(category, ticket.author.name);
      return {
        body: staticTemplate,
        model: 'static-fallback-template',
        isFallback: true,
        isCached: false,
      };
    }
  }
}

export default Drafter;
