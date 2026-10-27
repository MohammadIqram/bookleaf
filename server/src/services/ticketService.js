import prisma from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import sseService from './sseService.js';
import logger from '../utils/logger.js';

export class TicketService {
  /**
   * Generates next sequential human-readable ticket number (e.g. BL-0009)
   */
  static async generateTicketNumber() {
    const count = await prisma.ticket.count();
    const nextNumber = count + 1;
    return `BL-${String(nextNumber).padStart(4, '0')}`;
  }

  /**
   * Creates a new support ticket submitted by an author
   * Returns immediately (201) while AI runs asynchronously.
   *
   * @param {{ authorId: string, userId: string, data: { subject: string, description: string, bookId?: string, attachmentNames?: string[] } }} param0
   */
  static async createTicket({ authorId, userId, data }) {
    const { subject, description, bookId, attachmentNames = [] } = data;

    // Validate that book belongs to author if bookId is provided
    if (bookId) {
      const book = await prisma.book.findUnique({ where: { id: bookId } });
      if (!book || book.authorId !== authorId) {
        throw AppError.badRequest('Selected book does not belong to this author account.', 'INVALID_BOOK_SELECTION');
      }
    }

    const ticketNumber = await this.generateTicketNumber();

    const ticket = await prisma.ticket.create({
      data: {
        ticketNumber,
        authorId,
        bookId: bookId || null,
        subject,
        description,
        status: 'OPEN',
        priority: 'MEDIUM',
        prioritySource: 'RULES',
        aiClassificationStatus: 'PENDING',
        attachmentNames,
        messages: {
          create: {
            senderType: 'AUTHOR',
            senderId: userId,
            body: description,
          },
        },
      },
      include: {
        book: {
          select: { id: true, title: true, isbn: true, status: true },
        },
        author: {
          select: {
            id: true,
            authorCode: true,
            name: true,
            user: { select: { email: true } },
          },
        },
        messages: true,
      },
    });

    // Notify connected SSE clients immediately
    sseService.notifyTicketCreated(ticket);

    // Asynchronously trigger AI classification & priority scoring (non-blocking)
    setImmediate(async () => {
      try {
        // Dynamic import to avoid circular dependencies and decouple AI processing
        const { aiService } = await import('./aiService.js');
        if (aiService && typeof aiService.classifyAndPrioritizeTicket === 'function') {
          await aiService.classifyAndPrioritizeTicket(ticket.id);
        }
      } catch (err) {
        logger.warn(`[AI Hook] Asynchronous AI classification failed for ${ticket.ticketNumber}: ${err.message}`);
      }
    });

    return ticket;
  }

  /**
   * Retrieves tickets based on user role and query filters
   */
  static async getTickets(user, filters = {}) {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      priority,
      search,
      assignedTo,
      authorId,
    } = filters;

    const skip = (page - 1) * limit;
    const where = {};

    // 1. RBAC Scope
    if (user.role === 'AUTHOR') {
      if (!user.authorId) {
        throw AppError.unauthorized('No author profile linked to this user.', 'AUTHOR_PROFILE_MISSING');
      }
      where.authorId = user.authorId;
    } else {
      // Admin filters
      if (authorId) where.authorId = authorId;
      if (assignedTo === 'me') where.assignedAdminId = user.id;
      if (assignedTo === 'unassigned') where.assignedAdminId = null;
    }

    // 2. Query filters
    if (status) where.status = status;
    if (category) where.category = category;
    if (priority) where.priority = priority;

