// backend/src/__tests__/routes/auth.test.ts
import request from 'supertest';
import express from 'express';
import { createAuthRouter } from '../../routes/auth';

// Mock the rate limiters to be no-ops in tests
jest.mock('../../middleware/rateLimiter', () => ({
  signupLimiter: (_req: any, _res: any, next: any) => next(),
  loginLimiter: (_req: any, _res: any, next: any) => next(),
  passwordResetLimiter: (_req: any, _res: any, next: any) => next(),
}));

// Mock the auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticateUser: (req: any, _res: any, next: any) => {
    req.user = { id: 'uuid-test', email: 'test@example.com' };
    next();
  },
}));

const mockAuthService = {
  signup: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  requestPasswordReset: jest.fn(),
  confirmPasswordReset: jest.fn(),
  getMe: jest.fn(),
  syncSocialProfile: jest.fn(),
};

describe('Auth Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter(mockAuthService as any));
  });

  describe('POST /api/auth/signup', () => {
    it('should return 201 on successful signup', async () => {
      mockAuthService.signup.mockResolvedValue({
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
          },
        },
      });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com', password: 'password123', displayName: 'Test' });

      expect(res.status).toBe(201);
      expect(res.body.session.accessToken).toBe('at-1');
    });

    it('should return 400 on validation error (invalid email)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'bad', password: 'x', displayName: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 on duplicate email', async () => {
      mockAuthService.signup.mockRejectedValue({
        code: 'EMAIL_EXISTS',
        message: 'Cet e-mail est déjà utilisé',
      });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'dup@example.com', password: 'password123', displayName: 'Test' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 200 on successful login', async () => {
      mockAuthService.login.mockResolvedValue({
        session: {
          accessToken: 'at-2',
          refreshToken: 'rt-2',
          expiresAt: 9999,
          user: {
            id: 'uuid-1',
            email: 'test@example.com',
            displayName: 'Test',
            elo: 1000,
            deenPoints: 50,
          },
        },
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.session.accessToken).toBe('at-2');
    });

    it('should return 401 on invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue({
        code: 'INVALID_CREDENTIALS',
        message: 'Identifiants incorrects',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should return 400 on validation error', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'bad-email', password: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/password-reset', () => {
    it('should always return 200 (prevent enumeration)', async () => {
      mockAuthService.requestPasswordReset.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/auth/password-reset')
        .send({ email: 'any@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });

    it('should return 200 even if service throws', async () => {
      mockAuthService.requestPasswordReset.mockRejectedValue(new Error('Rate limited'));

      const res = await request(app)
        .post('/api/auth/password-reset')
        .send({ email: 'any@example.com' });

      expect(res.status).toBe(200);
    });

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/password-reset')
        .send({ email: 'not-an-email' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 200 on successful logout', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
    });
  });

  describe('POST /api/auth/password-reset-confirm', () => {
    it('should return 200 on successful password reset', async () => {
      mockAuthService.confirmPasswordReset.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/auth/password-reset-confirm')
        .send({ token: 'valid-token', newPassword: 'newpassword123' });

      expect(res.status).toBe(200);
    });

    it('should return 400 on validation error', async () => {
      const res = await request(app)
        .post('/api/auth/password-reset-confirm')
        .send({ token: '', newPassword: 'short' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 200 with user profile', async () => {
      mockAuthService.getMe.mockResolvedValue({
        user: {
          id: 'uuid-test',
          email: 'test@example.com',
          displayName: 'Test',
          elo: 1000,
          deenPoints: 50,
        },
      });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe('uuid-test');
    });
  });

  describe('POST /api/auth/social-profile-sync', () => {
    it('should return 200 with synced user profile', async () => {
      mockAuthService.syncSocialProfile.mockResolvedValue({
        user: {
          id: 'uuid-test',
          email: 'test@example.com',
          displayName: 'OAuth User',
          elo: 1000,
          deenPoints: 50,
        },
      });

      const res = await request(app)
        .post('/api/auth/social-profile-sync')
        .set('Authorization', 'Bearer valid-token')
        .send({ displayName: 'OAuth User', avatarUrl: null });

      expect(res.status).toBe(200);
      expect(res.body.user.displayName).toBe('OAuth User');
    });
  });
});
