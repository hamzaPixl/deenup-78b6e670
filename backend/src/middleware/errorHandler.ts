// backend/src/middleware/errorHandler.ts
// Shared service-error-to-HTTP-response helper consumed by all routers.

import { Response } from 'express';

/**
 * Maps service-layer Error messages to the appropriate HTTP status + JSON error body.
 * All well-known service errors are caught here; anything else becomes 500.
 */
export function handleServiceError(res: Response, err: unknown): void {
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
