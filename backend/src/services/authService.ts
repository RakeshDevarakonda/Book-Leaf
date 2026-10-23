import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { env } from '../config/env';
import { userRepository } from '../repositories/userRepository';
import { AuthTokenPayload, RefreshTokenPayload, UserProfile, UserRole } from '../types/auth';
import { ERROR_CODES, HTTP_STATUS, ROLES, TOKEN_EXPIRY } from '../config/constants';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class AppError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = HTTP_STATUS.BAD_REQUEST, code: string = ERROR_CODES.VALIDATION_ERROR) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const authService = {
  generateAccessToken(user: { id: string; email: string; role: UserRole; name: string }, sessionId: string): string {
    const payload: AuthTokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      sessionId,
    };
    return jwt.sign(payload, env.ACCESS_TOKEN_SECRET, { expiresIn: TOKEN_EXPIRY.ACCESS_TOKEN_JWT });
  },

  generateRefreshToken(userId: string, sessionId: string): string {
    const payload: RefreshTokenPayload = { id: userId, sessionId };
    return jwt.sign(payload, env.REFRESH_TOKEN_SECRET, { expiresIn: TOKEN_EXPIRY.REFRESH_TOKEN_JWT });
  },

  async signup(data: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ user: UserProfile; accessToken: string; refreshToken: string }> {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new AppError('An account with this email already exists', HTTP_STATUS.CONFLICT, ERROR_CODES.EMAIL_EXISTS);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // Role is strictly hardcoded to author on signup for security
    const user = await userRepository.createUser({
      name: data.name.trim(),
      email: data.email,
      passwordHash,
      role: ROLES.AUTHOR,
    });

    // Let Postgres generate the primary key session ID via DEFAULT gen_random_uuid()
    const sessionId = await userRepository.createSession(user.id, '');

    const accessToken = this.generateAccessToken(user, sessionId);
    const refreshToken = this.generateRefreshToken(user.id, sessionId);

    await userRepository.updateSessionToken(sessionId, hashToken(refreshToken));

    return { user, accessToken, refreshToken };
  },

  async login(
    email: string,
    password: string
  ): Promise<{ user: UserProfile; accessToken: string; refreshToken: string }> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS);
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS);
    }

    // Let Postgres generate the primary key session ID via DEFAULT gen_random_uuid()
    const sessionId = await userRepository.createSession(user.id, '');

    const accessToken = this.generateAccessToken(user, sessionId);
    const refreshToken = this.generateRefreshToken(user.id, sessionId);

    await userRepository.updateSessionToken(sessionId, hashToken(refreshToken));

    const userProfile: UserProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      city: user.city,
      joined_date: user.joined_date,
      created_at: user.created_at,
    };

    return { user: userProfile, accessToken, refreshToken };
  },

  /**
   * Fast refresh: relies purely on jwt.verify for expiration
   */
  async refresh(refreshToken?: string): Promise<{ accessToken: string; refreshToken: string | null; user: UserProfile }> {
    if (!refreshToken) {
      throw new AppError('Refresh token is required', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.REFRESH_TOKEN_REQUIRED);
    }

    let decoded: RefreshTokenPayload;
    try {
      // jwt.verify automatically handles expiration!
      decoded = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET) as RefreshTokenPayload;
    } catch {
      throw new AppError('Invalid or expired refresh token', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_REFRESH_TOKEN);
    }

    const session = await userRepository.findSessionById(decoded.sessionId);
    if (!session || session.is_revoked) {
      throw new AppError('Session has been revoked', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.REVOKED_REFRESH_TOKEN);
    }

    // Verify token hash matches to detect reuse
    const incomingTokenHash = hashToken(refreshToken);
    if (session.refresh_token_hash !== incomingTokenHash) {
      await userRepository.revokeSession(session.id);
      throw new AppError('Invalid token. Session terminated.', HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.REVOKED_REFRESH_TOKEN);
    }

    const user = await userRepository.findById(session.user_id);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.USER_NOT_FOUND);
    }

    // Issue new Access Token
    const newAccessToken = this.generateAccessToken(user, session.id);

    return {
      accessToken: newAccessToken,
      refreshToken: null,
      user,
    };
  },

  async logout(sessionId?: string): Promise<void> {
    if (sessionId) {
      await userRepository.revokeSession(sessionId);
    }
  },

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.USER_NOT_FOUND);
    }
    return user;
  }
};
