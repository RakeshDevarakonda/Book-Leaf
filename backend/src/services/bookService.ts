import { bookRepository } from '../repositories/bookRepository';
import { AuthorBooksResponse, Book } from '../types/book';
import { AppError } from './authService';
import { ERROR_CODES, HTTP_STATUS, ROLES } from '../config/constants';

export const bookService = {
  async getBooksForAuthor(authorId: string): Promise<AuthorBooksResponse> {
    const [books, summary] = await Promise.all([
      bookRepository.findByAuthorId(authorId),
      bookRepository.getRoyaltySummaryByAuthorId(authorId),
    ]);

    return { books, summary };
  },

  async getAllBooksForAdmin(): Promise<Book[]> {
    return bookRepository.findAll();
  },

  async getBookById(bookId: string, userId: string, userRole: string): Promise<Book> {
    const book = await bookRepository.findById(bookId);
    if (!book) {
      throw new AppError('Book not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    // Role-based access control: Authors can only view their own books
    if (userRole === ROLES.AUTHOR && book.author_id !== userId) {
      throw new AppError('You do not have permission to view this book', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }

    return book;
  }
};
