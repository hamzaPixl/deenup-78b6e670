// mobile/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, AuthSession } from '@deenup/shared';
import { supabase } from '../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

interface AuthContextValue {
  user: User | null;
  session: AuthSession | null;
  isLoading: boolean;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
}

interface AuthApiResponse {
  session: AuthSession;
  error?: { code: string; message: string };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = (await res.json()) as { user: User };
        setUser(data.user);
      }
    } catch {
      // Silently fail — user will need to re-authenticate
    }
  }, []);

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        fetchMe(data.session.access_token).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth state changes (token refresh, OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, supaSession) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        } else if (supaSession && event === 'TOKEN_REFRESHED') {
          await fetchMe(supaSession.access_token);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchMe]);

  const signup = useCallback(async (email: string, password: string, displayName: string) => {
    const res = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });
    const data = (await res.json()) as AuthApiResponse;
    if (!res.ok) throw data.error;
    setSession(data.session);
    setUser(data.session.user);

    // Also set session in Supabase client for token auto-refresh
    await supabase.auth.setSession({
      access_token: data.session.accessToken,
      refresh_token: data.session.refreshToken,
    });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json()) as AuthApiResponse;
    if (!res.ok) throw data.error;
    setSession(data.session);
    setUser(data.session.user);

    await supabase.auth.setSession({
      access_token: data.session.accessToken,
      refresh_token: data.session.refreshToken,
    });
  }, []);

  const logout = useCallback(async () => {
    const token = session?.accessToken;
    if (token) {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, [session]);

  const requestPasswordReset = useCallback(async (email: string) => {
    await fetch(`${API_URL}/api/auth/password-reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    // Always succeeds from user perspective — prevents enumeration
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, isLoading, signup, login, logout, requestPasswordReset }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
}
