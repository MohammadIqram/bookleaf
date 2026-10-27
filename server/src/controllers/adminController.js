import { TicketService } from '../services/ticketService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getStats = asyncHandler(async (_req, res) => {
  const stats = await TicketService.getAdminStats();
  res.status(200).json({ stats });
});
