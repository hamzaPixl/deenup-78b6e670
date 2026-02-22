// backend/src/__tests__/auth-middleware.test.ts
import { Request, Response, NextFunction } from 'express';

// Mock the supabase module before importing auth middleware
jest.mock('../db/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: jest.fn(),
    },
  },
}));

import { supabaseAdmin } from '../db/supabase';
import { authenticateUser, requireRole, optionalAuth } from '../middleware/auth';

// Cast mocked functions for type safety
const mockGetUser = supabaseAdmin.auth.getUser as jest.Mock;

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    user: undefined,
    ...overrides,
  } as unknown as Request;
}

function makeRes(): { res: Response; statusMock: jest.Mock; jsonMock: jest.Mock } {
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  const res = { status: statusMock, json: jsonMock } as unknown as Response;
  return { res, statusMock, jsonMock };
}

const next: NextFunction = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('authenticateUser middleware', () => {
  it('should attach req.user on valid Bearer token', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'admin@deenup.com',
          app_metadata: { role: 'admin' },
        },
      },
      error: null,
    });

    const req = makeReq({ headers: { authorization: 'Bearer valid-token' } });
    const { res } = makeRes();

    await authenticateUser(req, res, next);

    expect(mockGetUser).toHaveBeenCalledWith('valid-token');
    expect((req as unknown as { user: unknown }).user).toEqual({
      id: 'user-123',
      email: 'admin@deenup.com',
      role: 'admin',
    });
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 when no Authorization header', async () => {
    const req = makeReq();
    const { res, statusMock, jsonMock } = makeRes();

    await authenticateUser(req, res, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'UNAUTHORIZED' }) }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when Supabase rejects the token', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Invalid token' },
    });

    const req = makeReq({ headers: { authorization: 'Bearer bad-token' } });
    const { res, statusMock, jsonMock } = makeRes();

    await authenticateUser(req, res, next);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'UNAUTHORIZED' }) }),
    );
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireRole middleware', () => {
  it('should return 403 if user role does not match', () => {
    const req = makeReq();
    (req as unknown as { user: { id: string; email: string; role: string } }).user = {
      id: 'u1',
      email: 'player@deenup.com',
      role: 'player',
    };
    const { res, statusMock, jsonMock } = makeRes();

    requireRole('admin')(req, res, next);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'FORBIDDEN' }) }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next() if user has the required role', () => {
    const req = makeReq();
    (req as unknown as { user: { id: string; email: string; role: string } }).user = {
      id: 'u1',
      email: 'mod@deenup.com',
      role: 'moderator',
    };
    const { res } = makeRes();

    requireRole('moderator')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should allow admin when moderator role is required', () => {
    const req = makeReq();
    (req as unknown as { user: { id: string; email: string; role: string } }).user = {
      id: 'u1',
      email: 'admin@deenup.com',
      role: 'admin',
    };
    const { res } = makeRes();

    requireRole('moderator')(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});

describe('optionalAuth middleware', () => {
  it('should set req.user when valid token provided', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-123',
          email: 'mod@deenup.com',
          app_metadata: { role: 'moderator' },
        },
      },
      error: null,
    });

    const req = makeReq({ headers: { authorization: 'Bearer valid-token' } });
    const { res } = makeRes();

    await optionalAuth(req, res, next);

    expect((req as unknown as { user: unknown }).user).toEqual({
      id: 'user-123',
      email: 'mod@deenup.com',
      role: 'moderator',
    });
    expect(next).toHaveBeenCalled();
  });

  it('should call next() without req.user when no token', async () => {
    const req = makeReq();
    const { res } = makeRes();

    await optionalAuth(req, res, next);

    expect((req as unknown as { user: unknown }).user).toBeUndefined();
    expect(next).toHaveBeenCalled();
  });
});
