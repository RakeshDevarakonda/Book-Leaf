import { ticketRepository } from '../repositories/ticketRepository';
import { bookRepository } from '../repositories/bookRepository';
import { queueService } from './queueService';
import { Ticket, TicketDetailResponse, TicketResponse } from '../types/ticket';
import { AppError } from './authService';
import { ERROR_CODES, HTTP_STATUS, ROLES, TicketCategoryType, TicketPriorityType, TicketStatusType } from '../config/constants';

export const ticketService = {
  async createTicket(data: {
    authorId: string;
    bookId?: string | null;
    subject: string;
    description: string;
    category?: TicketCategoryType;
    priority?: TicketPriorityType;
  }): Promise<Ticket> {
    // If a book is selected, verify that the logged-in author actually owns it
    if (data.bookId) {
      const book = await bookRepository.findById(data.bookId);
      if (!book) {
        throw new AppError('The selected book does not exist', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR);
      }
      if (book.author_id !== data.authorId) {
        throw new AppError('You can only raise tickets for books you own', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
      }
    }

    const ticket = await ticketRepository.createTicket(data);

    // Asynchronously dispatch job to AWS SQS queue for the Python AI worker (non-blocking)
    queueService.enqueueTicketAiJob(ticket.id).catch((err) => {
      console.error('[TicketService] Async queue dispatch failed:', err);
    });

    return ticket;
  },

  async getAuthorTickets(authorId: string): Promise<Ticket[]> {
    return ticketRepository.findByAuthorId(authorId);
  },

  async getTicketDetail(ticketId: string, userId: string, userRole: string): Promise<TicketDetailResponse> {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new AppError('Ticket not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    // Role-based access control: Authors can only view their own tickets
    if (userRole === ROLES.AUTHOR && ticket.author_id !== userId) {
      throw new AppError('You do not have permission to view this ticket', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
    }

    // Never show internal notes to authors!
    const includeInternal = userRole === ROLES.ADMIN;
    const responses = await ticketRepository.getResponses(ticketId, includeInternal);

    return { ticket, responses };
  },

  async getAdminTicketQueue(filters: {
    status?: TicketStatusType;
    category?: TicketCategoryType;
    priority?: TicketPriorityType;
    aiStatus?: string;
  }): Promise<Ticket[]> {
    return ticketRepository.findAllForAdmin(filters);
  },

  async updateTicketManagement(ticketId: string, updates: {
    status?: TicketStatusType;
    category?: TicketCategoryType;
    priority?: TicketPriorityType;
    assignedAdminId?: string | null;
    aiDraftResponse?: string | null;
  }): Promise<Ticket> {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new AppError('Ticket not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    const updated = await ticketRepository.updateTicket(ticketId, updates);
    return updated!;
  },

  async saveAiDraft(ticketId: string, draft: string): Promise<Ticket> {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new AppError('Ticket not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    const updated = await ticketRepository.updateTicket(ticketId, { aiDraftResponse: draft });
    return updated!;
  },

  async addResponse(data: {
    ticketId: string;
    senderId: string;
    senderRole: 'author' | 'admin';
    message: string;
    isInternal?: boolean;
  }): Promise<TicketResponse> {
    const ticket = await ticketRepository.findById(data.ticketId);
    if (!ticket) {
      throw new AppError('Ticket not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
    }

    // Authors can only respond to their own tickets, and cannot create internal notes
    if (data.senderRole === ROLES.AUTHOR) {
      if (ticket.author_id !== data.senderId) {
        throw new AppError('You do not have permission to reply to this ticket', HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
      }
      data.isInternal = false;
    }

    return ticketRepository.addResponse(data);
  }
};
