// backend/src/__tests__/question-routes.test.ts
// Integration tests for question CRUD routes.

// jest.mock is hoisted — factory uses shared helper to avoid duplication
jest.mock('../db/supabase', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./helpers/mockSupabase').createSupabaseMockModule(),
);

import request from 'supertest';
import app from '../index';
import { resetSupabaseMocks, mockAuthUser } from './helpers/mockSupabase';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mockClient, __mockQuery } = require('../db/supabase');

// ── Shared test data ─────────────────────────────────────────────────────

const dbQuestion = {
  id: 'q-123',
  text: 'Test question text here?',
  theme: 'quran',
  difficulty: 'easy',
  type: 'qcm',
  options: [
    { text: 'A', is_correct: true },
    { text: 'B', is_correct: false },
    { text: 'C', is_correct: false },
    { text: 'D', is_correct: false },
  ],
  explanation: 'This is the explanation for the test question.',
  status: 'approved',
  language: 'fr',
  created_by: 'user-456',
  reviewed_by: null,
  reviewed_at: null,
  reviewer_notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  question_sources: [
    {
      id: 'src-1',
      question_id: 'q-123',
      type: 'quran',
      reference: 'Al-Fatiha:1',
      detail: null,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
};

const validCreateBody = {
  text: 'What is the first surah of the Quran?',
  theme: 'quran',
  difficulty: 'easy',
  type: 'qcm',
  options: [
    { text: 'Al-Fatiha', isCorrect: true },
    { text: 'Al-Baqara', isCorrect: false },
    { text: 'Al-Imran', isCorrect: false },
    { text: 'Al-Nisa', isCorrect: false },
  ],
  explanation: 'Al-Fatiha is the opening chapter of the Quran and the first surah.',
  sources: [{ type: 'quran', reference: 'Al-Fatiha:1' }],
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe('POST /api/questions', () => {
  beforeEach(() => resetSupabaseMocks(__mockQuery, __mockClient));

  it('creates a question as admin and returns 201', async () => {
    mockAuthUser(__mockClient, 'admin-user-1', 'admin@deenup.com', 'admin');

    const createdQuestion = { ...dbQuestion, status: 'draft', question_sources: [] };
    const insertedSource = dbQuestion.question_sources[0];

    __mockClient.from.mockImplementation((table: string) => {
      if (table === 'question_sources') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockResolvedValue({ data: [insertedSource], error: null }),
        };
      }
      __mockQuery.single.mockResolvedValue({ data: createdQuestion, error: null });
      return __mockQuery;
    });

    const res = await request(app)
      .post('/api/questions')
      .set('Authorization', 'Bearer valid-token')
      .send(validCreateBody);

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.id).toBe('q-123');
  });

  it('returns 401 when no auth token provided', async () => {
    const res = await request(app).post('/api/questions').send(validCreateBody);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 403 when player role tries to create', async () => {
    mockAuthUser(__mockClient, 'player-user-1', 'player@deenup.com', 'player');
    const res = await request(app)
      .post('/api/questions')
      .set('Authorization', 'Bearer player-token')
      .send(validCreateBody);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 when sources are missing', async () => {
    mockAuthUser(__mockClient, 'mod-user-1', 'mod@deenup.com', 'moderator');
    const res = await request(app)
      .post('/api/questions')
      .set('Authorization', 'Bearer mod-token')
      .send({ ...validCreateBody, sources: [] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SOURCE_REQUIRED');
  });
});

describe('GET /api/questions/:id', () => {
  beforeEach(() => resetSupabaseMocks(__mockQuery, __mockClient));

  it('returns 200 for approved question without auth', async () => {
    __mockQuery.single.mockResolvedValue({ data: dbQuestion, error: null });

    const res = await request(app).get('/api/questions/q-123');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('q-123');
    expect(res.body.data.status).toBe('approved');
  });

  it('returns 404 for draft question without auth', async () => {
    __mockQuery.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const res = await request(app).get('/api/questions/draft-q');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('QUESTION_NOT_FOUND');
  });
});

describe('GET /api/questions', () => {
  beforeEach(() => {
    resetSupabaseMocks(__mockQuery, __mockClient);
    const listQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      then: (onfulfilled: (value: { data: unknown[]; error: null; count: number }) => void) =>
        Promise.resolve({ data: [dbQuestion], error: null, count: 1 }).then(onfulfilled),
    };
    __mockClient.from.mockReturnValue(listQuery);
  });

  it('returns questions without auth', async () => {
    const res = await request(app).get('/api/questions');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });
});

describe('DELETE /api/questions/:id', () => {
  beforeEach(() => {
    resetSupabaseMocks(__mockQuery, __mockClient);
    const deleteResult = { data: null, error: null };
    __mockQuery.then.mockImplementation((onfulfilled: (v: typeof deleteResult) => void) =>
      Promise.resolve(deleteResult).then(onfulfilled),
    );
  });

  it('admin can delete question — returns 200', async () => {
    mockAuthUser(__mockClient, 'admin-user-1', 'admin@deenup.com', 'admin');
    const res = await request(app)
      .delete('/api/questions/q-123')
      .set('Authorization', 'Bearer admin-token');
    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });

  it('moderator cannot delete question — returns 403', async () => {
    mockAuthUser(__mockClient, 'mod-user-1', 'mod@deenup.com', 'moderator');
    const res = await request(app)
      .delete('/api/questions/q-123')
      .set('Authorization', 'Bearer mod-token');
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
