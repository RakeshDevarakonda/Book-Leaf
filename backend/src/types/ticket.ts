import { TicketCategoryType, TicketPriorityType, TicketStatusType } from '../config/constants';

export interface Ticket {
  id: string;
  author_id: string;
  book_id?: string | null;
  subject: string;
  description: string;
  status: TicketStatusType;
  category: TicketCategoryType;
  priority: TicketPriorityType;
  assigned_admin_id?: string | null;
  category_source: 'manual' | 'ai';
  priority_source: 'manual' | 'ai';
  ai_draft_response?: string | null;
  draft_edited_by_admin: boolean;
  ai_status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: number; // epoch seconds
  updated_at: number; // epoch seconds
  // Joins
  author_name?: string;
  author_email?: string;
  book_title?: string;
  assigned_admin_name?: string;
}

export interface TicketResponse {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: 'author' | 'admin';
  sender_name?: string;
  message: string;
  is_internal: boolean;
  created_at: number; // epoch seconds
}

export interface TicketDetailResponse {
  ticket: Ticket;
  responses: TicketResponse[];
}
