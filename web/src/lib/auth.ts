// web/src/lib/auth.ts
import { AuthSession } from '@deenup/shared';
import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiCall<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw data.error;
  return data;
}

export const authApi = {
  async signup(email: string, password: string, displayName: string) {
    const result = await apiCall<{ session: AuthSession }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    });
    await supabase.auth.setSession({
      access_token: result.session.accessToken,
      refresh_token: result.session.refreshToken,
    });
    return result;
  },

  async login(email: string, password: string) {
    const result = await apiCall<{ session: AuthSession }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await supabase.auth.setSession({
      access_token: result.session.accessToken,
      refresh_token: result.session.refreshToken,
    });
    return result;
  },

  async logout() {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await apiCall('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${data.session.access_token}` },
      }).catch(() => {});
    }
    await supabase.auth.signOut();
  },

  async requestPasswordReset(email: string) {
    await apiCall('/api/auth/password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};
