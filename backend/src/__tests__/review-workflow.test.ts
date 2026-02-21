// backend/src/__tests__/review-workflow.test.ts
// Integration tests for question review workflow routes.

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

// ── Tests ─────────────────────────────────────────────────────────────────

describe('POST /api/questions/:id/submit-review', () => {
  beforeEach(() => resetSupabaseMocks(__mockQuery, __mockClient));

  it('transitions draft to pending_review — returns 200', async () => {
    mockAuthUser(__mockClient, CREATOR_ID, 'creator@deenup.com', 'moderator');

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
    mockAuthUser(__mockClient, CREATOR_ID, 'creator@deenup.com', 'moderator');

    __mockQuery.single.mockResolvedValueOnce({ data: pendingQuestion, error: null });

    const res = await request(app)
      .post('/api/questions/q-draft-1/submit-review')
      .set('Authorization', 'Bearer creator-token');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });
});

describe('POST /api/questions/:id/approve', () => {
  beforeEach(() => resetSupabaseMocks(__mockQuery, __mockClient));

  it('approves a pending_review question by a different reviewer — returns 200', async () => {
    mockAuthUser(__mockClient, REVIEWER_ID, 'reviewer@deenup.com', 'moderator');

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
    mockAuthUser(__mockClient, CREATOR_ID, 'creator@deenup.com', 'moderator');

    __mockQuery.single.mockResolvedValueOnce({ data: pendingQuestion, error: null });

    const res = await request(app)
      .post('/api/questions/q-draft-1/approve')
      .set('Authorization', 'Bearer creator-token');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('SELF_REVIEW_FORBIDDEN');
  });
});

describe('POST /api/questions/:id/reject', () => {
  beforeEach(() => resetSupabaseMocks(__mockQuery, __mockClient));

  it('rejects a pending_review question with notes — returns 200', async () => {
    mockAuthUser(__mockClient, REVIEWER_ID, 'reviewer@deenup.com', 'moderator');

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
    mockAuthUser(__mockClient, REVIEWER_ID, 'reviewer@deenup.com', 'moderator');

    const res = await request(app)
      .post('/api/questions/q-draft-1/reject')
      .set('Authorization', 'Bearer reviewer-token')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/questions/review-queue', () => {
  beforeEach(() => resetSupabaseMocks(__mockQuery, __mockClient));

  it('returns 200 with queue for moderator', async () => {
    mockAuthUser(__mockClient, REVIEWER_ID, 'reviewer@deenup.com', 'moderator');

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
