// backend/src/routes/reports.ts
// Express router for /api/reports endpoints.

import { Router, Request, Response } from 'express';
import { authenticateUser, requireRole } from '../middleware/auth';
import { handleServiceError } from '../middleware/errorHandler';
import * as questionService from '../services/question';

const router = Router();

// ── GET / — List reports ───────────────────────────────────────────────────
router.get(
  '/',
  authenticateUser,
  requireRole('moderator'),
  async (req: Request, res: Response) => {
    try {
      const resolvedParam = req.query.resolved as string | undefined;
      const resolved =
        resolvedParam === 'true'
          ? true
          : resolvedParam === 'false'
          ? false
          : undefined;

      const questionId = req.query.questionId as string | undefined;

      const reports = await questionService.listReports({ resolved, questionId });
      res.json({ data: reports });
    } catch (err) {
      handleServiceError(res, err);
    }
  },
);

// ── PUT /:id/resolve — Resolve a report ───────────────────────────────────
router.put(
  '/:id/resolve',
  authenticateUser,
  requireRole('moderator'),
  async (req: Request, res: Response) => {
    try {
      const report = await questionService.resolveReport(req.params.id, req.user!.id);
      res.json({ data: report });
    } catch (err) {
      handleServiceError(res, err);
    }
  },
);

export default router;
