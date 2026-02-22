// backend/src/__tests__/report-routes.test.ts
// Integration tests for report routes.

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

const QUESTION_ID = 'q-report-test';
const USER_ID = 'user-player-1';
const REPORT_ID = 'report-1';

const dbQuestion = {
  id: QUESTION_ID,
  status: 'approved',
};

const dbReport = {
  id: REPORT_ID,
  question_id: QUESTION_ID,
  reported_by: USER_ID,
  reason: 'inaccurate',
  description: 'This answer is wrong.',
  resolved: false,
  resolved_by: null,
  resolved_at: null,
  created_at: '2026-01-01T00:00:00Z',
};

// ── Tests: POST /api/questions/:id/report ─────────────────────────────────

describe('POST /api/questions/:id/report', () => {
  beforeEach(() => resetSupabaseMocks(__mockQuery, __mockClient));

  it('authenticated player can report a question — returns 201', async () => {
    mockAuthUser(__mockClient, USER_ID, 'player@deenup.com', 'player');

    // Call 1: check question exists → returns question
    // Call 2: insert report → returns report
    // Call 3: count unresolved reports
    __mockClient.from.mockImplementation((table: string) => {
      if (table === 'question_reports') {
        // Create a separate mock for reports table
        const reportQuery = {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: dbReport, error: null }),
          // For count query
          then: (onfulfilled: (v: { count: number; error: null }) => void) =>
            Promise.resolve({ data: [], count: 1, error: null }).then(onfulfilled),
        };
        return reportQuery;
      }
      // 'questions' table
      __mockQuery.single.mockResolvedValue({ data: dbQuestion, error: null });
      return __mockQuery;
    });

    const res = await request(app)
      .post(`/api/questions/${QUESTION_ID}/report`)
      .set('Authorization', 'Bearer player-token')
      .send({ reason: 'inaccurate', description: 'This answer is wrong.' });

    expect(res.status).toBe(201);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.reason).toBe('inaccurate');
  });

  it('returns 400 when reason is missing', async () => {
    mockAuthUser(__mockClient, USER_ID, 'player@deenup.com', 'player');

    const res = await request(app)
      .post(`/api/questions/${QUESTION_ID}/report`)
      .set('Authorization', 'Bearer player-token')
      .send({ description: 'Some description' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app)
      .post(`/api/questions/${QUESTION_ID}/report`)
      .send({ reason: 'inaccurate' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});

// ── Tests: GET /api/reports ────────────────────────────────────────────────

describe('GET /api/reports', () => {
  beforeEach(() => resetSupabaseMocks(__mockQuery, __mockClient));

  it('admin can list reports — returns 200', async () => {
    mockAuthUser(__mockClient, 'admin-user-1', 'admin@deenup.com', 'admin');

    const listQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: (onfulfilled: (v: { data: unknown[]; error: null }) => void) =>
        Promise.resolve({ data: [dbReport], error: null }).then(onfulfilled),
    };
    __mockClient.from.mockReturnValue(listQuery);

    const res = await request(app)
      .get('/api/reports')
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('player cannot list reports — returns 403', async () => {
    mockAuthUser(__mockClient, USER_ID, 'player@deenup.com', 'player');

    const res = await request(app)
      .get('/api/reports')
      .set('Authorization', 'Bearer player-token');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});

// ── Tests: PUT /api/reports/:id/resolve ───────────────────────────────────

describe('PUT /api/reports/:id/resolve', () => {
  beforeEach(() => resetSupabaseMocks(__mockQuery, __mockClient));

  it('admin can resolve a report — returns 200', async () => {
    mockAuthUser(__mockClient, 'admin-user-1', 'admin@deenup.com', 'admin');

    const unresolvedReport = { ...dbReport, resolved: false };
    const resolvedReport = {
      ...dbReport,
      resolved: true,
      resolved_by: 'admin-user-1',
      resolved_at: '2026-01-02T00:00:00Z',
    };

    __mockQuery.single
      .mockResolvedValueOnce({ data: unresolvedReport, error: null })
      .mockResolvedValueOnce({ data: resolvedReport, error: null });

    const res = await request(app)
      .put(`/api/reports/${REPORT_ID}/resolve`)
      .set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body.data.resolved).toBe(true);
  });

  it('non-admin/moderator cannot resolve report — returns 403', async () => {
    mockAuthUser(__mockClient, USER_ID, 'player@deenup.com', 'player');

    const res = await request(app)
      .put(`/api/reports/${REPORT_ID}/resolve`)
      .set('Authorization', 'Bearer player-token');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });
});
