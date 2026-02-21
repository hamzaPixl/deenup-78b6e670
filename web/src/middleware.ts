// web/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const PROTECTED_PATHS = ['/dashboard', '/profile', '/match'];
const AUTH_PATHS = ['/login', '/signup'];

export async function middleware(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    { auth: { persistSession: false } }
  );

  // Check for session token in cookies
  const accessToken = req.cookies.get('sb-access-token')?.value;
  let isAuthenticated = false;

  if (accessToken) {
    const { data } = await supabase.auth.getUser(accessToken);
    isAuthenticated = !!data.user;
  }

  const isProtected = PROTECTED_PATHS.some((p) => req.nextUrl.pathname.startsWith(p));
  const isAuthPage = AUTH_PATHS.some((p) => req.nextUrl.pathname.startsWith(p));

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/match/:path*', '/login', '/signup'],
};
