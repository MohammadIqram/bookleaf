import crypto from 'crypto';
import prisma from '../config/prisma.js';

export class AiDraftCache {
  /**
   * Generates a deterministic hash representing the exact context inputs of a draft request
   */
  static computeInputHash({ ticketId, subject, description, lastMessageId, promptVersion }) {
    const raw = `${ticketId}::${subject}::${description}::${lastMessageId || 'init'}::${promptVersion}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Retrieves cached draft from database if hash matches
   */
  static async getCachedDraft(inputHash) {
    return prisma.aiDraft.findFirst({
      where: { inputHash },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Saves a newly generated draft into cache table
   */
  static async saveDraft({ ticketId, body, model, promptVersion, inputHash, tokensIn, tokensOut }) {
    return prisma.aiDraft.create({
      data: {
        ticketId,
        body,
        model,
        promptVersion,
        inputHash,
        tokensIn,
        tokensOut,
      },
    });
  }
}

export default AiDraftCache;
