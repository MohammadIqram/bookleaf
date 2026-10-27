import prisma from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';
import { ROYALTY_PAYOUT_THRESHOLD_INR } from '../config/constants.js';

export class BookService {
  /**
   * Retrieves books filtered by user permissions
   *
   * @param {{ id: string, role: string, authorId?: string }} user
   * @param {{ authorId?: string }} query
   */
  static async getBooks(user, query = {}) {
    const where = {};

    if (user.role === 'AUTHOR') {
      if (!user.authorId) {
        throw AppError.unauthorized('No associated author profile found.', 'AUTHOR_PROFILE_MISSING');
      }
      where.authorId = user.authorId;
    } else if (user.role === 'ADMIN' && query.authorId) {
      where.authorId = query.authorId;
    }

    const books = await prisma.book.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            authorCode: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { title: 'asc' },
    });

    // Enhance books with calculation indicators (e.g. rollover notice)
    return books.map((book) => ({
      ...book,
      isBelowPayoutThreshold: book.royaltyPending > 0 && book.royaltyPending < ROYALTY_PAYOUT_THRESHOLD_INR,
      rolloverNotice:
        book.royaltyPending > 0 && book.royaltyPending < ROYALTY_PAYOUT_THRESHOLD_INR
          ? `Pending balance ₹${book.royaltyPending} is below minimum ₹${ROYALTY_PAYOUT_THRESHOLD_INR} threshold; rolls over to next quarter.`
          : null,
      isInProduction: !book.publicationDate || book.status.toLowerCase().includes('production'),
    }));
  }

  /**
   * Retrieves a single book by ID with RBAC enforcement
   *
   * @param {string} id - Book ID
   * @param {{ id: string, role: string, authorId?: string }} user
   */
  static async getBookById(id, user) {
    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            authorCode: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { tickets: true },
        },
      },
    });

    // Return 404 instead of 403 if unauthorized to avoid resource enumeration
    if (!book) {
      throw AppError.notFound('Book not found.', 'BOOK_NOT_FOUND');
    }

    if (user.role === 'AUTHOR' && book.authorId !== user.authorId) {
      throw AppError.notFound('Book not found.', 'BOOK_NOT_FOUND');
    }

    return {
      ...book,
      isBelowPayoutThreshold: book.royaltyPending > 0 && book.royaltyPending < ROYALTY_PAYOUT_THRESHOLD_INR,
      rolloverNotice:
        book.royaltyPending > 0 && book.royaltyPending < ROYALTY_PAYOUT_THRESHOLD_INR
          ? `Pending balance ₹${book.royaltyPending} is below minimum ₹${ROYALTY_PAYOUT_THRESHOLD_INR} threshold; rolls over to next quarter.`
          : null,
      isInProduction: !book.publicationDate || book.status.toLowerCase().includes('production'),
    };
  }
}

export default BookService;
