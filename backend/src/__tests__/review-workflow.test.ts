// backend/src/__tests__/review-workflow.test.ts
// Integration tests for question review workflow routes.

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

const CREATOR_ID = 'user-creator-1';
const REVIEWER_ID = 'user-reviewer-1';

const draftQuestion = {
  id: 'q-draft-1',
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
  status: 'draft',
  language: 'fr',
  created_by: CREATOR_ID,
  reviewed_by: null,
  reviewed_at: null,
  reviewer_notes: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  question_sources: [
    {
      id: 'src-1',
      question_id: 'q-draft-1',
      type: 'quran',
      reference: 'Al-Fatiha:1',
      detail: null,
      created_at: '2026-01-01T00:00:00Z',
    },
  ],
};

const pendingQuestion = { ...draftQuestion, status: 'pending_review' };
const approvedQuestion = { ...draftQuestion, status: 'approved', reviewed_by: REVIEWER_ID };

// ── Mock user helpers ─────────────────────────────────────────────────────

function mockCreatorModerator() {
  __mockClient.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: CREATOR_ID,
        email: 'creator@deenup.com',
        app_metadata: { role: 'moderator' },
      },
    },
    error: null,
  });
}

function mockReviewerModerator() {
  __mockClient.auth.getUser.mockResolvedValue({
    data: {
      user: {
        id: REVIEWER_ID,
        email: 'reviewer@deenup.com',
        app_metadata: { role: 'moderator' },
      },
    },
    error: null,
  });
}

function resetQueryMocks() {
  jest.clearAllMocks();
  __mockClient.from.mockReturnValue(__mockQuery);
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
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('POST /api/questions/:id/submit-review', () => {
  beforeEach(resetQueryMocks);

  it('transitions draft to pending_review — returns 200', async () => {
    mockCreatorModerator();

    // First single() call fetches the question (status='draft', created_by=CREATOR_ID)
    // Second single() call returns updated question with status='pending_review'
    __mockQuery.single
      .mockResolvedValueOnce({ data: draftQuestion, error: null })
      .mockResolvedValueOnce({ data: pendingQuestion, error: null });

    const res = await request(app)
      .post('/api/questions/q-draft-1/submit-review')
      .set('Authorization', 'Bearer creator-token');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('pending_review');
  });

  it('returns 400 when question is already pending_review', async () => {
    mockCreatorModerator();

    // Fetch returns already pending question
    __mockQuery.single.mockResolvedValueOnce({ data: pendingQuestion, error: null });

    const res = await request(app)
      .post('/api/questions/q-draft-1/submit-review')
      .set('Authorization', 'Bearer creator-token');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });
});

describe('POST /api/questions/:id/approve', () => {
  beforeEach(resetQueryMocks);

  it('approves a pending_review question by a different reviewer — returns 200', async () => {
    mockReviewerModerator();

    __mockQuery.single
      .mockResolvedValueOnce({ data: pendingQuestion, error: null })
      .mockResolvedValueOnce({ data: approvedQuestion, error: null });

    const res = await request(app)
      .post('/api/questions/q-draft-1/approve')
      .set('Authorization', 'Bearer reviewer-token');

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('approved');
  });

  it('returns 403 when creator tries to approve their own question', async () => {
    mockCreatorModerator();

    // Fetch returns pending question with created_by=CREATOR_ID
    __mockQuery.single.mockResolvedValueOnce({ data: pendingQuestion, error: null });

    const res = await request(app)
      .post('/api/questions/q-draft-1/approve')
      .set('Authorization', 'Bearer creator-token');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SELF_REVIEW_FORBIDDEN');
  });
});

describe('POST /api/questions/:id/reject', () => {
  beforeEach(resetQueryMocks);

  it('rejects a pending_review question with notes — returns 200', async () => {
    mockReviewerModerator();

    const rejectedQuestion = { ...pendingQuestion, status: 'rejected', reviewer_notes: 'Incorrect source citation' };

    __mockQuery.single
      .mockResolvedValueOnce({ data: pendingQuestion, error: null })
      .mockResolvedValueOnce({ data: rejectedQuestion, error: null });

    const res = await request(app)
      .post('/api/questions/q-draft-1/reject')
      .set('Authorization', 'Bearer reviewer-token')
      .send({ notes: 'Incorrect source citation' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('rejected');
  });

  it('returns 400 when notes are missing', async () => {
    mockReviewerModerator();

    const res = await request(app)
      .post('/api/questions/q-draft-1/reject')
      .set('Authorization', 'Bearer reviewer-token')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/questions/review-queue', () => {
  beforeEach(resetQueryMocks);

  it('returns 200 with queue for moderator', async () => {
    mockReviewerModerator();

    // For list queries (no .single()), make the query awaitable
    const listQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: (onfulfilled: (value: { data: unknown[]; error: null }) => void) =>
        Promise.resolve({ data: [pendingQuestion], error: null }).then(onfulfilled),
    };
    __mockClient.from.mockReturnValue(listQuery);

    const res = await request(app)
      .get('/api/questions/review-queue')
      .set('Authorization', 'Bearer reviewer-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
