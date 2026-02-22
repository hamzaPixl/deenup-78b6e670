// backend/src/websocket/socketAuth.ts
import { Socket } from 'socket.io';
import { MATCH_ERROR_CODES } from '@deenup/shared';
import { supabaseAdmin } from '../config/supabase';

export interface AuthenticatedSocket extends Socket {
  userId: string;
  userEmail: string;
}

/**
 * Socket.io middleware that authenticates the JWT token from handshake headers.
 * Token must be passed as:  { auth: { token: "Bearer <jwt>" } }  or
 *                           { auth: { token: "<jwt>" } }
 */
export async function socketAuthMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  try {
    const raw: unknown =
      (socket.handshake.auth as Record<string, unknown>)?.token ??
      socket.handshake.headers?.authorization;

    if (typeof raw !== 'string' || raw.trim() === '') {
      return next(
        new SocketAuthError(
          MATCH_ERROR_CODES.SOCKET_UNAUTHORIZED,
          'Authentication token required'
        )
      );
    }

    const token = raw.startsWith('Bearer ') ? raw.substring(7) : raw;

    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return next(
        new SocketAuthError(
          MATCH_ERROR_CODES.SOCKET_INVALID_TOKEN,
          'Invalid or expired token'
        )
      );
    }

    // Attach user info to the socket for downstream handlers
    (socket as AuthenticatedSocket).userId = data.user.id;
    (socket as AuthenticatedSocket).userEmail = data.user.email ?? '';

    next();
  } catch {
    next(
      new SocketAuthError(MATCH_ERROR_CODES.INTERNAL_ERROR, 'Authentication failed')
    );
  }
}

export class SocketAuthError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'SocketAuthError';
  }
}
