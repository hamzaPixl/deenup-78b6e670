// web/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Guard: only create client when env vars are configured
export const supabase = SUPABASE_URL
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    })
  : null;

/**
 * Browser Supabase client for use in Client Components.
 * Reads session from cookies automatically.
 */
export function createBrowserSupabaseClient() {
  return createClientComponentClient({
    supabaseUrl: SUPABASE_URL,
    supabaseKey: SUPABASE_ANON_KEY,
  });
}

/**
 * Get the current session access token (for API requests).
 * Returns null if not authenticated.
 */
export async function getAccessToken(): Promise<string | null> {
  const client = createBrowserSupabaseClient();
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}
