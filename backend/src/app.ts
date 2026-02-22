// backend/src/app.ts
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { createAuthRouter } from './routes/auth';
import { createMatchesRouter } from './routes/matches';
import { AuthService } from './services/authService';
import { ProfileService } from './services/profileService';
import { QuestionService } from './services/questionService';
import { MatchService } from './services/matchService';
import { EloService } from './services/eloService';
import { DeenPointsService } from './services/deenPointsService';
import { MatchmakingService } from './services/matchmakingService';
import { GameEngine } from './services/gameEngine';
import { supabaseAdmin } from './config/supabase';
import { socketAuthMiddleware } from './websocket/socketAuth';
import { createSocketHandler } from './websocket/socketHandler';

export interface AppInstance {
  app: express.Express;
  httpServer: http.Server;
  gameEngine: GameEngine;
  matchmakingService: MatchmakingService;
}

export function createApp(): AppInstance {
  const app = express();
  const httpServer = http.createServer(app);

  // -------------------------------------------------------------------------
  // Express middleware
  // -------------------------------------------------------------------------
  app.use(cors());
  app.use(express.json());

  // -------------------------------------------------------------------------
  // Service instantiation
  // -------------------------------------------------------------------------
  const profileService = new ProfileService(supabaseAdmin);
  const authService = new AuthService(supabaseAdmin, profileService);
  const questionService = new QuestionService(supabaseAdmin);
  const matchService = new MatchService(supabaseAdmin);
  const eloService = new EloService();
  const deenPointsService = new DeenPointsService(supabaseAdmin);
  const matchmakingService = new MatchmakingService();
  const gameEngine = new GameEngine(questionService, matchService, eloService, deenPointsService);

  // -------------------------------------------------------------------------
  // REST routes
  // -------------------------------------------------------------------------
  app.use('/api/auth', createAuthRouter(authService));
  app.use('/api/matches', createMatchesRouter(matchService));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // -------------------------------------------------------------------------
  // Socket.io
  // -------------------------------------------------------------------------
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Apply authentication middleware to all socket connections
  io.use(socketAuthMiddleware);

  // Wire all socket event handlers (pass matchService + profileService for H2 ELO fetch and C3 answer review)
  createSocketHandler(io, gameEngine, matchmakingService, matchService, profileService);

  return { app, httpServer, gameEngine, matchmakingService };
}
