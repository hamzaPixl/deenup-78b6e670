export type UserRole = 'player' | 'moderator' | 'admin';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  elo: number;
  deenPoints: number;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: User;
}

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthErrorResponse {
  error: AuthError;
}

export interface SignupRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}