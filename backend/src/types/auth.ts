import { ROLES, UserRoleType } from '../config/constants';

export type UserRole = UserRoleType;

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  created_at: number; // epoch seconds
  updated_at: number; // epoch seconds
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: number; // epoch seconds
}

export interface AuthSession {
  id: string;
  user_id: string;
  refresh_token_hash: string;
  is_revoked: boolean;
  created_at: number; // epoch seconds
}

export interface AuthTokenPayload {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  sessionId: string; // bound to the specific active session!
}

export interface RefreshTokenPayload {
  id: string;
  sessionId: string;
}
