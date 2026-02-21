// backend/src/__tests__/services/authService.test.ts
import { AuthService } from '../../services/authService';
import { AUTH_ERROR_CODES } from '@deenup/shared';

// Mock Supabase client methods
const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockUpdateUser = jest.fn();
const mockGetUser = jest.fn();

const mockSupabase = {
  auth: {
    signUp: mockSignUp,
    signInWithPassword: mockSignInWithPassword,
    signOut: mockSignOut,
    resetPasswordForEmail: mockResetPasswordForEmail,
    updateUser: mockUpdateUser,
    getUser: mockGetUser,
    admin: { getUserById: jest.fn() },
  },
  from: jest.fn().mockReturnThis(),
  insert: jest.fn(),
  select: jest.fn(),
  single: jest.fn(),
};

const mockProfileService = {
  createProfile: jest.fn(),
  getProfile: jest.fn(),
  upsertProfileFromOAuth: jest.fn(),
};

const mockUser = {
  id: 'uuid-1',
  email: 'test@example.com',
  displayName: 'Test',
  avatarUrl: null,
  elo: 1000,
  deenPoints: 50,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(mockSupabase as any, mockProfileService as any);
  });

  describe('signup', () => {
    it('should create user and profile on successful signup', async () => {
      mockSignUp.mockResolvedValue({
        data: {
          user: { id: 'uuid-1', email: 'test@example.com' },
          session: {
            access_token: 'at-123',
            refresh_token: 'rt-123',
            expires_at: 9999999999,
          },
        },
        error: null,
      });
      mockProfileService.createProfile.mockResolvedValue(mockUser);

      const result = await authService.signup({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test',
      });

      expect(result.session.accessToken).toBe('at-123');
      expect(result.session.user.elo).toBe(1000);
      expect(mockProfileService.createProfile).toHaveBeenCalledWith(
        'uuid-1',
        'Test',
        null
      );
    });

    it('should return EMAIL_EXISTS error for duplicate email', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered', status: 422 },
      });

      await expect(
        authService.signup({
          email: 'dup@example.com',
          password: 'password123',
          displayName: 'Test',
        })
      ).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.EMAIL_EXISTS,
      });
    });

    it('should throw INTERNAL_ERROR when no session returned', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      await expect(
        authService.signup({
          email: 'test@example.com',
          password: 'password123',
          displayName: 'Test',
        })
      ).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.INTERNAL_ERROR,
      });
    });

    it('should throw INTERNAL_ERROR for unknown Supabase error', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Network error' },
      });

      await expect(
        authService.signup({
          email: 'test@example.com',
          password: 'password123',
          displayName: 'Test',
        })
      ).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.INTERNAL_ERROR,
      });
    });
  });

  describe('login', () => {
    it('should return session on successful login', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'uuid-1', email: 'test@example.com' },
          session: {
            access_token: 'at-456',
            refresh_token: 'rt-456',
            expires_at: 9999999999,
          },
        },
        error: null,
      });
      mockProfileService.getProfile.mockResolvedValue(mockUser);

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.session.accessToken).toBe('at-456');
      expect(result.session.user.displayName).toBe('Test');
    });

    it('should return INVALID_CREDENTIALS on wrong password', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 },
      });

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      });
    });

    it('should throw INTERNAL_ERROR when session is missing after successful auth', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: null,
      });

      await expect(
        authService.login({ email: 'test@example.com', password: 'password123' })
      ).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.INTERNAL_ERROR,
      });
    });
  });

  describe('logout', () => {
    it('should call supabase signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null });
      await authService.logout('access-token');
      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should throw INTERNAL_ERROR when signOut fails', async () => {
      mockSignOut.mockResolvedValue({ error: { message: 'Sign out failed' } });

      await expect(
        authService.logout('access-token')
      ).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.INTERNAL_ERROR,
      });
    });
  });

  describe('requestPasswordReset', () => {
    it('should always return success (prevent email enumeration)', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null });
      await expect(
        authService.requestPasswordReset('any@example.com')
      ).resolves.not.toThrow();
    });

    it('should succeed even when resetPasswordForEmail returns error', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'Rate limited' } });
      // Should not throw — prevents enumeration
      await expect(
        authService.requestPasswordReset('nonexistent@example.com')
      ).resolves.not.toThrow();
    });
  });

  describe('confirmPasswordReset', () => {
    it('should update user password successfully', async () => {
      mockUpdateUser.mockResolvedValue({ data: {}, error: null });
      await expect(
        authService.confirmPasswordReset('valid-token', 'newpassword123')
      ).resolves.not.toThrow();
    });

    it('should throw INVALID_TOKEN when updateUser fails', async () => {
      mockUpdateUser.mockResolvedValue({ error: { message: 'Invalid token' } });

      await expect(
        authService.confirmPasswordReset('invalid-token', 'newpassword123')
      ).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.INVALID_TOKEN,
      });
    });
  });

  describe('getMe', () => {
    it('should return user profile for valid token', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'uuid-1', email: 'test@example.com' } },
        error: null,
      });
      mockProfileService.getProfile.mockResolvedValue(mockUser);

      const result = await authService.getMe('valid-token');
      expect(result.user.id).toBe('uuid-1');
    });

    it('should throw INVALID_TOKEN for bad token', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      await expect(
        authService.getMe('bad-token')
      ).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.INVALID_TOKEN,
      });
    });
  });

  describe('syncSocialProfile', () => {
    it('should upsert profile and return user', async () => {
      mockProfileService.upsertProfileFromOAuth.mockResolvedValue({
        ...mockUser,
        displayName: 'OAuth User',
        avatarUrl: 'https://google.com/photo.jpg',
      });

      const result = await authService.syncSocialProfile(
        'uuid-1',
        'OAuth User',
        'https://google.com/photo.jpg'
      );

      expect(result.user.displayName).toBe('OAuth User');
      expect(mockProfileService.upsertProfileFromOAuth).toHaveBeenCalledWith(
        'uuid-1',
        'OAuth User',
        'https://google.com/photo.jpg'
      );
    });
  });
});
