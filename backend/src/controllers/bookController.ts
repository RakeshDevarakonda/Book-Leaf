import { Request, Response, NextFunction } from 'express';
import { bookService } from '../services/bookService';
import { HTTP_STATUS, ROLES } from '../config/constants';

export const bookController = {
  async getMyBooks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;

      // If author, return their books with royalty summary
      if (user.role === ROLES.AUTHOR) {
        const result = await bookService.getBooksForAuthor(user.id);
        res.status(HTTP_STATUS.OK).json({
          success: true,
          data: result,
        });
        return;
      }

      // If admin and authorId query is provided: filter by author, otherwise return all books
      const authorIdQuery = req.query.authorId as string | undefined;
      if (authorIdQuery) {
        const result = await bookService.getBooksForAuthor(authorIdQuery);
        res.status(HTTP_STATUS.OK).json({
          success: true,
          data: result,
        });
        return;
      }

      const allBooks = await bookService.getAllBooksForAdmin();
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { books: allBooks },
      });
    } catch (err) {
      next(err);
    }
  },

  async getBookById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const bookId = req.params.id;
      const book = await bookService.getBookById(bookId, user.id, user.role);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { book },
      });
    } catch (err) {
      next(err);
    }
  }
};
