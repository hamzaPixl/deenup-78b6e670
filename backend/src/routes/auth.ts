// backend/src/routes/auth.ts
import { Router, Request, Response } from 'express';
import { AUTH_ERROR_CODES } from '@deenup/shared';
import { AuthService } from '../services/authService';
import {
  validateSignup,
  validateLogin,
  validatePasswordReset,
  validatePasswordResetConfirm,
} from '../validators/auth';
import { signupLimiter, loginLimiter, passwordResetLimiter } from '../middleware/rateLimiter';
import { authenticateUser } from '../middleware/auth';

const ERROR_STATUS_MAP: Record<string, number> = {
  [AUTH_ERROR_CODES.EMAIL_EXISTS]: 409,
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 401,
  [AUTH_ERROR_CODES.TOKEN_EXPIRED]: 401,
  [AUTH_ERROR_CODES.INVALID_TOKEN]: 401,
  [AUTH_ERROR_CODES.VALIDATION_ERROR]: 400,
  [AUTH_ERROR_CODES.USER_NOT_FOUND]: 404,
  [AUTH_ERROR_CODES.RATE_LIMITED]: 429,
  [AUTH_ERROR_CODES.WEAK_PASSWORD]: 400,
  [AUTH_ERROR_CODES.INTERNAL_ERROR]: 500,
};

function handleError(res: Response, err: any): void {
  const code = err.code ?? AUTH_ERROR_CODES.INTERNAL_ERROR;
  const status = ERROR_STATUS_MAP[code] ?? 500;
  res.status(status).json({ error: { code, message: err.message ?? 'Erreur interne' } });
}

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  router.post('/signup', signupLimiter, async (req: Request, res: Response) => {
    const validation = validateSignup(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: {
          code: AUTH_ERROR_CODES.VALIDATION_ERROR,
          message: 'Données invalides',
          details: validation.errors,
        },
      });
      return;
    }
    try {
      const result = await authService.signup(req.body);
      res.status(201).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/login', loginLimiter, async (req: Request, res: Response) => {
    const validation = validateLogin(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: {
          code: AUTH_ERROR_CODES.VALIDATION_ERROR,
          message: 'Données invalides',
          details: validation.errors,
        },
      });
      return;
    }
    try {
      const result = await authService.login(req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/logout', async (req: Request, res: Response) => {
    const token = req.headers.authorization?.substring(7) ?? '';
    try {
      await authService.logout(token);
      res.status(200).json({ message: 'Déconnexion réussie' });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/password-reset', passwordResetLimiter, async (req: Request, res: Response) => {
    const validation = validatePasswordReset(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: { code: AUTH_ERROR_CODES.VALIDATION_ERROR, message: 'Données invalides' },
      });
      return;
    }
    try {
      await authService.requestPasswordReset(req.body.email);
    } catch {
      // Always succeed — prevent email enumeration
    }
    res.status(200).json({ message: "Si un compte existe, un e-mail a été envoyé" });
  });

  router.post('/password-reset-confirm', async (req: Request, res: Response) => {
    const validation = validatePasswordResetConfirm(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: { code: AUTH_ERROR_CODES.VALIDATION_ERROR, message: 'Données invalides' },
      });
      return;
    }
    try {
      await authService.confirmPasswordReset(req.body.token, req.body.newPassword);
      res.status(200).json({ message: 'Mot de passe réinitialisé' });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get('/me', authenticateUser, async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization!.substring(7);
      const result = await authService.getMe(token);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/social-profile-sync', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { displayName, avatarUrl } = req.body;
      const userId = (req as any).user.id;
      const result = await authService.syncSocialProfile(userId, displayName, avatarUrl ?? null);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  return router;
}
