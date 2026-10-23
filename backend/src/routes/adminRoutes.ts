import { Router } from 'express';
import { ticketController } from '../controllers/ticketController';
import { authenticate } from '../middleware/authMiddleware';
import { validateSession } from '../middleware/sessionMiddleware';
import { requireRole } from '../middleware/authMiddleware';
import { ROLES } from '../config/constants';
import {
  addResponseValidation,
  adminFilterTicketsValidation,
  getTicketByIdParamValidation,
  updateTicketManagementValidation,
} from '../validators/ticketValidators';

const router = Router();

// Protect ALL admin routes: require authentication, active session, and ADMIN role
router.use(authenticate, validateSession, requireRole(ROLES.ADMIN));

// GET /api/admin/tickets -> Admin ticket queue (filterable by status, category, priority, sorted by urgency)
router.get('/tickets', adminFilterTicketsValidation, ticketController.getAdminTicketQueue);

// GET /api/admin/tickets/:id -> Admin full ticket view (including private internal notes & AI draft)
router.get('/tickets/:id', getTicketByIdParamValidation, ticketController.getTicketDetail);

// PATCH /api/admin/tickets/:id -> Admin update ticket status, category, priority, or assign admin
router.patch('/tickets/:id', updateTicketManagementValidation, ticketController.updateTicketManagement);

// POST /api/admin/tickets/:id/responses -> Admin send public reply or save private internal note
router.post('/tickets/:id/responses', addResponseValidation, ticketController.addResponse);

export default router;
