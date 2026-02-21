// backend/src/types/express.d.ts
// Express Request type augmentation to include authenticated user
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
    };
  }
}
