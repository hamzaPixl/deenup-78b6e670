// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { AUTH_ERROR_CODES } from '@deenup/shared';
import { supabaseAdmin } from '../config/supabase';

export interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: { code: AUTH_ERROR_CODES.INVALID_TOKEN, message: 'Token requis' },
    });
    return;
  }

  const token = authHeader.substring(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({
      error: { code: AUTH_ERROR_CODES.TOKEN_EXPIRED, message: 'Token invalide ou expiré' },
    });
    return;
  }

  (req as any).user = { id: data.user.id, email: data.user.email };
  next();
}
