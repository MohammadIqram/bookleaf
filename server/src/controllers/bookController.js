import { BookService } from '../services/bookService.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getBooks = asyncHandler(async (req, res) => {
  const books = await BookService.getBooks(req.user, req.query);
  res.status(200).json({ books });
});

export const getBookById = asyncHandler(async (req, res) => {
  const book = await BookService.getBookById(req.params.id, req.user);
  res.status(200).json({ book });
});
