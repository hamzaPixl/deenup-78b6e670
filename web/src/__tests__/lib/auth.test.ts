// web/src/__tests__/lib/auth.test.ts
import { authApi } from '../../lib/auth';

global.fetch = jest.fn();

// Mock Supabase client
jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      setSession: jest.fn().mockResolvedValue({ data: {}, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
    },
  },
}));

describe('Web Auth Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authApi.signup', () => {
    it('should call backend signup endpoint and return session', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            session: {
              accessToken: 'at-1',
              refreshToken: 'rt-1',
              expiresAt: 9999,
              user: {
                id: 'uuid-1',
                email: 'test@example.com',
                displayName: 'Test',
                elo: 1000,
                deenPoints: 50,
                avatarUrl: null,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
              },
            },
          }),
      });

      const result = await authApi.signup('test@example.com', 'password123', 'Test');
      expect(result.session.user.elo).toBe(1000);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/signup'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should throw on error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({ error: { code: 'EMAIL_EXISTS', message: 'duplicate' } }),
      });

      await expect(
        authApi.signup('dup@example.com', 'password123', 'Test')
      ).rejects.toMatchObject({ code: 'EMAIL_EXISTS' });
    });
  });

  describe('authApi.login', () => {
    it('should call backend login endpoint and return session', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            session: {
              accessToken: 'at-2',
              refreshToken: 'rt-2',
              expiresAt: 9999,
              user: {
                id: 'uuid-1',
                email: 'test@example.com',
                displayName: 'Test',
                elo: 1200,
                deenPoints: 75,
                avatarUrl: null,
                createdAt: '2026-01-01',
                updatedAt: '2026-01-01',
              },
            },
          }),
      });

      const result = await authApi.login('test@example.com', 'password123');
      expect(result.session.accessToken).toBe('at-2');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should throw on invalid credentials', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid' } }),
      });

      await expect(
        authApi.login('test@example.com', 'wrong')
      ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    });
  });

  describe('authApi.logout', () => {
    it('should call backend logout and sign out supabase', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: { access_token: 'at-1' } },
        error: null,
      });
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: 'ok' }),
      });

      await authApi.logout();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });

    it('should still sign out supabase even when no session', async () => {
      const { supabase } = require('../../lib/supabase');
      supabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await authApi.logout();
      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('authApi.requestPasswordReset', () => {
    it('should call backend password reset endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ message: 'ok' }),
      });

      await expect(authApi.requestPasswordReset('user@example.com')).resolves.not.toThrow();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/password-reset'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
