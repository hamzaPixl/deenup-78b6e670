// backend/src/__tests__/websocket/socketAuth.test.ts

// Mock supabaseAdmin before importing the module under test
jest.mock('../../config/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: jest.fn(),
    },
  },
}));

import { socketAuthMiddleware, SocketAuthError } from '../../websocket/socketAuth';
import { supabaseAdmin } from '../../config/supabase';

const mockGetUser = supabaseAdmin.auth.getUser as jest.Mock;

function makeSocket(token?: string, headerAuth?: string): any {
  return {
    handshake: {
      auth: token !== undefined ? { token } : {},
      headers: headerAuth ? { authorization: headerAuth } : {},
    },
    data: {},
  };
}

describe('socketAuthMiddleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('attaches user to socket.data when token is valid (Bearer prefix)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-uuid-1', email: 'test@example.com' } },
      error: null,
    });

    const socket = makeSocket('Bearer valid-token');
    const next = jest.fn();

    await socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith();
    expect(socket.userId).toBe('user-uuid-1');
    expect(socket.userEmail).toBe('test@example.com');
    expect(mockGetUser).toHaveBeenCalledWith('valid-token');
  });

  it('attaches user to socket.data when token is valid (no Bearer prefix)', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-uuid-2', email: 'other@example.com' } },
      error: null,
    });

    const socket = makeSocket('raw-token-no-bearer');
    const next = jest.fn();

    await socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith();
    expect(socket.userId).toBe('user-uuid-2');
    expect(mockGetUser).toHaveBeenCalledWith('raw-token-no-bearer');
  });

  it('calls next with SocketAuthError when token is missing', async () => {
    const socket = makeSocket(undefined);
    const next = jest.fn();

    await socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(SocketAuthError));
    const err = next.mock.calls[0][0] as SocketAuthError;
    expect(err.code).toBe('SOCKET_UNAUTHORIZED');
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('calls next with SocketAuthError when token is empty string', async () => {
    const socket = makeSocket('');
    const next = jest.fn();

    await socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(SocketAuthError));
    const err = next.mock.calls[0][0] as SocketAuthError;
    expect(err.code).toBe('SOCKET_UNAUTHORIZED');
  });

  it('calls next with SocketAuthError when supabase returns an error', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Token expired' },
    });

    const socket = makeSocket('invalid-token');
    const next = jest.fn();

    await socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(SocketAuthError));
    const err = next.mock.calls[0][0] as SocketAuthError;
    expect(err.code).toBe('SOCKET_INVALID_TOKEN');
  });

  it('calls next with SocketAuthError when supabase returns no user', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const socket = makeSocket('token-without-user');
    const next = jest.fn();

    await socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(SocketAuthError));
    const err = next.mock.calls[0][0] as SocketAuthError;
    expect(err.code).toBe('SOCKET_INVALID_TOKEN');
  });

  it('calls next with SocketAuthError when supabase throws unexpectedly', async () => {
    mockGetUser.mockRejectedValue(new Error('Network error'));

    const socket = makeSocket('some-token');
    const next = jest.fn();

    await socketAuthMiddleware(socket, next);

    expect(next).toHaveBeenCalledWith(expect.any(SocketAuthError));
    const err = next.mock.calls[0][0] as SocketAuthError;
    expect(err.code).toBe('INTERNAL_ERROR');
  });

  it('uses authorization header as fallback when auth.token is absent', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-uuid-3', email: 'fallback@example.com' } },
      error: null,
    });

    // No token in auth object, but present in header
    const socket: any = {
      handshake: {
        auth: {},
        headers: { authorization: 'Bearer header-token' },
      },
      data: {},
    };
    const next = jest.fn();

    await socketAuthMiddleware(socket as any, next);

    expect(next).toHaveBeenCalledWith();
    expect(socket.userId).toBe('user-uuid-3');
    expect(mockGetUser).toHaveBeenCalledWith('header-token');
  });
});
