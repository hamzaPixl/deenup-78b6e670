// backend/src/routes/reports.ts
// Express router for /api/reports endpoints.

import { Router, Request, Response } from 'express';
import { authenticateUser, requireRole } from '../middleware/auth';
import * as questionService from '../services/question';

const router = Router();

// ── Helper: send service errors as HTTP responses ──────────────────────────
function handleServiceError(res: Response, err: unknown): void {
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';

  switch (message) {
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
