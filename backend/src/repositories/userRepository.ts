import { query } from '../config/db';
import { AuthSession, User, UserProfile } from '../types/auth';

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
}

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const res = await query(
      'SELECT id, name, email, password_hash, role, phone, city, joined_date, created_at, updated_at FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return res.rows[0] || null;
  },

  async findById(id: string): Promise<UserProfile | null> {
    const res = await query(
      'SELECT id, name, email, role, phone, city, joined_date, created_at FROM users WHERE id = $1',
      [id]
    );
    return res.rows[0] || null;
  },

  async createUser(userData: {
    id?: string;
    name: string;
    email: string;
    passwordHash: string;
    role: 'author' | 'admin';
    phone?: string | null;
    city?: string | null;
    joinedDate?: string;
    createdAt?: string;
  }): Promise<UserProfile> {
    const today = getTodayDateString();
    const joined = userData.joinedDate || today;
    const created = userData.createdAt || today;

    const res = await query(
      `INSERT INTO users (id, name, email, password_hash, role, phone, city, joined_date, created_at, updated_at)
       VALUES (COALESCE($1, gen_random_uuid()::text), $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, name, email, role, phone, city, joined_date, created_at`,
      [
        userData.id || null,
        userData.name,
        userData.email.toLowerCase(),
        userData.passwordHash,
        userData.role,
        userData.phone || null,
        userData.city || null,
        joined,
        created,
        created,
      ]
    );
    return res.rows[0];
  },

  // --- Auth Session Management ---

  async createSession(userId: string, refreshTokenHash: string): Promise<string> {
    const today = getTodayDateString();
    const res = await query(
      `INSERT INTO auth_sessions (user_id, refresh_token_hash, created_at)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, refreshTokenHash, today]
    );
    return res.rows[0].id;
  },

  async isSessionRevoked(sessionId: string): Promise<boolean> {
    const res = await query(
      `SELECT is_revoked FROM auth_sessions WHERE id = $1`,
      [sessionId]
    );
    if (!res.rows[0]) return true; // Session doesn't exist => treated as revoked
    return res.rows[0].is_revoked === true;
  },

  async findSessionById(sessionId: string): Promise<AuthSession | null> {
    const res = await query(
      `SELECT id, user_id, refresh_token_hash, is_revoked, created_at
       FROM auth_sessions
       WHERE id = $1`,
      [sessionId]
    );
    return res.rows[0] || null;
  },

  async updateSessionToken(sessionId: string, newRefreshTokenHash: string): Promise<void> {
    await query(
      `UPDATE auth_sessions
       SET refresh_token_hash = $1
       WHERE id = $2`,
      [newRefreshTokenHash, sessionId]
    );
  },

  async revokeSession(sessionId: string): Promise<void> {
    await query(
      `UPDATE auth_sessions SET is_revoked = TRUE WHERE id = $1`,
      [sessionId]
    );
  },

  async revokeAllUserSessions(userId: string): Promise<void> {
    await query(
      `UPDATE auth_sessions SET is_revoked = TRUE WHERE user_id = $1`,
      [userId]
    );
  }
};
