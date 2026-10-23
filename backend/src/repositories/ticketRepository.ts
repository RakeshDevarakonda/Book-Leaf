import { query } from '../config/db';
import { Ticket, TicketResponse } from '../types/ticket';
import { TicketCategoryType, TicketPriorityType, TicketStatusType } from '../config/constants';

function parseTicketRow(row: any): Ticket {
  return {
    id: row.id,
    author_id: row.author_id,
    book_id: row.book_id,
    subject: row.subject,
    description: row.description,
    status: row.status,
    category: row.category,
    priority: row.priority,
    assigned_admin_id: row.assigned_admin_id,
    category_source: row.category_source,
    priority_source: row.priority_source,
    ai_draft_response: row.ai_draft_response || null,
    ai_status: row.ai_status || 'pending',
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
    author_name: row.author_name,
    author_email: row.author_email,
    book_title: row.book_title,
    assigned_admin_name: row.assigned_admin_name,
  };
}

function parseResponseRow(row: any): TicketResponse {
  return {
    id: row.id,
    ticket_id: row.ticket_id,
    sender_id: row.sender_id,
    sender_role: row.sender_role,
    sender_name: row.sender_name,
    message: row.message,
    is_internal: row.is_internal,
    created_at: Number(row.created_at),
  };
}

export const ticketRepository = {
  async createTicket(data: {
    authorId: string;
    bookId?: string | null;
    subject: string;
    description: string;
    category?: TicketCategoryType;
    priority?: TicketPriorityType;
  }): Promise<Ticket> {
    const now = Math.floor(Date.now() / 1000);
    const category = data.category || 'General Inquiry';
    const priority = data.priority || 'Medium';

    const res = await query(
      `INSERT INTO tickets (
        author_id, book_id, subject, description, status, category, priority,
        ai_status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, 'Open', $5, $6, 'pending', $7, $8)
      RETURNING *`,
      [data.authorId, data.bookId || null, data.subject, data.description, category, priority, now, now]
    );

    return parseTicketRow(res.rows[0]);
  },

  async findByAuthorId(authorId: string): Promise<Ticket[]> {
    const res = await query(
      `SELECT t.*, b.title as book_title
       FROM tickets t
       LEFT JOIN books b ON t.book_id = b.id
       WHERE t.author_id = $1
       ORDER BY t.created_at DESC`,
      [authorId]
    );
    return res.rows.map(parseTicketRow);
  },

  async findById(ticketId: string): Promise<Ticket | null> {
    const res = await query(
      `SELECT t.*, 
              u.name as author_name, 
              u.email as author_email,
              b.title as book_title,
              admin.name as assigned_admin_name
       FROM tickets t
       JOIN users u ON t.author_id = u.id
       LEFT JOIN books b ON t.book_id = b.id
       LEFT JOIN users admin ON t.assigned_admin_id = admin.id
       WHERE t.id = $1`,
      [ticketId]
    );
    if (!res.rows[0]) return null;
    return parseTicketRow(res.rows[0]);
  },

  async findAllForAdmin(filters: {
    status?: TicketStatusType;
    category?: TicketCategoryType;
    priority?: TicketPriorityType;
    aiStatus?: string;
  }): Promise<Ticket[]> {
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters.status) {
      params.push(filters.status);
      conditions.push(`t.status = $${params.length}`);
    }
    if (filters.category) {
      params.push(filters.category);
      conditions.push(`t.category = $${params.length}`);
    }
    if (filters.priority) {
      params.push(filters.priority);
      conditions.push(`t.priority = $${params.length}`);
    }
    if (filters.aiStatus) {
      params.push(filters.aiStatus);
      conditions.push(`t.ai_status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sort by priority urgency (Critical -> High -> Medium -> Low) then oldest unresolved
    const res = await query(
      `SELECT t.*, 
              u.name as author_name, 
              u.email as author_email,
              b.title as book_title,
              admin.name as assigned_admin_name
       FROM tickets t
       JOIN users u ON t.author_id = u.id
       LEFT JOIN books b ON t.book_id = b.id
       LEFT JOIN users admin ON t.assigned_admin_id = admin.id
       ${whereClause}
       ORDER BY 
         CASE t.priority 
           WHEN 'Critical' THEN 1 
           WHEN 'High' THEN 2 
           WHEN 'Medium' THEN 3 
           WHEN 'Low' THEN 4 
           ELSE 5 
         END ASC,
         t.created_at ASC`,
      params
    );

    return res.rows.map(parseTicketRow);
  },

  async updateTicket(ticketId: string, updates: {
    status?: TicketStatusType;
    category?: TicketCategoryType;
    priority?: TicketPriorityType;
    assignedAdminId?: string | null;
    aiDraftResponse?: string | null;
  }): Promise<Ticket | null> {
    const fields: string[] = [];
    const params: any[] = [];

    if (updates.status !== undefined) {
      params.push(updates.status);
      fields.push(`status = $${params.length}`);
    }
    if (updates.category !== undefined) {
      params.push(updates.category);
      fields.push(`category = $${params.length}`);
      fields.push(`category_source = 'manual'`);
    }
    if (updates.priority !== undefined) {
      params.push(updates.priority);
      fields.push(`priority = $${params.length}`);
      fields.push(`priority_source = 'manual'`);
    }
    if (updates.assignedAdminId !== undefined) {
      params.push(updates.assignedAdminId);
      fields.push(`assigned_admin_id = $${params.length}`);
    }
    if (updates.aiDraftResponse !== undefined) {
      params.push(updates.aiDraftResponse);
      fields.push(`ai_draft_response = $${params.length}`);
    }

    if (fields.length === 0) {
      return this.findById(ticketId);
    }

    const now = Math.floor(Date.now() / 1000);
    params.push(now);
    fields.push(`updated_at = $${params.length}`);

    params.push(ticketId);
    const sql = `UPDATE tickets SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`;

    const res = await query(sql, params);
    if (!res.rows[0]) return null;
    return this.findById(ticketId);
  },

  // Called by AI worker in Phase 5
  async updateAiSuggestions(ticketId: string, suggestions: {
    category?: TicketCategoryType;
    priority?: TicketPriorityType;
    aiDraftResponse?: string;
    aiStatus: 'completed' | 'failed';
  }): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    await query(
      `UPDATE tickets 
       SET 
         category = CASE WHEN category_source = 'manual' THEN category ELSE COALESCE($1, category) END,
         category_source = CASE WHEN category_source = 'manual' THEN 'manual' ELSE 'ai' END,
         priority = CASE WHEN priority_source = 'manual' THEN priority ELSE COALESCE($2, priority) END,
         priority_source = CASE WHEN priority_source = 'manual' THEN 'manual' ELSE 'ai' END,
         ai_draft_response = COALESCE($3, ai_draft_response),
         ai_status = $4,
         updated_at = $5
       WHERE id = $6`,
      [
        suggestions.category || null,
        suggestions.priority || null,
        suggestions.aiDraftResponse || null,
        suggestions.aiStatus,
        now,
        ticketId
      ]
    );
  },

  // --- Ticket Responses & Notes ---

  async addResponse(data: {
    ticketId: string;
    senderId: string;
    senderRole: 'author' | 'admin';
    message: string;
    isInternal?: boolean;
  }): Promise<TicketResponse> {
    const now = Math.floor(Date.now() / 1000);
    const isInternal = data.isInternal === true;

    const res = await query(
      `INSERT INTO ticket_responses (ticket_id, sender_id, sender_role, message, is_internal, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.ticketId, data.senderId, data.senderRole, data.message, isInternal, now]
    );

    // Touch ticket's updated_at
    await query(`UPDATE tickets SET updated_at = $1 WHERE id = $2`, [now, data.ticketId]);

    const createdRow = res.rows[0];
    const userRes = await query(`SELECT name FROM users WHERE id = $1`, [data.senderId]);
    return {
      ...parseResponseRow(createdRow),
      sender_name: userRes.rows[0]?.name || 'Unknown',
    };
  },

  async getResponses(ticketId: string, includeInternal: boolean): Promise<TicketResponse[]> {
    const internalFilter = includeInternal ? '' : 'AND r.is_internal = FALSE';

    const res = await query(
      `SELECT r.*, u.name as sender_name
       FROM ticket_responses r
       JOIN users u ON r.sender_id = u.id
       WHERE r.ticket_id = $1 ${internalFilter}
       ORDER BY r.created_at ASC`,
      [ticketId]
    );

    return res.rows.map(parseResponseRow);
  }
};
