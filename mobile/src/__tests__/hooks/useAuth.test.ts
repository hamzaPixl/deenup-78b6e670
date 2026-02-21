// mobile/src/__tests__/hooks/useAuth.test.ts
// useAuth is a re-export of useAuthContext.
// The moduleNameMapper in jest.config.js provides a mock supabase client
// so this test can import the module without env-var errors.

describe('useAuth hook', () => {
  it('should export useAuth as a function that matches useAuthContext', () => {
    const { useAuth } = require('../../hooks/useAuth');
    const { useAuthContext } = require('../../contexts/AuthContext');
    expect(useAuth).toBe(useAuthContext);
  });
});
