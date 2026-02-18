// shared/src/__tests__/auth-types.test.ts
import {
  User,
  AuthSession,
  AuthError,
  SignupRequest,
  LoginRequest,
  PasswordResetRequest,
  AUTH_ERROR_CODES,
  AUTH_DEFAULTS,
  RATE_LIMITS,
} from '../index';

describe('Auth Types', () => {
  it('should create a valid SignupRequest', () => {
    const req: SignupRequest = {
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
    };
    expect(req.email).toBe('test@example.com');
    expect(req.password).toBe('password123');
    expect(req.displayName).toBe('Test User');
  });

  it('should create a valid LoginRequest', () => {
    const req: LoginRequest = {
      email: 'test@example.com',
      password: 'password123',
    };
    expect(req.email).toBe('test@example.com');
  });

  it('should create a valid User', () => {
    const user: User = {
      id: 'uuid-123',
      email: 'test@example.com',
      displayName: 'Test User',
      avatarUrl: null,
      elo: 1000,
      deenPoints: 50,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    expect(user.elo).toBe(1000);
    expect(user.deenPoints).toBe(50);
  });

  it('should create a valid AuthSession', () => {
    const session: AuthSession = {
      accessToken: 'jwt-token',
      refreshToken: 'refresh-token',
      expiresAt: 1234567890,
      user: {
        id: 'uuid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        elo: 1000,
        deenPoints: 50,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    };
    expect(session.accessToken).toBe('jwt-token');
  });

  it('should have correct auth defaults', () => {
    expect(AUTH_DEFAULTS.INITIAL_ELO).toBe(1000);
    expect(AUTH_DEFAULTS.INITIAL_DEEN_POINTS).toBe(50);
    expect(AUTH_DEFAULTS.MIN_PASSWORD_LENGTH).toBe(8);
  });

  it('should have correct error codes', () => {
    expect(AUTH_ERROR_CODES.EMAIL_EXISTS).toBe('EMAIL_EXISTS');
    expect(AUTH_ERROR_CODES.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
    expect(AUTH_ERROR_CODES.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
  });

  it('should have rate limit config', () => {
    expect(RATE_LIMITS.SIGNUP.maxRequests).toBe(5);
    expect(RATE_LIMITS.LOGIN.maxRequests).toBe(10);
    expect(RATE_LIMITS.PASSWORD_RESET.maxRequests).toBe(3);
  });
});