// backend/src/index.ts
import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';

const PORT = process.env.PORT ?? 3001;
const { httpServer, cleanup } = createApp();

httpServer.listen(PORT, () => {
  console.log(`DeenUp API running on port ${PORT}`);
});

// Graceful shutdown — stop matchmaking loop and cleanup intervals
function gracefulShutdown(signal: string): void {
  console.log(`[Server] ${signal} received — shutting down gracefully`);
  cleanup();
  httpServer.close(() => {
    console.log('[Server] HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
