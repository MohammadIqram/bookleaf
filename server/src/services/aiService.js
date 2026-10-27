import prisma from '../config/prisma.js';
import { Classifier } from '../ai/classifier.js';
import { Drafter } from '../ai/drafter.js';
import sseService from './sseService.js';
import logger from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';

export class AiService {
  /**
   * Classifies and prioritizes an author ticket.
   * Respects admin overrides: never overrides fields where source is 'ADMIN'.
   *
   * @param {string} ticketId
   * @param {boolean} [force=false]
   */
  static async classifyAndPrioritizeTicket(ticketId, force = false) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        author: true,
        book: true,
      },
    });

    if (!ticket) {
      throw AppError.notFound('Ticket not found for AI classification.', 'TICKET_NOT_FOUND');
    }

    // Skip if already classified and not forcing reclassification
    if (ticket.aiClassificationStatus === 'DONE' && !force) {
      return ticket;
    }

    logger.info(`[AiService] Running classification for ticket ${ticket.ticketNumber}...`);

    const classificationResult = await Classifier.classify(ticket, ticket.author, ticket.book);

    const updatePayload = {
      aiClassificationStatus: classificationResult.aiStatus,
      aiReasoning: classificationResult.reasoning,
    };

    // Only update category if not manually set by an Admin
    if (ticket.categorySource !== 'ADMIN') {
      updatePayload.category = classificationResult.category;
      updatePayload.categorySource = classificationResult.source;
    }

    // Only update priority if not manually set by an Admin
    if (ticket.prioritySource !== 'ADMIN') {
      updatePayload.priority = classificationResult.priority;
      updatePayload.prioritySource = classificationResult.source;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: updatePayload,
      include: {
        book: { select: { id: true, title: true, isbn: true } },
        author: {
          select: {
            id: true,
            name: true,
            user: { select: { email: true } },
          },
        },
      },
    });

    // Notify connected admins and authors via SSE
    sseService.notifyTicketUpdated(updated);

    return updated;
  }

  /**
   * Retrieves existing draft from cache or generates a fresh one on open
   *
   * @param {string} ticketId
   */
  static async getOrGenerateDraft(ticketId) {
    return Drafter.generateDraft(ticketId, false);
  }

  /**
   * Forces regeneration of an AI draft
   *
   * @param {string} ticketId
   */
  static async generateDraft(ticketId, forceRegenerate = true) {
    return Drafter.generateDraft(ticketId, forceRegenerate);
  }
}

export const aiService = AiService;
export default aiService;
