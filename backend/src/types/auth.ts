import { ROLES, UserRoleType } from '../config/constants';

export type UserRole = UserRoleType;

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  phone?: string | null;
  city?: string | null;
  joined_date: string; // 'YYYY-MM-DD'
  created_at: string;  // 'YYYY-MM-DD'
  updated_at: string;  // 'YYYY-MM-DD'
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string | null;
  city?: string | null;
  joined_date: string; // 'YYYY-MM-DD'
  created_at: string;  // 'YYYY-MM-DD'
}

export interface AuthSession {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  is_revoked: boolean;
  created_at: string; // 'YYYY-MM-DD'
}

export interface AuthTokenPayload {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  sessionId: string;
}

export interface RefreshTokenPayload {
  id: string;
  sessionId: string;
}
