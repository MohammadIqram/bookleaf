import { z } from 'zod';
import {
  TICKET_CATEGORIES,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '../config/constants.js';

export const createTicketSchema = z.object({
  subject: z
    .string({ required_error: 'Subject is required' })
    .trim()
    .min(5, 'Subject must be at least 5 characters')
    .max(150, 'Subject cannot exceed 150 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(20, 'Description must be at least 20 characters')
    .max(5000, 'Description cannot exceed 5000 characters'),
  bookId: z
    .string()
    .uuid('Invalid book ID format')
    .nullable()
    .optional(),
  attachmentNames: z
    .array(z.string().min(1).max(255))
    .optional()
    .default([]),
});

export const addMessageSchema = z.object({
  body: z
    .string({ required_error: 'Message body is required' })
    .trim()
    .min(2, 'Message must be at least 2 characters')
    .max(5000, 'Message cannot exceed 5000 characters'),
  isAiDraftBased: z.boolean().optional().default(false),
});

export const addNoteSchema = z.object({
  body: z
    .string({ required_error: 'Internal note body is required' })
    .trim()
    .min(2, 'Internal note must be at least 2 characters')
    .max(5000, 'Internal note cannot exceed 5000 characters'),
});

export const patchTicketSchema = z.object({
  status: z
    .enum(TICKET_STATUSES, {
      errorMap: () => ({ message: `Status must be one of: ${TICKET_STATUSES.join(', ')}` }),
    })
    .optional(),
  category: z
    .enum(TICKET_CATEGORIES, {
      errorMap: () => ({ message: `Category must be one of: ${TICKET_CATEGORIES.join(', ')}` }),
    })
    .optional(),
  priority: z
    .enum(TICKET_PRIORITIES, {
      errorMap: () => ({ message: `Priority must be one of: ${TICKET_PRIORITIES.join(', ')}` }),
    })
    .optional(),
  assignedAdminId: z
    .string()
    .uuid('Invalid admin user ID')
    .nullable()
    .optional(),
});

export const ticketQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(TICKET_STATUSES).optional(),
  category: z.enum(TICKET_CATEGORIES).optional(),
  priority: z.enum(TICKET_PRIORITIES).optional(),
  search: z.string().trim().optional(),
  assignedTo: z.enum(['me', 'unassigned']).optional(),
  authorId: z.string().uuid().optional(),
  sortBy: z.enum(['priority', 'createdAt', 'updatedAt']).default('priority'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
