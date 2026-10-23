-- Books schema matching BookLeaf assignment requirements and sample dataset

CREATE TABLE IF NOT EXISTS books (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    author_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    isbn VARCHAR(50) NOT NULL,
    genre VARCHAR(100) NOT NULL,
    publication_date VARCHAR(10) NOT NULL,       -- 'YYYY-MM-DD'
    status VARCHAR(50) NOT NULL,                 -- 'Published & Live' | 'In Production - Cover Design' | 'In Production - Typesetting'
    mrp NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    author_royalty_per_copy NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_copies_sold INTEGER NOT NULL DEFAULT 0,
    total_royalty_earned NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    royalty_paid NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    royalty_pending NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    last_royalty_payout_date VARCHAR(10),        -- 'YYYY-MM-DD' (nullable for books in production)
    print_partner VARCHAR(100),                  -- 'In-House' | 'Repro India'
    available_on TEXT[] DEFAULT '{}',            -- ARRAY e.g. ARRAY['Amazon India', 'Flipkart']
    created_at VARCHAR(30) NOT NULL,             -- ISO timestamp string
    updated_at VARCHAR(30) NOT NULL              -- ISO timestamp string
);

CREATE INDEX IF NOT EXISTS idx_books_author_id ON books(author_id);
CREATE INDEX IF NOT EXISTS idx_books_status ON books(status);
CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);
