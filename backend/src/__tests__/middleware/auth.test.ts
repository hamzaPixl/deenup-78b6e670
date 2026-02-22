// backend/src/__tests__/middleware/auth.test.ts
import { authenticateUser } from '../../middleware/auth';
import { Request, Response, NextFunction } from 'express';

const mockGetUser = jest.fn();
jest.mock('../../db/supabase', () => ({
  supabaseAdmin: {
    auth: { getUser: (...args: any[]) => mockGetUser(...args) },
  },
}));

describe('authenticateUser', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 401 when no Authorization header', async () => {
    await authenticateUser(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'UNAUTHORIZED' }) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header is malformed (no Bearer prefix)', async () => {
    req.headers = { authorization: 'Basic sometoken' };
    await authenticateUser(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid or expired', async () => {
    req.headers = { authorization: 'Bearer invalid-token' };
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid JWT' },
    });

    await authenticateUser(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'TOKEN_EXPIRED' }) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when getUser returns user: null with no error', async () => {
    req.headers = { authorization: 'Bearer some-token' };
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    await authenticateUser(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() and attach user when token is valid', async () => {
    req.headers = { authorization: 'Bearer valid-token' };
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'uuid-1', email: 'test@example.com' } },
      error: null,
    });

    await authenticateUser(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect((req as any).user).toMatchObject({ id: 'uuid-1', email: 'test@example.com' });
    expect(res.status).not.toHaveBeenCalled();
  });
});
