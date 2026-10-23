import { Request, Response, NextFunction } from 'express';
import { ticketService } from '../services/ticketService';
import { HTTP_STATUS } from '../config/constants';

export const ticketController = {
  // Author: Create ticket
  async createTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authorId = req.user!.id;
      const { bookId, subject, description } = req.body;

      const ticket = await ticketService.createTicket({
        authorId,
        bookId: bookId || null,
        subject,
        description,
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: { ticket },
      });
    } catch (err) {
      next(err);
    }
  },

  // Author: Get my tickets
  async getMyTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authorId = req.user!.id;
      const tickets = await ticketService.getAuthorTickets(authorId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { tickets },
      });
    } catch (err) {
      next(err);
    }
  },

  // Author & Admin: Get ticket details and conversation
  async getTicketDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketId = req.params.id;
      const result = await ticketService.getTicketDetail(ticketId, req.user!.id, req.user!.role);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  },

  // Author & Admin: Reply to ticket
  async addResponse(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketId = req.params.id;
      const { message, is_internal } = req.body;

      const response = await ticketService.addResponse({
        ticketId,
        senderId: req.user!.id,
        senderRole: req.user!.role,
        message,
        isInternal: is_internal,
      });

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: { response },
      });
    } catch (err) {
      next(err);
    }
  },

  // Admin: Get all tickets with filtering and priority sort
  async getAdminTicketQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, category, priority } = req.query as any;
      const tickets = await ticketService.getAdminTicketQueue({ status, category, priority });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { tickets },
      });
    } catch (err) {
      next(err);
    }
  },

  // Admin: Update ticket management (status, category, priority, assignment)
  async updateTicketManagement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketId = req.params.id;
      const { status, category, priority, assignedAdminId, aiDraftResponse } = req.body;

      const ticket = await ticketService.updateTicketManagement(ticketId, {
        status,
        category,
        priority,
        assignedAdminId,
        aiDraftResponse,
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { ticket },
      });
    } catch (err) {
      next(err);
    }
  },

  // Admin: Save or update edited AI draft response before sending
  async saveAiDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ticketId = req.params.id;
      const { draft } = req.body;

      const ticket = await ticketService.saveAiDraft(ticketId, draft);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { ticket },
      });
    } catch (err) {
      next(err);
    }
  }
};
