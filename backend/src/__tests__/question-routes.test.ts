// backend/src/__tests__/question-routes.test.ts
// Integration tests for question CRUD routes.

// jest.mock is hoisted before imports automatically by Jest
jest.mock('../db/supabase', () => {
  const mockQuery = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    is: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
  };
  const mockClient = {
    from: jest.fn().mockReturnValue(mockQuery),
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
  };
  return {
    supabaseAdmin: mockClient,
    createUserClient: jest.fn().mockReturnValue(mockClient),
    __mockClient: mockClient,
    __mockQuery: mockQuery,
  };
});

import request from 'supertest';
import app from '../index';

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

// ── Mock user helpers ─────────────────────────────────────────────────────

function mockAdminUser() {
  __mockClient.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: 'admin-user-1',
        email: 'admin@deenup.com',
        app_metadata: { role: 'admin' },
      },
    },
    error: null,
  });
}

function mockModeratorUser() {
  __mockClient.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: 'mod-user-1',
        email: 'mod@deenup.com',
        app_metadata: { role: 'moderator' },
      },
    },
    error: null,
  });
}

function mockPlayerUser() {
  __mockClient.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: 'player-user-1',
        email: 'player@deenup.com',
        app_metadata: { role: 'player' },
      },
    },
    error: null,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('POST /api/questions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __mockClient.from.mockReturnValue(__mockQuery);
    // Reset all query mock methods
    __mockQuery.select.mockReturnThis();
    __mockQuery.insert.mockReturnThis();
    __mockQuery.update.mockReturnThis();
    __mockQuery.delete.mockReturnThis();
    __mockQuery.eq.mockReturnThis();
    __mockQuery.neq.mockReturnThis();
    __mockQuery.in.mockReturnThis();
    __mockQuery.ilike.mockReturnThis();
    __mockQuery.order.mockReturnThis();
    __mockQuery.limit.mockReturnThis();
    __mockQuery.is.mockReturnThis();
    __mockQuery.not.mockReturnThis();
    __mockQuery.single.mockResolvedValue({ data: null, error: null });
    __mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('creates a question as admin and returns 201', async () => {
    mockAdminUser();

    const createdQuestion = { ...dbQuestion, status: 'draft', question_sources: [] };
    const insertedSource = dbQuestion.question_sources[0];

    // First call: insert question → returns created question
    // Second call: insert sources → returns sources array
    // We track .from() calls: first 'questions', second 'question_sources'
    __mockClient.from.mockImplementation((table: string) => {
      if (table === 'question_sources') {
        const srcQuery = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockResolvedValue({ data: [insertedSource], error: null }),
        };
        return srcQuery;
      }
      // 'questions' table
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
    mockPlayerUser();
    const res = await request(app)
      .post('/api/questions')
      .set('Authorization', 'Bearer player-token')
      .send(validCreateBody);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 when sources are missing', async () => {
    mockModeratorUser();
    const bodyWithoutSources = { ...validCreateBody, sources: [] };
    const res = await request(app)
      .post('/api/questions')
      .set('Authorization', 'Bearer mod-token')
      .send(bodyWithoutSources);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SOURCE_REQUIRED');
  });
});

describe('GET /api/questions/:id', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __mockClient.from.mockReturnValue(__mockQuery);
    __mockQuery.select.mockReturnThis();
    __mockQuery.eq.mockReturnThis();
    __mockQuery.order.mockReturnThis();
    __mockQuery.limit.mockReturnThis();
    __mockQuery.single.mockResolvedValue({ data: null, error: null });
    __mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it('returns 200 for approved question without auth', async () => {
    __mockQuery.single.mockResolvedValue({ data: dbQuestion, error: null });

    const res = await request(app).get('/api/questions/q-123');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('q-123');
    expect(res.body.data.status).toBe('approved');
  });

  it('returns 404 for draft question without auth', async () => {
    // Without auth, service calls getQuestion with includeNonApproved=false
    // Supabase query adds .eq('status', 'approved') so draft returns null
    __mockQuery.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

    const res = await request(app).get('/api/questions/draft-q');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('QUESTION_NOT_FOUND');
  });
});

describe('GET /api/questions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __mockClient.auth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    // For list queries (no .single()), mock the query to be awaitable
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
    jest.clearAllMocks();
    __mockClient.from.mockReturnValue(__mockQuery);
    __mockQuery.select.mockReturnThis();
    __mockQuery.delete.mockReturnThis();
    __mockQuery.eq.mockReturnThis();
    __mockQuery.single.mockResolvedValue({ data: null, error: null });
    // Make delete awaitable (no .single())
    const deleteResult = { data: null, error: null };
    __mockQuery.then = (onfulfilled: (v: typeof deleteResult) => void) =>
      Promise.resolve(deleteResult).then(onfulfilled);
  });

  it('admin can delete question — returns 200', async () => {
    mockAdminUser();

    const res = await request(app)
      .delete('/api/questions/q-123')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body.data.deleted).toBe(true);
  });

  it('moderator cannot delete question — returns 403', async () => {
    mockModeratorUser();

    const res = await request(app)
      .delete('/api/questions/q-123')
      .set('Authorization', 'Bearer mod-token');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
