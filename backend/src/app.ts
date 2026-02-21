// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import { createAuthRouter } from './routes/auth';
import { AuthService } from './services/authService';
import { ProfileService } from './services/profileService';
import { supabaseAdmin } from './config/supabase';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const profileService = new ProfileService(supabaseAdmin);
  const authService = new AuthService(supabaseAdmin, profileService);

  app.use('/api/auth', createAuthRouter(authService));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  return app;
}
