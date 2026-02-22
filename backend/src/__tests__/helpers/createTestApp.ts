// backend/src/__tests__/helpers/createTestApp.ts
// Minimal Express app for integration tests that mock ../db/supabase.
// Uses only routes that depend on db/supabase (questions, reports).
// Do NOT import from config/supabase or app.ts here.

import express from 'express';
import questionsRouter from '../../routes/questions';
import reportsRouter from '../../routes/reports';

export function createTestApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api/questions', questionsRouter);
  app.use('/api/reports', reportsRouter);
  return app;
}
