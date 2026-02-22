// backend/src/db/supabase.ts
// Initializes and exports Supabase clients for the backend.
// The service-role client bypasses RLS (used for admin operations).
// Use createUserClient() to create a per-request client that respects RLS.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const anonKey = process.env.SUPABASE_ANON_KEY ?? '';

/**
 * Service-role Supabase client — bypasses RLS.
 * Use only for trusted backend operations (seeding, admin).
 */
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

/**
 * Creates a per-request Supabase client authenticated with the user's JWT.
 * This client respects RLS policies.
 */
export function createUserClient(accessToken: string) {
  return createClient(supabaseUrl, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}
