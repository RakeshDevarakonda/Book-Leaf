import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';
import { validateSession } from '../middleware/sessionMiddleware';
import { validate } from '../middleware/validateMiddleware';
import { loginSchema, signupSchema } from '../validators/authValidators';

const router = Router();

router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refresh);
router.get('/me', authenticate, validateSession, authController.me);
router.post('/logout', authenticate, validateSession, authController.logout);

export default router;
