import { TicketService } from '../services/ticketService.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError } from '../utils/AppError.js';

export const createTicket = asyncHandler(async (req, res) => {
  if (req.user.role !== 'AUTHOR') {
    throw AppError.forbidden('Only authors can submit new support tickets.', 'AUTHOR_ONLY');
  }

  const ticket = await TicketService.createTicket({
    authorId: req.user.authorId,
    userId: req.user.id,
    data: req.body,
  });

  res.status(201).json({
    message: 'Support ticket submitted successfully',
    ticket,
  });
});

export const getTickets = asyncHandler(async (req, res) => {
  const result = await TicketService.getTickets(req.user, req.query);
  res.status(200).json(result);
});

export const getTicketById = asyncHandler(async (req, res) => {
  const ticket = await TicketService.getTicketById(req.params.id, req.user);
  res.status(200).json({ ticket });
});

export const addMessage = asyncHandler(async (req, res) => {
  const { body, isAiDraftBased } = req.body;
  const message = await TicketService.addMessage({
    ticketId: req.params.id,
    user: req.user,
    body,
    isAiDraftBased,
  });

  res.status(201).json({
    message: 'Message added to ticket thread',
    ticketMessage: message,
  });
});

export const patchTicket = asyncHandler(async (req, res) => {
  const updatedTicket = await TicketService.patchTicket({
    ticketId: req.params.id,
    updates: req.body,
  });

  res.status(200).json({
    message: 'Ticket updated successfully',
    ticket: updatedTicket,
  });
});

export const assignTicket = asyncHandler(async (req, res) => {
  const { unassign = false } = req.body;
  const updatedTicket = await TicketService.assignTicket({
    ticketId: req.params.id,
    adminId: req.user.id,
    unassign: Boolean(unassign),
  });

  res.status(200).json({
    message: unassign ? 'Ticket unassigned' : 'Ticket assigned to you',
    ticket: updatedTicket,
  });
});

export const getInternalNotes = asyncHandler(async (req, res) => {
  const notes = await TicketService.getInternalNotes(req.params.id);
  res.status(200).json({ notes });
});

export const addInternalNote = asyncHandler(async (req, res) => {
  const note = await TicketService.addInternalNote({
    ticketId: req.params.id,
    adminId: req.user.id,
    body: req.body.body,
  });

  res.status(201).json({
    message: 'Internal note added',
    note,
  });
});

/**
 * AI Draft & Reclassification endpoints (Handled in Phase 4)
 */
export const getAiDraft = asyncHandler(async (req, res) => {
  try {
    const { aiService } = await import('../services/aiService.js');
    const draft = await aiService.getOrGenerateDraft(req.params.id);
    res.status(200).json({ draft });
  } catch (err) {
    if (err.isOperational) throw err;
    res.status(503).json({
      error: {
        code: 'AI_UNAVAILABLE',
        message: 'AI drafting service is currently unavailable. Please compose a response manually.',
      },
    });
  }
});

export const regenerateAiDraft = asyncHandler(async (req, res) => {
  try {
    const { aiService } = await import('../services/aiService.js');
    const draft = await aiService.generateDraft(req.params.id, true);
    res.status(200).json({ draft });
  } catch (err) {
    if (err.isOperational) throw err;
    res.status(503).json({
      error: {
        code: 'AI_UNAVAILABLE',
        message: 'AI draft regeneration failed. Please compose manually.',
      },
    });
  }
});

export const reclassifyTicket = asyncHandler(async (req, res) => {
  try {
    const { aiService } = await import('../services/aiService.js');
    const result = await aiService.classifyAndPrioritizeTicket(req.params.id, true);
    res.status(200).json({ message: 'Ticket reclassified', result });
  } catch (err) {
    if (err.isOperational) throw err;
    res.status(503).json({
      error: {
        code: 'AI_UNAVAILABLE',
        message: 'AI reclassification unavailable.',
      },
    });
  }
});
