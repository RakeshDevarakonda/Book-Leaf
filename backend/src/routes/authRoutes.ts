import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';
import { validateSession } from '../middleware/sessionMiddleware';
import { loginValidation, signupValidation } from '../validators/authValidators';

const router = Router();

router.post('/signup', signupValidation, authController.signup);
router.post('/login', loginValidation, authController.login);
router.post('/refresh', authController.refresh);
router.get('/me', authenticate, validateSession, authController.me);
router.post('/logout', authenticate, validateSession, authController.logout);

export default router;
