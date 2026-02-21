// backend/src/__tests__/helpers/mockSupabase.ts
// Provides a chainable Supabase mock for unit/integration tests.
// Never hits a real database.

export type MockSupabaseResult = {
  data: unknown;
  error: { message: string; code?: string } | null;
};

type ChainableQuery = {
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
  range: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  lte: jest.Mock;
  gte: jest.Mock;
  lt: jest.Mock;
  gt: jest.Mock;
  is: jest.Mock;
  not: jest.Mock;
  returns: jest.Mock;
  _result: MockSupabaseResult;
  _setResult: (result: MockSupabaseResult) => void;
};

/**
 * Creates a chainable Supabase query mock.
 * By default all queries resolve to { data: null, error: null }.
 * Call `query._setResult(...)` to control the returned value.
 */
export function createChainableQuery(
  initialResult: MockSupabaseResult = { data: null, error: null },
): ChainableQuery {
  const query: ChainableQuery = {
    _result: initialResult,
    _setResult(result: MockSupabaseResult) {
      this._result = result;
    },
  } as ChainableQuery;

  // All chainable methods return `this` by default (for filter chaining).
  // Terminal methods (single, maybeSingle) return the result.
  const returnsSelf = jest.fn().mockImplementation(() => query);
  const returnsResult = jest.fn().mockImplementation(async () => query._result);

  query.select = returnsSelf;
  query.insert = returnsSelf;
  query.update = returnsSelf;
  query.delete = returnsSelf;
  query.eq = returnsSelf;
  query.neq = returnsSelf;
  query.in = returnsSelf;
  query.ilike = returnsSelf;
  query.order = returnsSelf;
  query.limit = returnsSelf;
  query.range = returnsSelf;
  query.lte = returnsSelf;
  query.gte = returnsSelf;
  query.lt = returnsSelf;
  query.gt = returnsSelf;
  query.is = returnsSelf;
  query.not = returnsSelf;
  query.returns = returnsSelf;
  query.single = returnsResult;
  query.maybeSingle = returnsResult;

  // Make the query itself awaitable (for queries without .single())
  (query as unknown as Promise<MockSupabaseResult>).then = (
    onfulfilled?: ((value: MockSupabaseResult) => unknown) | null,
  ) => Promise.resolve(query._result).then(onfulfilled);

  return query;
}

/**
 * Creates a minimal Supabase client mock.
 * The `.from()` method returns a chainable query.
 */
export function createMockSupabaseClient(defaultResult: MockSupabaseResult = { data: null, error: null }) {
  const query = createChainableQuery(defaultResult);

  const client = {
    from: jest.fn().mockReturnValue(query),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    _query: query, // expose so tests can configure results
  };

  return client;
}

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;