    // 3. Search query
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { subject: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { author: { name: { contains: q, mode: 'insensitive' } } },
        { book: { title: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const isAuthor = user.role === 'AUTHOR';
    const sortBy = filters.sortBy || (isAuthor ? 'createdAt' : 'priority');
    const sortOrder = filters.sortOrder || (isAuthor ? 'desc' : 'asc');

    // 4. Default Sort: Authors see newest first; Admins see priority (Critical first) then oldest created first
    let orderBy = [];
    if (sortBy === 'priority' && !isAuthor) {
      orderBy = [{ createdAt: 'asc' }];
    } else {
      orderBy = [{ [sortBy]: sortOrder }];
    }

    const [totalCount, rawTickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          book: {
            select: { id: true, title: true, isbn: true, status: true },
          },
          author: {
            select: {
              id: true,
              authorCode: true,
              name: true,
              user: { select: { email: true } },
            },
          },
          assignedAdmin: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              messages: true,
              internalNotes: user.role === 'ADMIN' ? true : false,
            },
          },
        },
      }),
    ]);

    // Priority rank mapping for client sorting
    const priorityWeight = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

    // Sort by priority weight if requested (Admin queue)
    let sortedTickets = rawTickets;
    if (sortBy === 'priority' && !isAuthor) {
      sortedTickets = [...rawTickets].sort((a, b) => {
        const weightDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
        if (weightDiff !== 0) return weightDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    }

    const now = Date.now();

    // Sanitize and decorate with SLA / age calculation
    const tickets = sortedTickets.map((t) => {
      const ageHours = Math.floor((now - new Date(t.createdAt).getTime()) / (1000 * 60 * 60));
      const ageDays = Math.floor(ageHours / 24);
      const isUrgent = (t.priority === 'CRITICAL' || t.priority === 'HIGH') && t.status !== 'RESOLVED' && t.status !== 'CLOSED';
      const isOld = ageDays >= 3 && t.status !== 'RESOLVED' && t.status !== 'CLOSED';

      if (user.role === 'AUTHOR') {
        // Strip admin-only fields for author responses
        const { aiReasoning, assignedAdminId, assignedAdmin, ...safeTicket } = t;
        return {
          ...safeTicket,
          ageHours,
          ageDays,
          isUrgent,
          isOld,
        };
      }

      const formattedAuthor = t.author
        ? {
            ...t.author,
            email: t.author.user?.email || t.author.email || null,
          }
        : null;

      return {
        ...t,
        author: formattedAuthor,
        ageHours,
        ageDays,
        isUrgent,
        isOld,
      };
    });

    return {
      tickets,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }

  /**
   * Retrieves single ticket details with thread and permissions enforcement
   *
   * @param {string} id
   * @param {{ id: string, role: string, authorId?: string }} user
   */
  static async getTicketById(id, user) {
    const isAuthor = user.role === 'AUTHOR';

    const ticket = await prisma.ticket.findUnique({
      where: { id },
      include: {
        book: {
          select: {
            id: true,
            bookCode: true,
            title: true,
            isbn: true,
            status: true,
            genre: true,
            mrp: true,
            royaltyPerCopy: true,
            totalCopiesSold: true,
            totalRoyaltyEarned: true,
            royaltyPaid: true,
            royaltyPending: true,
            lastPayoutDate: true,
            availableOn: true,
          },
        },
        author: {
          select: {
            id: true,
            authorCode: true,
            name: true,
            phone: true,
            city: true,
            joinedDate: true,
            user: { select: { email: true } },
          },
        },
        assignedAdmin: {
          select: { id: true, name: true, email: true },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: { id: true, name: true, role: true },
            },
          },
        },
        // Only include internal notes and AI drafts for admins
        internalNotes: isAuthor
          ? false
          : {
              orderBy: { createdAt: 'asc' },
              include: {
                admin: { select: { id: true, name: true, email: true } },
              },
            },
        aiDrafts: isAuthor
          ? false
          : {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
      },
    });

    if (!ticket) {
      throw AppError.notFound('Support ticket not found.', 'TICKET_NOT_FOUND');
    }

    // RBAC: Authors can only view their own tickets (return 404 to avoid enumeration)
    if (isAuthor && ticket.authorId !== user.authorId) {
      throw AppError.notFound('Support ticket not found.', 'TICKET_NOT_FOUND');
    }

    if (isAuthor) {
      // Strip internal metadata
      const { aiReasoning, assignedAdminId, assignedAdmin, ...safeTicket } = ticket;
      return safeTicket;
    }

    return ticket;
  }

  /**
   * Adds a message to a ticket thread (Author follow-up or Admin reply)
   */
  static async addMessage({ ticketId, user, body, isAiDraftBased = false }) {
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: { author: true },
    });

    if (!ticket) {
      throw AppError.notFound('Support ticket not found.', 'TICKET_NOT_FOUND');
    }

    // RBAC check for authors
    if (user.role === 'AUTHOR') {
      if (ticket.authorId !== user.authorId) {
        throw AppError.notFound('Support ticket not found.', 'TICKET_NOT_FOUND');
      }

      // Authors cannot reply to CLOSED tickets
      if (ticket.status === 'CLOSED') {
        throw AppError.badRequest(
          'This ticket is closed. Please submit a new ticket for further assistance.',
          'TICKET_CLOSED'
        );
      }
    }

    const message = await prisma.ticketMessage.create({
      data: {
        ticketId,
        senderType: user.role === 'ADMIN' ? 'ADMIN' : 'AUTHOR',
        senderId: user.id,
        body,
        isAiDraftBased,
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true },
        },
      },
    });

    // Update ticket updatedAt and optionally re-open if author replied to a resolved ticket
    const updateData = { updatedAt: new Date() };
    if (user.role === 'AUTHOR' && ticket.status === 'RESOLVED') {
      updateData.status = 'IN_PROGRESS';
    }

    const updatedTicket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // Real-time broadcast
    sseService.notifyNewMessage(message, updatedTicket);

    return message;
  }

  /**
   * Admin: Updates ticket status, category, priority, or assignee
   */
  static async patchTicket({ ticketId, updates }) {
    const existing = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!existing) {
      throw AppError.notFound('Support ticket not found.', 'TICKET_NOT_FOUND');
    }

    const updateData = {};

    if (updates.status) {
      updateData.status = updates.status;
      if (updates.status === 'RESOLVED' || updates.status === 'CLOSED') {
        updateData.resolvedAt = new Date();
      } else {
        updateData.resolvedAt = null;
      }
    }

    if (updates.category) {
      updateData.category = updates.category;
      updateData.categorySource = 'ADMIN'; // Record admin override
    }

    if (updates.priority) {
      updateData.priority = updates.priority;
      updateData.prioritySource = 'ADMIN'; // Record admin override
    }

    if (updates.assignedAdminId !== undefined) {
      updateData.assignedAdminId = updates.assignedAdminId;
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
      include: {
        assignedAdmin: { select: { id: true, name: true, email: true } },
        book: { select: { id: true, title: true } },
      },
    });

    sseService.notifyTicketUpdated(updated);

    return updated;
  }

  /**
   * Admin: Assign ticket to self or unassign
   */
  static async assignTicket({ ticketId, adminId, unassign = false }) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw AppError.notFound('Support ticket not found.', 'TICKET_NOT_FOUND');
    }

    const updated = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedAdminId: unassign ? null : adminId,
      },
      include: {
        assignedAdmin: { select: { id: true, name: true, email: true } },
      },
    });

    sseService.notifyTicketUpdated(updated);

    return updated;
  }

  /**
   * Admin: Add internal note (never returned to author)
   */
  static async addInternalNote({ ticketId, adminId, body }) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw AppError.notFound('Support ticket not found.', 'TICKET_NOT_FOUND');
    }

    const note = await prisma.internalNote.create({
      data: {
        ticketId,
        adminId,
        body,
      },
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
    });

    return note;
  }

  /**
   * Admin: Get internal notes
   */
  static async getInternalNotes(ticketId) {
    const notes = await prisma.internalNote.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
      include: {
        admin: { select: { id: true, name: true, email: true } },
      },
    });

    return notes;
  }

  /**
   * Admin Dashboard Metrics: Counts, urgent tickets, average age, and AI cost estimate
   */
  static async getAdminStats() {
    const [openCount, inProgressCount, criticalCount, unassignedCount, openTickets, aiUsage] = await Promise.all([
      prisma.ticket.count({ where: { status: 'OPEN' } }),
      prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.ticket.count({
        where: {
          priority: 'CRITICAL',
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
      prisma.ticket.count({
        where: {
          assignedAdminId: null,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      }),
      prisma.ticket.findMany({
        where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
        select: { createdAt: true },
      }),
      prisma.aiUsageLog.aggregate({
        _sum: { tokensIn: true, tokensOut: true },
        _count: { id: true },
      }),
    ]);

    const now = Date.now();
    let totalAgeHours = 0;
    for (const t of openTickets) {
      totalAgeHours += (now - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
    }
    const avgAgeHours = openTickets.length ? Math.round((totalAgeHours / openTickets.length) * 10) / 10 : 0;
    const avgAgeDays = Math.round((avgAgeHours / 24) * 10) / 10;

    // Rough estimated AI cost: Claude Haiku (~$0.25/MTok in, $1.25/MTok out)
    const tokensIn = aiUsage._sum.tokensIn || 0;
    const tokensOut = aiUsage._sum.tokensOut || 0;
    const estimatedCostUsd = (tokensIn * 0.00000025 + tokensOut * 0.00000125).toFixed(4);

    return {
      openCount,
      inProgressCount,
      totalActiveCount: openCount + inProgressCount,
      criticalCount,
      unassignedCount,
      avgAgeHours,
      avgAgeDays,
      aiMetrics: {
        totalCalls: aiUsage._count.id || 0,
        tokensIn,
        tokensOut,
        estimatedCostUsd: Number(estimatedCostUsd),
      },
    };
  }
}

export default TicketService;
