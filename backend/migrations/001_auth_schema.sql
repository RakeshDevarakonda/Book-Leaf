-- Schema for users and authentication sessions

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('author', 'admin')),
    phone VARCHAR(50),
    city VARCHAR(100),
    joined_date VARCHAR(10) NOT NULL,     -- 'YYYY-MM-DD'
    created_at VARCHAR(35) NOT NULL,      -- ISO-8601 timestamp string
    updated_at VARCHAR(35) NOT NULL       -- ISO-8601 timestamp string
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash VARCHAR(255) NOT NULL,
    is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at VARCHAR(35) NOT NULL       -- ISO-8601 timestamp string
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_hash ON auth_sessions(refresh_token_hash);
