import { Router } from 'express';
import {
  createTicket,
  getTickets,
  getTicketById,
  addMessage,
  patchTicket,
  assignTicket,
  getInternalNotes,
  addInternalNote,
  getAiDraft,
  regenerateAiDraft,
  reclassifyTicket,
} from '../controllers/ticketController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimiters.js';
import {
  createTicketSchema,
  addMessageSchema,
  addNoteSchema,
  patchTicketSchema,
  ticketQuerySchema,
} from '../validators/ticketSchemas.js';

const router = Router();

// All ticket routes require authentication
router.use(authenticate);

// 1. Author & Queue list/create
router.post('/', authorize('AUTHOR'), validate(createTicketSchema), createTicket);
router.get('/', validate(ticketQuerySchema, 'query'), getTickets);
router.get('/:id', getTicketById);

// 2. Conversation messages (Author follow-up or Admin reply)
router.post('/:id/messages', validate(addMessageSchema), addMessage);

// 3. Admin Ticket Management
router.patch('/:id', authorize('ADMIN'), validate(patchTicketSchema), patchTicket);
router.post('/:id/assign', authorize('ADMIN'), assignTicket);

// 4. Admin Internal Notes (NEVER accessible to authors)
router.get('/:id/notes', authorize('ADMIN'), getInternalNotes);
router.post('/:id/notes', authorize('ADMIN'), validate(addNoteSchema), addInternalNote);

// 5. Admin AI Draft & Reclassification (Rate limited)
router.get('/:id/draft', authorize('ADMIN'), aiLimiter, getAiDraft);
router.post('/:id/draft/regenerate', authorize('ADMIN'), aiLimiter, regenerateAiDraft);
router.post('/:id/reclassify', authorize('ADMIN'), aiLimiter, reclassifyTicket);

export default router;
