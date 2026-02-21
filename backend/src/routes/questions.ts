// backend/src/routes/questions.ts
// Express router for /api/questions endpoints.

import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { QUESTION_RATE_LIMITS, REPORT_REASONS } from '@deenup/shared';
import { authenticateUser, requireRole, optionalAuth } from '../middleware/auth';
import { validateCreateQuestion, validateUpdateQuestion } from '../middleware/validate';
import * as questionService from '../services/question';
import type { QuestionFilters } from '@deenup/shared';

const router = Router();

// ── Rate limiter for question creation ─────────────────────────────────────
const createQuestionLimiter = rateLimit({
  windowMs: QUESTION_RATE_LIMITS.CREATE.windowMs,
  max: QUESTION_RATE_LIMITS.CREATE.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests, please try again later' } },
});

// ── Helper: send service errors as HTTP responses ──────────────────────────
function handleServiceError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';

  switch (message) {
    case 'QUESTION_NOT_FOUND':
      res.status(404).json({ error: { code: 'QUESTION_NOT_FOUND', message: 'Question not found' } });
      return;
    case 'INVALID_STATUS_TRANSITION':
      res.status(400).json({ error: { code: 'INVALID_STATUS_TRANSITION', message: 'Invalid status transition for this question' } });
      return;
    case 'SELF_REVIEW_FORBIDDEN':
      res.status(403).json({ error: { code: 'SELF_REVIEW_FORBIDDEN', message: 'You cannot review your own question' } });
      return;
    case 'FORBIDDEN':
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action' } });
      return;
    case 'NOTES_REQUIRED':
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Rejection notes are required' } });
      return;
    case 'REPORT_NOT_FOUND':
      res.status(404).json({ error: { code: 'REPORT_NOT_FOUND', message: 'Report not found' } });
      return;
    case 'ALREADY_RESOLVED':
      res.status(400).json({ error: { code: 'ALREADY_RESOLVED', message: 'Report is already resolved' } });
      return;
    default:
      console.error(err);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  }
}

// ── GET /review-queue — MUST be before /:id ────────────────────────────────
router.get(
  '/review-queue',
  authenticateUser,
  requireRole('moderator'),
  async (_req: Request, res: Response) => {
    try {
      const queue = await questionService.getReviewQueue();
      res.json({ data: queue });
    } catch (err) {
      handleServiceError(res, err);
    }
  },
);

// ── POST / — Create question ───────────────────────────────────────────────
router.post(
  '/',
  authenticateUser,
  requireRole('moderator'),
  createQuestionLimiter,
  validateCreateQuestion,
  async (req: Request, res: Response) => {
    try {
      const question = await questionService.createQuestion(req.body as Parameters<typeof questionService.createQuestion>[0], req.user!.id);
      res.status(201).json({ data: question });
    } catch (err) {
      handleServiceError(res, err);
    }
  },
);

// ── GET / — List questions ─────────────────────────────────────────────────
router.get(
  '/',
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const includeAllStatuses =
        req.user?.role === 'admin' || req.user?.role === 'moderator';

      const filters: QuestionFilters = {
        theme: req.query.theme as QuestionFilters['theme'],
        difficulty: req.query.difficulty as QuestionFilters['difficulty'],
        status: req.query.status as QuestionFilters['status'],
        search: req.query.search as string | undefined,
        language: req.query.language as string | undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        cursor: req.query.cursor as string | undefined,
      };

      const result = await questionService.listQuestions(filters, includeAllStatuses);
      res.json(result);
    } catch (err) {
      handleServiceError(res, err);
    }
  },
);

// ── GET /:id — Get single question ─────────────────────────────────────────
router.get(
  '/:id',
  optionalAuth,
  async (req: Request, res: Response) => {
    try {
      const includeNonApproved =
        req.user?.role === 'admin' || req.user?.role === 'moderator';

      const question = await questionService.getQuestion(req.params.id, includeNonApproved);

      if (!question) {
        res.status(404).json({ error: { code: 'QUESTION_NOT_FOUND', message: 'Question not found' } });
        return;
      }

      res.json({ data: question });
    } catch (err) {
      handleServiceError(res, err);
    }
  },
);

// ── PUT /:id — Update question ─────────────────────────────────────────────
router.put(
  '/:id',
  authenticateUser,
  requireRole('moderator'),
  validateUpdateQuestion,
  async (req: Request, res: Response) => {
    try {
      const question = await questionService.updateQuestion(
        req.params.id,
        req.body as Parameters<typeof questionService.updateQuestion>[1],
      );
      res.json({ data: question });
    } catch (err) {
      handleServiceError(res, err);
    }
  },
);

// ── DELETE /:id — Delete question ──────────────────────────────────────────
router.delete(
  '/:id',
  authenticateUser,
  requireRole('admin'),
  async (req: Request, res: Response) => {
    try {
      await questionService.deleteQuestion(req.params.id);
      res.json({ data: { deleted: true } });
    } catch (err) {
      handleServiceError(res, err);
    }
  },
);

// ── POST /:id/submit-review ────────────────────────────────────────────────
router.post(
  '/:id/submit-review',
  authenticateUser,
  async (req: Request, res: Response) => {
    try {
      const question = await questionService.submitForReview(req.params.id, req.user!.id);
      res.json({ data: question });
    } catch (err) {
      handleServiceError(res, err);
    }
  },
);

// ── POST /:id/approve ──────────────────────────────────────────────────────
router.post(
  '/:id/approve',
  authenticateUser,
  requireRole('moderator'),
  async (req: Request, res: Response) => {
    try {
      const question = await questionService.approveQuestion(req.params.id, req.user!.id);
      res.json({ data: question });
    } catch (err) {
      handleServiceError(res, err);
    }
  },
);

// ── POST /:id/reject ───────────────────────────────────────────────────────
router.post(
  '/:id/reject',
  authenticateUser,
  requireRole('moderator'),
  async (req: Request, res: Response) => {
    try {
      const { notes } = req.body as { notes?: string };
      const question = await questionService.rejectQuestion(req.params.id, req.user!.id, notes ?? '');
      res.json({ data: question });
    } catch (err) {
      handleServiceError(res, err);
    }
  },
);

// ── POST /:id/report ───────────────────────────────────────────────────────
router.post(
  '/:id/report',
  authenticateUser,
  async (req: Request, res: Response) => {
    const { reason, description } = req.body as { reason?: string; description?: string };

    if (!reason || !(REPORT_REASONS as readonly string[]).includes(reason)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid reason. Must be one of: ${REPORT_REASONS.join(', ')}`,
        },
      });
      return;
    }

    try {
      const report = await questionService.reportQuestion(
        req.params.id,
        req.user!.id,
        reason,
        description,
      );
      res.status(201).json({ data: report });
    } catch (err) {
      handleServiceError(res, err);
    }
  },
);

export default router;
