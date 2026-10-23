-- Schema for Tickets and Ticket Responses / Internal Notes

-- Tickets
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    author_id VARCHAR(50) NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    book_id VARCHAR(50)
        REFERENCES books(id) ON DELETE SET NULL,

    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'Open'
        CHECK (status IN (
            'Open', 'In Progress', 'Resolved', 'Closed'
        )),

    category VARCHAR(100) NOT NULL DEFAULT 'General Inquiry'
        CHECK (category IN (
            'Royalty & Payments',
            'ISBN & Metadata Issues',
            'Printing & Quality',
            'Distribution & Availability',
            'Book Status & Production Updates',
            'General Inquiry'
        )),

    priority VARCHAR(20) NOT NULL DEFAULT 'Medium'
        CHECK (priority IN ('Critical', 'High', 'Medium', 'Low')),

    assigned_admin_id VARCHAR(50)
        REFERENCES users(id) ON DELETE SET NULL,

    category_source VARCHAR(20) NOT NULL DEFAULT 'manual'
        CHECK (category_source IN ('manual', 'ai')),

    priority_source VARCHAR(20) NOT NULL DEFAULT 'manual'
        CHECK (priority_source IN ('manual', 'ai')),

    ai_draft_response TEXT,                               -- Stores the AI-generated draft response for admins
    ai_status VARCHAR(20) NOT NULL DEFAULT 'pending'     -- 'pending' | 'processing' | 'completed' | 'failed'
        CHECK (ai_status IN ('pending', 'processing', 'completed', 'failed')),

    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
);

-- Responses and private admin notes
CREATE TABLE IF NOT EXISTS ticket_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ticket_id UUID NOT NULL
        REFERENCES tickets(id) ON DELETE CASCADE,

    sender_id VARCHAR(50) NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    sender_role VARCHAR(20) NOT NULL
        CHECK (sender_role IN ('author', 'admin')),

    message TEXT NOT NULL,
    is_internal BOOLEAN NOT NULL DEFAULT FALSE,
    created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tickets_author_id
    ON tickets(author_id);

CREATE INDEX IF NOT EXISTS idx_tickets_status
    ON tickets(status);

CREATE INDEX IF NOT EXISTS idx_tickets_priority
    ON tickets(priority);

CREATE INDEX IF NOT EXISTS idx_tickets_ai_status
    ON tickets(ai_status);

CREATE INDEX IF NOT EXISTS idx_tickets_created_at
    ON tickets(created_at);

CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket_id
    ON ticket_responses(ticket_id);

CREATE INDEX IF NOT EXISTS idx_tickets_assigned_admin_id
    ON tickets(assigned_admin_id);
