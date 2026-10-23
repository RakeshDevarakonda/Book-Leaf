import { celebrate, Joi, Segments } from 'celebrate';
import { TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES } from '../config/constants';

export const createTicketValidation = celebrate({
  [Segments.BODY]: Joi.object({
    bookId: Joi.string().trim().allow(null, '').optional(),
    subject: Joi.string().trim().min(3).max(255).required().messages({
      'string.min': 'Subject must be at least 3 characters',
      'any.required': 'Subject is required',
      'string.empty': 'Subject cannot be empty',
    }),
    description: Joi.string().trim().min(5).required().messages({
      'string.min': 'Description must be at least 5 characters',
      'any.required': 'Description is required',
      'string.empty': 'Description cannot be empty',
    }),
  }),
});

export const getTicketByIdParamValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().trim().required().messages({
      'any.required': 'Ticket ID is required',
      'string.empty': 'Ticket ID cannot be empty',
    }),
  }),
});

export const adminFilterTicketsValidation = celebrate({
  [Segments.QUERY]: Joi.object({
    status: Joi.string().valid(...TICKET_STATUSES).optional(),
    category: Joi.string().valid(...TICKET_CATEGORIES).optional(),
    priority: Joi.string().valid(...TICKET_PRIORITIES).optional(),
    aiStatus: Joi.string().valid('pending', 'processing', 'completed', 'failed').optional(),
  }),
});

export const updateTicketManagementValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().trim().required(),
  }),
  [Segments.BODY]: Joi.object({
    status: Joi.string().valid(...TICKET_STATUSES).optional(),
    category: Joi.string().valid(...TICKET_CATEGORIES).optional(),
    priority: Joi.string().valid(...TICKET_PRIORITIES).optional(),
    assignedAdminId: Joi.string().trim().allow(null, '').optional(),
    aiDraftResponse: Joi.string().trim().allow(null, '').optional(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided to update',
  }),
});

export const updateAiDraftValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().trim().required(),
  }),
  [Segments.BODY]: Joi.object({
    draft: Joi.string().trim().required().messages({
      'any.required': 'AI draft response text is required',
      'string.empty': 'AI draft response text cannot be empty',
    }),
  }),
});

export const addResponseValidation = celebrate({
  [Segments.PARAMS]: Joi.object({
    id: Joi.string().trim().required(),
  }),
  [Segments.BODY]: Joi.object({
    message: Joi.string().trim().min(1).required().messages({
      'any.required': 'Message is required',
      'string.empty': 'Message cannot be empty',
    }),
    is_internal: Joi.boolean().default(false),
  }),
});
