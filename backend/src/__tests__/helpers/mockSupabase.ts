// backend/src/__tests__/helpers/mockSupabase.ts
// Shared Supabase mock factory consumed by all backend integration test files.
//
// USAGE — top of every test file (jest.mock is hoisted before imports):
//
//   jest.mock('../db/supabase', () =>
//     require('../__tests__/helpers/mockSupabase').createSupabaseMockModule()
//   );
//
// Then inside describe/beforeEach:
//   const { __mockClient, __mockQuery } = require('../db/supabase');
//   beforeEach(() => resetSupabaseMocks(__mockQuery, __mockClient));

/** The shape returned by the supabase module mock. */
export interface SupabaseMockModule {
  supabaseAdmin: MockClient;
  createUserClient: jest.Mock;
  __mockClient: MockClient;
  __mockQuery: MockQuery;
}

export interface MockQuery {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  in: jest.Mock;
  ilike: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  is: jest.Mock;
  not: jest.Mock;
  // Allows awaiting the query builder directly (without .single())
  then: jest.Mock;
}

export interface MockClient {
  from: jest.Mock;
  auth: { getUser: jest.Mock };
}

/**
 * Creates the jest.mock factory for `../db/supabase`.
 * Exposes `__mockClient` and `__mockQuery` on the mock module so tests can
 * access them via `require('../db/supabase')`.
 *
 * Call inside `jest.mock()` at the top of each test file:
 *   jest.mock('../db/supabase', () =>
 *     require('../__tests__/helpers/mockSupabase').createSupabaseMockModule()
 *   );
 */
export function createSupabaseMockModule(): SupabaseMockModule {
  const mockQuery: MockQuery = {
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
    then: jest.fn().mockImplementation((resolve: (v: unknown) => unknown) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
    ),
  };

  const mockClient: MockClient = {
    from: jest.fn().mockReturnValue(mockQuery),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  };

  return {
    supabaseAdmin: mockClient,
    createUserClient: jest.fn().mockReturnValue(mockClient),
    __mockClient: mockClient,
    __mockQuery: mockQuery,
  };
}

/**
 * Resets all mock methods to their initial "return this / resolve null" state.
 * Call in `beforeEach` to isolate tests from each other.
 */
export function resetSupabaseMocks(mockQuery: MockQuery, mockClient: MockClient): void {
  jest.clearAllMocks();
  mockClient.from.mockReturnValue(mockQuery);
  mockQuery.select.mockReturnThis();
  mockQuery.insert.mockReturnThis();
  mockQuery.update.mockReturnThis();
  mockQuery.delete.mockReturnThis();
  mockQuery.eq.mockReturnThis();
  mockQuery.neq.mockReturnThis();
  mockQuery.in.mockReturnThis();
  mockQuery.ilike.mockReturnThis();
  mockQuery.order.mockReturnThis();
  mockQuery.limit.mockReturnThis();
  mockQuery.is.mockReturnThis();
  mockQuery.not.mockReturnThis();
  mockQuery.single.mockResolvedValue({ data: null, error: null });
  mockQuery.maybeSingle.mockResolvedValue({ data: null, error: null });
  mockQuery.then.mockImplementation((resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
  );
}

/**
 * Convenience helper to mock a Supabase-authenticated user.
 */
export function mockAuthUser(
  mockClient: MockClient,
  id: string,
  email: string,
  role: string,
): void {
  mockClient.auth.getUser.mockResolvedValue({
    data: { user: { id, email, app_metadata: { role } } },
    error: null,
  });
}
