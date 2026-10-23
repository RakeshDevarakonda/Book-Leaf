import { Router } from 'express';
import { bookController } from '../controllers/bookController';
import { authenticate } from '../middleware/authMiddleware';
import { validateSession } from '../middleware/sessionMiddleware';
import { getBookByIdValidation, getBooksQueryValidation } from '../validators/bookValidators';

const router = Router();

// Protect all book routes with JWT authentication and session validation
router.use(authenticate, validateSession);

// GET /api/books (Author gets their books + royalty summary; Admin gets all or by ?authorId=...)
router.get('/', getBooksQueryValidation, bookController.getMyBooks);

// GET /api/books/:id (Author can only access their owned book; Admin can access any)
router.get('/:id', getBookByIdValidation, bookController.getBookById);

export default router;
