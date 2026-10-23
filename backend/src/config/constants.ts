export const ROLES = {
  AUTHOR: 'author',
  ADMIN: 'admin',
} as const;

export type UserRoleType = typeof ROLES[keyof typeof ROLES];

export const TOKEN_EXPIRY = {
  ACCESS_TOKEN_JWT: '15m',
  REFRESH_TOKEN_JWT: '7d',
  ACCESS_TOKEN_SECONDS: 15 * 60,              // 15 minutes in epoch seconds (900s)
  REFRESH_TOKEN_SECONDS: 7 * 24 * 60 * 60,    // 7 days in epoch seconds (604,800s)
} as const;

export const COOKIE_NAMES = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
} as const;

export const COOKIE_PATHS = {
  REFRESH_TOKEN: '/api/auth/refresh',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  REFRESH_TOKEN_REQUIRED: 'REFRESH_TOKEN_REQUIRED',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  REVOKED_REFRESH_TOKEN: 'REVOKED_REFRESH_TOKEN',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
} as const;

export const TICKET_CATEGORIES = [
  'Royalty & Payments',
  'ISBN & Metadata Issues',
  'Printing & Quality',
  'Distribution & Availability',
  'Book Status & Production Updates',
  'General Inquiry',
] as const;

export type TicketCategoryType = typeof TICKET_CATEGORIES[number];

export const TICKET_PRIORITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
export type TicketPriorityType = typeof TICKET_PRIORITIES[number];

export const TICKET_STATUSES = ['Open', 'In Progress', 'Resolved', 'Closed'] as const;
export type TicketStatusType = typeof TICKET_STATUSES[number];

export const BOOK_STATUSES = [
  'Published & Live',
  'In Production - Cover Design',
  'In Production - Typesetting',
] as const;
export type BookStatusType = typeof BOOK_STATUSES[number];
