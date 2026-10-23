import { Router } from 'express';
import { ticketController } from '../controllers/ticketController';
import { authenticate } from '../middleware/authMiddleware';
import { validateSession } from '../middleware/sessionMiddleware';
import { requireRole } from '../middleware/authMiddleware';
import { ROLES } from '../config/constants';
import {
  addResponseValidation,
  createTicketValidation,
  getTicketByIdParamValidation,
} from '../validators/ticketValidators';

const router = Router();

// Protect author routes: require authentication, active session, and AUTHOR role
router.use(authenticate, validateSession, requireRole(ROLES.AUTHOR));

// POST /api/tickets -> Author submit a new support query
router.post('/', createTicketValidation, ticketController.createTicket);

// GET /api/tickets -> Author view their submitted tickets
router.get('/', ticketController.getMyTickets);

// GET /api/tickets/:id -> Author view ticket conversation (only public messages)
router.get('/:id', getTicketByIdParamValidation, ticketController.getTicketDetail);

export default router;
