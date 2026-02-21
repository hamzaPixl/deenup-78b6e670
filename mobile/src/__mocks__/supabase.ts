// mobile/src/__mocks__/supabase.ts
// Manual mock for @supabase/supabase-js client used in mobile tests.
// Prevents "supabaseUrl is required" errors when tests import AuthContext.
export const supabase = {
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
    setSession: jest.fn().mockResolvedValue({ data: {}, error: null }),
    getUser: jest.fn(),
  },
};
