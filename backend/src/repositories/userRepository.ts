import { query } from '../config/db';
import { AuthSession, User, UserProfile } from '../types/auth';

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const res = await query(
      'SELECT id, name, email, password_hash, role, CAST(created_at AS BIGINT) as created_at, CAST(updated_at AS BIGINT) as updated_at FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    if (!res.rows[0]) return null;
    return {
      ...res.rows[0],
      created_at: Number(res.rows[0].created_at),
      updated_at: Number(res.rows[0].updated_at),
    };
  },

  async findById(id: string): Promise<UserProfile | null> {
    const res = await query(
      'SELECT id, name, email, role, CAST(created_at AS BIGINT) as created_at FROM users WHERE id = $1',
      [id]
    );
    if (!res.rows[0]) return null;
    return {
      ...res.rows[0],
      created_at: Number(res.rows[0].created_at),
    };
  },

  async createUser(userData: {
    name: string;
    email: string;
    passwordHash: string;
    role: 'author' | 'admin';
    createdAt?: number;
  }): Promise<UserProfile> {
    const now = userData.createdAt || Math.floor(Date.now() / 1000); // epoch seconds
    const res = await query(
      `INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, CAST(created_at AS BIGINT) as created_at`,
      [
        userData.name,
        userData.email.toLowerCase(),
        userData.passwordHash,
        userData.role,
        now,
        now,
      ]
    );
    return {
      ...res.rows[0],
      created_at: Number(res.rows[0].created_at),
    };
  },

  // --- Auth Session Management ---

  async createSession(userId: string, refreshTokenHash: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000); // epoch seconds
    const res = await query(
      `INSERT INTO auth_sessions (user_id, refresh_token_hash, created_at)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, refreshTokenHash, now]
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
      `SELECT id, user_id, refresh_token_hash, is_revoked,
              CAST(created_at AS BIGINT) as created_at
       FROM auth_sessions
       WHERE id = $1`,
      [sessionId]
    );
    if (!res.rows[0]) return null;
    return {
      ...res.rows[0],
      created_at: Number(res.rows[0].created_at),
    };
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
