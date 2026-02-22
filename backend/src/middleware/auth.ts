// Authentication and role-based authorization middleware.

import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../db/supabase';

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Middleware: authenticate user from Bearer token.
 * Attaches { id, email, role } to req.user on success.
 * Returns 401 on missing or invalid token.
 */
export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return;
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    return;
  }

  const role =
    (data.user.app_metadata as { role?: string } | null)?.role ?? 'player';

  req.user = {
    id: data.user.id,
    email: data.user.email ?? '',
    role,
  };

  next();
}

/**
 * Middleware factory: require a minimum role.
 * Admin is always permitted regardless of the required role.
 * Returns 403 if the user's role is insufficient.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;

    if (!user) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    // Admin always passes
    if (user.role === 'admin' || roles.includes(user.role)) {
      next();
      return;
    }

    res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
  };
}

/**
 * Middleware: optionally authenticate from Bearer token.
 * Sets req.user if token is valid, leaves it undefined otherwise.
 * Always calls next() — does not block unauthenticated requests.
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = extractBearerToken(req);

  if (token) {
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && data.user) {
      const role =
        (data.user.app_metadata as { role?: string } | null)?.role ?? 'player';
      req.user = {
        id: data.user.id,
        email: data.user.email ?? '',
        role,
      };
    }
  }

  next();
}
