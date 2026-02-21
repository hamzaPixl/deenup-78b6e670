// backend/src/index.ts
import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';

const PORT = process.env.PORT ?? 3001;
const { httpServer } = createApp();

httpServer.listen(PORT, () => {
  console.log(`DeenUp API running on port ${PORT}`);
});
