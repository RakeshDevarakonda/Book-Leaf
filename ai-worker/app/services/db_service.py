import psycopg2
from psycopg2.extras import RealDictCursor
from app import config

def get_db_connection():
    return psycopg2.connect(config.DATABASE_URL)

def get_ticket_context(ticket_id: str):
    """
    Loads authoritative ticket and book/author context from PostgreSQL.
    """
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT 
                    t.id as ticket_id,
                    t.subject,
                    t.description,
                    t.category,
                    t.priority,
                    t.category_source,
                    t.priority_source,
                    t.ai_status,
                    u.name as author_name,
                    u.email as author_email,
                    b.title as book_title,
                    b.isbn as book_isbn,
                    b.status as book_status,
                    b.mrp as book_mrp,
                    b.total_copies_sold,
                    b.total_royalty_earned,
                    b.royalty_paid,
                    b.royalty_pending
                FROM tickets t
                JOIN users u ON t.author_id = u.id
                LEFT JOIN books b ON t.book_id = b.id
                WHERE t.id = %s
                """,
                (ticket_id,)
            )
            return cur.fetchone()

def update_ticket_ai_results(ticket_id: str, category: str, priority: str, ai_draft_response: str, ai_status: str):
    """
    Safely writes AI suggestions back to PostgreSQL.
    Respects manual overrides by human admins!
    """
    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE tickets
                SET 
                    category = CASE WHEN category_source = 'manual' THEN category ELSE %s END,
                    category_source = CASE WHEN category_source = 'manual' THEN 'manual' ELSE 'ai' END,
                    priority = CASE WHEN priority_source = 'manual' THEN priority ELSE %s END,
                    priority_source = CASE WHEN priority_source = 'manual' THEN 'manual' ELSE 'ai' END,
                    ai_draft_response = %s,
                    ai_status = %s
                WHERE id = %s
                """,
                (category, priority, ai_draft_response, ai_status, ticket_id)
            )
        conn.commit()

def mark_ai_failed(ticket_id: str):
    """
    Marks ai_status as 'failed' gracefully without breaking the ticket.
    """
    try:
        with get_db_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("UPDATE tickets SET ai_status = 'failed' WHERE id = %s", (ticket_id,))
            conn.commit()
    except Exception as e:
        print(f"Failed to mark ticket {ticket_id} as failed: {e}")
