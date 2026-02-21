// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import { RATE_LIMITS, AUTH_ERROR_CODES } from '@deenup/shared';

function createLimiter(config: { windowMs: number; maxRequests: number }) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: {
        code: AUTH_ERROR_CODES.RATE_LIMITED,
        message: 'Trop de requêtes, réessayez plus tard',
      },
    },
  });
}

export const signupLimiter = createLimiter(RATE_LIMITS.SIGNUP);
export const loginLimiter = createLimiter(RATE_LIMITS.LOGIN);
export const passwordResetLimiter = createLimiter(RATE_LIMITS.PASSWORD_RESET);
