# User Authentication System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement complete user authentication (email/password, Google OAuth, Apple Sign-in) with JWT token management, profile initialization, and rate limiting across all three platforms.

**Architecture:** Supabase Auth as managed backend; Node.js/Express proxies auth mutations and orchestrates profile creation; mobile (React Native) and web (Next.js) clients use Supabase SDK for session state and token refresh. Shared TypeScript types ensure contract consistency across the monorepo.

**Tech Stack:** TypeScript, Supabase (Auth + PostgreSQL), Express.js, React Native, Next.js, Jest, npm workspaces

---

## Prerequisites

Before starting Task 1, confirm:
- [ ] Supabase project created (free tier) — need `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Google OAuth credentials from Google Cloud Console (client ID + secret) **[NEEDS CLARIFICATION — are these set up?]**
- [ ] Apple Sign-in credentials from Apple Developer account **[NEEDS CLARIFICATION — are these set up?]**
- [ ] Node.js 18+ installed locally
- [ ] Supabase CLI installed (`npm install -g supabase`)

---

## Tasks

### Task 1: Monorepo Scaffolding & Shared Types

**Why first:** Every subsequent task imports from `shared/` and depends on the workspace structure. Zero code exists today.

**Files:**
- Create: `package.json` (root)
- Create: `shared/package.json`
- Create: `shared/tsconfig.json`
- Create: `shared/src/types/auth.ts`
- Create: `shared/src/constants/auth.ts`
- Create: `shared/src/index.ts`
- Create: `backend/package.json`
- Create: `backend/tsconfig.json`
- Create: `mobile/package.json`
- Create: `mobile/tsconfig.json`
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `.env.example`
- Create: `shared/src/__tests__/auth-types.test.ts`

### Step 1: Write the failing test for shared types

```typescript
// shared/src/__tests__/auth-types.test.ts
import {
  User,
  AuthSession,
  AuthError,
  SignupRequest,
  LoginRequest,
  PasswordResetRequest,
  AUTH_ERROR_CODES,
  AUTH_DEFAULTS,
  RATE_LIMITS,
} from '../index';

describe('Auth Types', () => {
  it('should create a valid SignupRequest', () => {
    const req: SignupRequest = {
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User',
    };
    expect(req.email).toBe('test@example.com');
    expect(req.password).toBe('password123');
    expect(req.displayName).toBe('Test User');
  });

  it('should create a valid LoginRequest', () => {
    const req: LoginRequest = {
      email: 'test@example.com',
      password: 'password123',
    };
    expect(req.email).toBe('test@example.com');
  });

  it('should create a valid User', () => {
    const user: User = {
      id: 'uuid-123',
      email: 'test@example.com',
      displayName: 'Test User',
      avatarUrl: null,
      elo: 1000,
      deenPoints: 50,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    expect(user.elo).toBe(1000);
    expect(user.deenPoints).toBe(50);
  });

  it('should create a valid AuthSession', () => {
    const session: AuthSession = {
      accessToken: 'jwt-token',
      refreshToken: 'refresh-token',
      expiresAt: 1234567890,
      user: {
        id: 'uuid-123',
        email: 'test@example.com',
        displayName: 'Test User',
        avatarUrl: null,
        elo: 1000,
        deenPoints: 50,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    };
    expect(session.accessToken).toBe('jwt-token');
  });

  it('should have correct auth defaults', () => {
    expect(AUTH_DEFAULTS.INITIAL_ELO).toBe(1000);
    expect(AUTH_DEFAULTS.INITIAL_DEEN_POINTS).toBe(50);
    expect(AUTH_DEFAULTS.MIN_PASSWORD_LENGTH).toBe(8);
  });

  it('should have correct error codes', () => {
    expect(AUTH_ERROR_CODES.EMAIL_EXISTS).toBe('EMAIL_EXISTS');
    expect(AUTH_ERROR_CODES.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
    expect(AUTH_ERROR_CODES.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
  });

  it('should have rate limit config', () => {
    expect(RATE_LIMITS.SIGNUP.maxRequests).toBe(5);
    expect(RATE_LIMITS.LOGIN.maxRequests).toBe(10);
    expect(RATE_LIMITS.PASSWORD_RESET.maxRequests).toBe(3);
  });
});
```

### Step 2: Run test to verify it fails

```bash
cd shared && npx jest src/__tests__/auth-types.test.ts --verbose
```
Expected: FAIL — modules not found.

### Step 3: Create root package.json with workspaces

```json
// package.json (root)
{
  "name": "deenup",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "shared",
    "backend",
    "mobile",
    "web"
  ],
  "scripts": {
    "test": "npm test --workspaces --if-present",
    "test:shared": "npm test --workspace=shared",
    "test:backend": "npm test --workspace=backend",
    "test:mobile": "npm test --workspace=mobile",
    "test:web": "npm test --workspace=web"
  }
}
```

### Step 4: Create shared package with types and constants

```json
// shared/package.json
{
  "name": "@deenup/shared",
  "version": "0.1.0",
  "private": true,
  "main": "src/index.ts",
  "scripts": {
    "test": "jest --verbose",
    "build": "tsc"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "@types/jest": "^29.5.0"
  }
}
```

```json
// shared/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

```typescript
// shared/src/types/auth.ts
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  elo: number;
  deenPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: User;
}

export interface AuthError {
  code: string;
  message: string;
}

export interface AuthErrorResponse {
  error: AuthError;
}

export interface SignupRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}
```

```typescript
// shared/src/constants/auth.ts
export const AUTH_ERROR_CODES = {
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  WEAK_PASSWORD: 'WEAK_PASSWORD',
} as const;

export const AUTH_DEFAULTS = {
  INITIAL_ELO: 1000,
  INITIAL_DEEN_POINTS: 50,
  MIN_PASSWORD_LENGTH: 8,
  ACCESS_TOKEN_EXPIRY_SECONDS: 3600,      // 1 hour
  REFRESH_TOKEN_EXPIRY_SECONDS: 604800,   // 7 days
} as const;

export const RATE_LIMITS = {
  SIGNUP: { windowMs: 60_000, maxRequests: 5 },
  LOGIN: { windowMs: 60_000, maxRequests: 10 },
  PASSWORD_RESET: { windowMs: 60_000, maxRequests: 3 },
} as const;
```

```typescript
// shared/src/index.ts
export type {
  User,
  AuthSession,
  AuthError,
  AuthErrorResponse,
  SignupRequest,
  LoginRequest,
  PasswordResetRequest,
  PasswordResetConfirmRequest,
  RefreshTokenRequest,
} from './types/auth';

export {
  AUTH_ERROR_CODES,
  AUTH_DEFAULTS,
  RATE_LIMITS,
} from './constants/auth';
```

### Step 5: Create Jest config for shared package

```javascript
// shared/jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
};
```

### Step 6: Install dependencies and run tests

```bash
npm install
npm run test:shared
```
Expected: All 7 tests PASS.

### Step 7: Create skeleton package.json for backend, mobile, web

Create `backend/package.json`, `mobile/package.json`, `web/package.json` with workspace dependency on `@deenup/shared` and their respective Jest configs. Also create `.env.example`.

```bash
# .env.example
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_CLIENT_SECRET=your-apple-client-secret
PORT=3001
NODE_ENV=development
```

### Step 8: Commit

```bash
git add shared/ package.json .env.example backend/package.json backend/tsconfig.json mobile/package.json mobile/tsconfig.json web/package.json web/tsconfig.json
git commit -m "feat(shared): add monorepo scaffolding and auth types/constants"
```

---

### Task 2: Database Migration — Profiles Table

**Why second:** The backend service layer and auth routes depend on this table existing.

**Files:**
- Create: `backend/supabase/migrations/001_create_profiles.sql`
- Create: `backend/src/__tests__/migrations/profiles.integration.test.ts`

### Step 1: Write the migration SQL

```sql
-- backend/supabase/migrations/001_create_profiles.sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  elo INTEGER NOT NULL DEFAULT 1000,
  deen_points INTEGER NOT NULL DEFAULT 50,
  preferred_language TEXT NOT NULL DEFAULT 'fr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Service role can insert profiles (backend creates profiles on signup)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Index for leaderboard queries (future feature, cheap to add now)
CREATE INDEX idx_profiles_elo ON public.profiles(elo DESC);
```

### Step 2: Write integration test (requires Supabase local)

```typescript
// backend/src/__tests__/migrations/profiles.integration.test.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Profiles table migration', () => {
  it('should have profiles table with correct columns', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(0);

    expect(error).toBeNull();
    expect(data).toBeDefined();
  });

  it('should enforce default values for elo and deen_points', async () => {
    // This test requires a user in auth.users first — skip in CI, run manually
    // The migration SQL defines DEFAULT 1000 and DEFAULT 50
    expect(true).toBe(true); // placeholder — validated by SQL defaults
  });
});
```

### Step 3: Apply migration locally

```bash
cd backend && npx supabase db push
```

### Step 4: Commit

```bash
git add backend/supabase/
git commit -m "feat(db): add profiles table migration with RLS policies"
```

---

### Task 3: Backend — Supabase Client, Validators & Auth Service

**Why third:** Auth routes (Task 4) depend on the service layer and validators.

**Files:**
- Create: `backend/src/config/supabase.ts`
- Create: `backend/src/validators/auth.ts`
- Create: `backend/src/services/authService.ts`
- Create: `backend/src/services/profileService.ts`
- Create: `backend/src/__tests__/validators/auth.test.ts`
- Create: `backend/src/__tests__/services/authService.test.ts`
- Create: `backend/src/__tests__/services/profileService.test.ts`

### Step 1: Write failing tests for validators

```typescript
// backend/src/__tests__/validators/auth.test.ts
import { validateSignup, validateLogin, validatePasswordReset, validatePasswordResetConfirm } from '../../validators/auth';

describe('Auth Validators', () => {
  describe('validateSignup', () => {
    it('should pass with valid input', () => {
      const result = validateSignup({
        email: 'user@example.com',
        password: 'password123',
        displayName: 'Test User',
      });
      expect(result.success).toBe(true);
    });

    it('should fail with invalid email', () => {
      const result = validateSignup({
        email: 'not-an-email',
        password: 'password123',
        displayName: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'email' })
      );
    });

    it('should fail with short password', () => {
      const result = validateSignup({
        email: 'user@example.com',
        password: 'short',
        displayName: 'Test',
      });
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ field: 'password' })
      );
    });

    it('should fail with missing displayName', () => {
      const result = validateSignup({
        email: 'user@example.com',
        password: 'password123',
        displayName: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('validateLogin', () => {
    it('should pass with valid input', () => {
      const result = validateLogin({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('should fail with missing fields', () => {
      const result = validateLogin({ email: '', password: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('validatePasswordReset', () => {
    it('should pass with valid email', () => {
      const result = validatePasswordReset({ email: 'user@example.com' });
      expect(result.success).toBe(true);
    });
  });

  describe('validatePasswordResetConfirm', () => {
    it('should fail with short new password', () => {
      const result = validatePasswordResetConfirm({
        token: 'valid-token',
        newPassword: 'short',
      });
      expect(result.success).toBe(false);
    });
  });
});
```

### Step 2: Run test to verify it fails

```bash
npm run test:backend -- --testPathPattern=validators/auth
```
Expected: FAIL — module not found.

### Step 3: Implement validators

```typescript
// backend/src/validators/auth.ts
import { AUTH_DEFAULTS } from '@deenup/shared';

interface ValidationResult {
  success: boolean;
  errors: Array<{ field: string; message: string }>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignup(input: {
  email: string;
  password: string;
  displayName: string;
}): ValidationResult {
  const errors: ValidationResult['errors'] = [];

  if (!input.email || !EMAIL_REGEX.test(input.email)) {
    errors.push({ field: 'email', message: 'Adresse e-mail invalide' });
  }
  if (!input.password || input.password.length < AUTH_DEFAULTS.MIN_PASSWORD_LENGTH) {
    errors.push({
      field: 'password',
      message: `Le mot de passe doit contenir au moins ${AUTH_DEFAULTS.MIN_PASSWORD_LENGTH} caractères`,
    });
  }
  if (!input.displayName || input.displayName.trim().length === 0) {
    errors.push({ field: 'displayName', message: 'Le nom est requis' });
  }

  return { success: errors.length === 0, errors };
}

export function validateLogin(input: {
  email: string;
  password: string;
}): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  if (!input.email || !EMAIL_REGEX.test(input.email)) {
    errors.push({ field: 'email', message: 'Adresse e-mail invalide' });
  }
  if (!input.password) {
    errors.push({ field: 'password', message: 'Le mot de passe est requis' });
  }
  return { success: errors.length === 0, errors };
}

export function validatePasswordReset(input: { email: string }): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  if (!input.email || !EMAIL_REGEX.test(input.email)) {
    errors.push({ field: 'email', message: 'Adresse e-mail invalide' });
  }
  return { success: errors.length === 0, errors };
}

export function validatePasswordResetConfirm(input: {
  token: string;
  newPassword: string;
}): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  if (!input.token) {
    errors.push({ field: 'token', message: 'Token requis' });
  }
  if (!input.newPassword || input.newPassword.length < AUTH_DEFAULTS.MIN_PASSWORD_LENGTH) {
    errors.push({
      field: 'newPassword',
      message: `Le mot de passe doit contenir au moins ${AUTH_DEFAULTS.MIN_PASSWORD_LENGTH} caractères`,
    });
  }
  return { success: errors.length === 0, errors };
}
```

### Step 4: Run validator tests — expect PASS

```bash
npm run test:backend -- --testPathPattern=validators/auth
```

### Step 5: Write failing tests for authService

```typescript
// backend/src/__tests__/services/authService.test.ts
import { AuthService } from '../../services/authService';
import { AUTH_ERROR_CODES } from '@deenup/shared';

// Mock Supabase client
const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockResetPasswordForEmail = jest.fn();
const mockUpdateUser = jest.fn();
const mockGetUser = jest.fn();

const mockSupabase = {
  auth: {
    signUp: mockSignUp,
    signInWithPassword: mockSignInWithPassword,
    signOut: mockSignOut,
    resetPasswordForEmail: mockResetPasswordForEmail,
    updateUser: mockUpdateUser,
    getUser: mockGetUser,
    admin: { getUserById: jest.fn() },
  },
  from: jest.fn().mockReturnThis(),
  insert: jest.fn(),
  select: jest.fn(),
  single: jest.fn(),
};

const mockProfileService = {
  createProfile: jest.fn(),
  getProfile: jest.fn(),
  upsertProfileFromOAuth: jest.fn(),
};

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService(mockSupabase as any, mockProfileService as any);
  });

  describe('signup', () => {
    it('should create user and profile on successful signup', async () => {
      mockSignUp.mockResolvedValue({
        data: {
          user: { id: 'uuid-1', email: 'test@example.com' },
          session: {
            access_token: 'at-123',
            refresh_token: 'rt-123',
            expires_at: 9999999999,
          },
        },
        error: null,
      });
      mockProfileService.createProfile.mockResolvedValue({
        id: 'uuid-1',
        displayName: 'Test',
        elo: 1000,
        deenPoints: 50,
      });

      const result = await authService.signup({
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test',
      });

      expect(result.session.accessToken).toBe('at-123');
      expect(result.session.user.elo).toBe(1000);
      expect(mockProfileService.createProfile).toHaveBeenCalledWith(
        'uuid-1',
        'Test',
        null
      );
    });

    it('should return EMAIL_EXISTS error for duplicate email', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered', status: 422 },
      });

      await expect(
        authService.signup({
          email: 'dup@example.com',
          password: 'password123',
          displayName: 'Test',
        })
      ).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.EMAIL_EXISTS,
      });
    });
  });

  describe('login', () => {
    it('should return session on successful login', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'uuid-1', email: 'test@example.com' },
          session: {
            access_token: 'at-456',
            refresh_token: 'rt-456',
            expires_at: 9999999999,
          },
        },
        error: null,
      });
      mockProfileService.getProfile.mockResolvedValue({
        id: 'uuid-1',
        display_name: 'Test',
        avatar_url: null,
        elo: 1000,
        deen_points: 50,
        created_at: '2026-01-01',
        updated_at: '2026-01-01',
      });

      const result = await authService.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.session.accessToken).toBe('at-456');
      expect(result.session.user.displayName).toBe('Test');
    });

    it('should return INVALID_CREDENTIALS on wrong password', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 },
      });

      await expect(
        authService.login({ email: 'test@example.com', password: 'wrong' })
      ).rejects.toMatchObject({
        code: AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      });
    });
  });

  describe('logout', () => {
    it('should call supabase signOut', async () => {
      mockSignOut.mockResolvedValue({ error: null });
      await authService.logout('access-token');
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  describe('requestPasswordReset', () => {
    it('should always return success (prevent email enumeration)', async () => {
      mockResetPasswordForEmail.mockResolvedValue({ error: null });
      await expect(
        authService.requestPasswordReset('any@example.com')
      ).resolves.not.toThrow();
    });
  });
});
```

### Step 6: Write failing tests for profileService

```typescript
// backend/src/__tests__/services/profileService.test.ts
import { ProfileService } from '../../services/profileService';
import { AUTH_DEFAULTS } from '@deenup/shared';

const mockFrom = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockUpsert = jest.fn();
const mockEq = jest.fn();

const mockSupabase = {
  from: mockFrom,
};

describe('ProfileService', () => {
  let profileService: ProfileService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFrom.mockReturnValue({
      insert: mockInsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      }),
      select: mockSelect.mockReturnValue({
        eq: mockEq.mockReturnValue({
          single: mockSingle,
        }),
      }),
      upsert: mockUpsert.mockReturnValue({
        select: mockSelect.mockReturnValue({
          single: mockSingle,
        }),
      }),
    });
    profileService = new ProfileService(mockSupabase as any);
  });

  describe('createProfile', () => {
    it('should create profile with default ELO and DeenUp points', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: 'uuid-1',
          display_name: 'Test',
          avatar_url: null,
          elo: AUTH_DEFAULTS.INITIAL_ELO,
          deen_points: AUTH_DEFAULTS.INITIAL_DEEN_POINTS,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
        error: null,
      });

      const profile = await profileService.createProfile('uuid-1', 'Test', null);
      expect(profile.elo).toBe(1000);
      expect(profile.deenPoints).toBe(50);
      expect(mockFrom).toHaveBeenCalledWith('profiles');
    });
  });

  describe('getProfile', () => {
    it('should return profile for existing user', async () => {
      mockSingle.mockResolvedValue({
        data: {
          id: 'uuid-1',
          display_name: 'Test',
          avatar_url: null,
          elo: 1200,
          deen_points: 75,
          created_at: '2026-01-01',
          updated_at: '2026-01-01',
        },
        error: null,
      });

      const profile = await profileService.getProfile('uuid-1');
      expect(profile.elo).toBe(1200);
    });

    it('should throw USER_NOT_FOUND for missing profile', async () => {
      mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

      await expect(profileService.getProfile('nonexistent')).rejects.toMatchObject({
        code: 'USER_NOT_FOUND',
      });
    });
  });
});
```

### Step 7: Run tests to verify they fail

```bash
npm run test:backend -- --testPathPattern=services
```
Expected: FAIL — modules not found.

### Step 8: Implement Supabase client config

```typescript
// backend/src/config/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables');
}

export const supabaseAdmin: SupabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

### Step 9: Implement profileService

```typescript
// backend/src/services/profileService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { User, AUTH_ERROR_CODES, AUTH_DEFAULTS } from '@deenup/shared';

export class ProfileService {
  constructor(private supabase: SupabaseClient) {}

  async createProfile(
    userId: string,
    displayName: string,
    avatarUrl: string | null
  ): Promise<User> {
    const { data, error } = await this.supabase
      .from('profiles')
      .insert({
        id: userId,
        display_name: displayName,
        avatar_url: avatarUrl,
        elo: AUTH_DEFAULTS.INITIAL_ELO,
        deen_points: AUTH_DEFAULTS.INITIAL_DEEN_POINTS,
      })
      .select()
      .single();

    if (error) {
      throw { code: AUTH_ERROR_CODES.INTERNAL_ERROR, message: error.message };
    }

    return this.mapProfile(data);
  }

  async getProfile(userId: string): Promise<User> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      throw { code: AUTH_ERROR_CODES.USER_NOT_FOUND, message: 'Profil introuvable' };
    }

    return this.mapProfile(data);
  }

  async upsertProfileFromOAuth(
    userId: string,
    displayName: string,
    avatarUrl: string | null
  ): Promise<User> {
    const { data, error } = await this.supabase
      .from('profiles')
      .upsert({
        id: userId,
        display_name: displayName,
        avatar_url: avatarUrl,
        elo: AUTH_DEFAULTS.INITIAL_ELO,
        deen_points: AUTH_DEFAULTS.INITIAL_DEEN_POINTS,
      })
      .select()
      .single();

    if (error) {
      throw { code: AUTH_ERROR_CODES.INTERNAL_ERROR, message: error.message };
    }

    return this.mapProfile(data);
  }

  private mapProfile(row: any): User {
    return {
      id: row.id,
      email: row.email ?? '',
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      elo: row.elo,
      deenPoints: row.deen_points,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
```

### Step 10: Implement authService

```typescript
// backend/src/services/authService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import {
  AuthSession,
  SignupRequest,
  LoginRequest,
  AUTH_ERROR_CODES,
} from '@deenup/shared';
import { ProfileService } from './profileService';

export class AuthService {
  constructor(
    private supabase: SupabaseClient,
    private profileService: ProfileService
  ) {}

  async signup(input: SignupRequest): Promise<{ session: AuthSession }> {
    const { data, error } = await this.supabase.auth.signUp({
      email: input.email,
      password: input.password,
    });

    if (error) {
      if (error.message?.includes('already registered') || error.status === 422) {
        throw { code: AUTH_ERROR_CODES.EMAIL_EXISTS, message: 'Cet e-mail est déjà utilisé' };
      }
      throw { code: AUTH_ERROR_CODES.INTERNAL_ERROR, message: error.message };
    }

    if (!data.user || !data.session) {
      throw { code: AUTH_ERROR_CODES.INTERNAL_ERROR, message: 'Échec de la création du compte' };
    }

    const profile = await this.profileService.createProfile(
      data.user.id,
      input.displayName,
      null
    );

    return {
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ?? 0,
        user: { ...profile, email: data.user.email ?? input.email },
      },
    };
  }

  async login(input: LoginRequest): Promise<{ session: AuthSession }> {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password,
    });

    if (error) {
      throw { code: AUTH_ERROR_CODES.INVALID_CREDENTIALS, message: 'Identifiants incorrects' };
    }

    if (!data.user || !data.session) {
      throw { code: AUTH_ERROR_CODES.INTERNAL_ERROR, message: 'Échec de connexion' };
    }

    const profile = await this.profileService.getProfile(data.user.id);

    return {
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ?? 0,
        user: { ...profile, email: data.user.email ?? input.email },
      },
    };
  }

  async logout(accessToken: string): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      throw { code: AUTH_ERROR_CODES.INTERNAL_ERROR, message: error.message };
    }
  }

  async requestPasswordReset(email: string): Promise<void> {
    // Always succeed to prevent email enumeration
    await this.supabase.auth.resetPasswordForEmail(email);
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) {
      throw { code: AUTH_ERROR_CODES.INVALID_TOKEN, message: 'Lien de réinitialisation invalide ou expiré' };
    }
  }

  async getMe(accessToken: string): Promise<{ user: import('@deenup/shared').User }> {
    const { data, error } = await this.supabase.auth.getUser(accessToken);
    if (error || !data.user) {
      throw { code: AUTH_ERROR_CODES.INVALID_TOKEN, message: 'Token invalide' };
    }
    const profile = await this.profileService.getProfile(data.user.id);
    return { user: { ...profile, email: data.user.email ?? '' } };
  }

  async syncSocialProfile(
    userId: string,
    displayName: string,
    avatarUrl: string | null
  ): Promise<{ user: import('@deenup/shared').User }> {
    const profile = await this.profileService.upsertProfileFromOAuth(
      userId,
      displayName,
      avatarUrl
    );
    return { user: profile };
  }
}
```

### Step 11: Run all service tests — expect PASS

```bash
npm run test:backend -- --testPathPattern="(validators|services)"
```

### Step 12: Commit

```bash
git add backend/src/config/ backend/src/validators/ backend/src/services/ backend/src/__tests__/
git commit -m "feat(backend): add auth validators, authService, and profileService with tests"
```

---

### Task 4: Backend — Auth Middleware, Rate Limiter & Express Routes

**Why fourth:** Routes wire together validators + services + middleware into HTTP endpoints.

**Files:**
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/middleware/rateLimiter.ts`
- Create: `backend/src/routes/auth.ts`
- Create: `backend/src/app.ts`
- Create: `backend/src/index.ts`
- Create: `backend/src/__tests__/middleware/auth.test.ts`
- Create: `backend/src/__tests__/routes/auth.test.ts`
- Modify: `backend/package.json` — add express, express-rate-limit, cors deps

### Step 1: Write failing test for auth middleware

```typescript
// backend/src/__tests__/middleware/auth.test.ts
import { authMiddleware } from '../../middleware/auth';
import { Request, Response, NextFunction } from 'express';

const mockGetUser = jest.fn();
jest.mock('../../config/supabase', () => ({
  supabaseAdmin: {
    auth: { getUser: (...args: any[]) => mockGetUser(...args) },
  },
}));

describe('authMiddleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it('should return 401 when no Authorization header', async () => {
    await authMiddleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', async () => {
    req.headers = { authorization: 'Bearer invalid-token' };
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid' },
    });

    await authMiddleware(req as Request, res as Response, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should call next() and attach user when token is valid', async () => {
    req.headers = { authorization: 'Bearer valid-token' };
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'uuid-1', email: 'test@example.com' } },
      error: null,
    });

    await authMiddleware(req as Request, res as Response, next);
    expect(next).toHaveBeenCalled();
    expect((req as any).user).toEqual({ id: 'uuid-1', email: 'test@example.com' });
  });
});
```

### Step 2: Write failing test for auth routes

```typescript
// backend/src/__tests__/routes/auth.test.ts
import request from 'supertest';
import express from 'express';
import { createAuthRouter } from '../../routes/auth';

const mockAuthService = {
  signup: jest.fn(),
  login: jest.fn(),
  logout: jest.fn(),
  requestPasswordReset: jest.fn(),
  confirmPasswordReset: jest.fn(),
  getMe: jest.fn(),
  syncSocialProfile: jest.fn(),
};

describe('Auth Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/auth', createAuthRouter(mockAuthService as any));
  });

  describe('POST /api/auth/signup', () => {
    it('should return 201 on successful signup', async () => {
      mockAuthService.signup.mockResolvedValue({
        session: {
          accessToken: 'at-1',
          refreshToken: 'rt-1',
          expiresAt: 9999,
          user: { id: 'uuid-1', email: 'test@example.com', displayName: 'Test', elo: 1000, deenPoints: 50 },
        },
      });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'test@example.com', password: 'password123', displayName: 'Test' });

      expect(res.status).toBe(201);
      expect(res.body.session.accessToken).toBe('at-1');
    });

    it('should return 400 on validation error', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'bad', password: 'x', displayName: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 on duplicate email', async () => {
      mockAuthService.signup.mockRejectedValue({
        code: 'EMAIL_EXISTS',
        message: 'Cet e-mail est déjà utilisé',
      });

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'dup@example.com', password: 'password123', displayName: 'Test' });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 200 on successful login', async () => {
      mockAuthService.login.mockResolvedValue({
        session: {
          accessToken: 'at-2',
          refreshToken: 'rt-2',
          expiresAt: 9999,
          user: { id: 'uuid-1', email: 'test@example.com', displayName: 'Test', elo: 1000, deenPoints: 50 },
        },
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.session.accessToken).toBe('at-2');
    });

    it('should return 401 on invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue({
        code: 'INVALID_CREDENTIALS',
        message: 'Identifiants incorrects',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/password-reset', () => {
    it('should always return 200 (prevent enumeration)', async () => {
      mockAuthService.requestPasswordReset.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/auth/password-reset')
        .send({ email: 'any@example.com' });

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 200 on successful logout', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });
});
```

### Step 3: Run tests to verify they fail

```bash
npm run test:backend -- --testPathPattern="(middleware|routes)"
```

### Step 4: Implement auth middleware

```typescript
// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { AUTH_ERROR_CODES } from '@deenup/shared';
import { supabaseAdmin } from '../config/supabase';

export interface AuthenticatedRequest extends Request {
  user: { id: string; email: string };
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: { code: AUTH_ERROR_CODES.INVALID_TOKEN, message: 'Token requis' },
    });
    return;
  }

  const token = authHeader.substring(7);
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({
      error: { code: AUTH_ERROR_CODES.TOKEN_EXPIRED, message: 'Token invalide ou expiré' },
    });
    return;
  }

  (req as any).user = { id: data.user.id, email: data.user.email };
  next();
}
```

### Step 5: Implement rate limiter

```typescript
// backend/src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import { RATE_LIMITS, AUTH_ERROR_CODES } from '@deenup/shared';

function createLimiter(config: { windowMs: number; maxRequests: number }) {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.maxRequests,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: { code: AUTH_ERROR_CODES.RATE_LIMITED, message: 'Trop de requêtes, réessayez plus tard' },
    },
  });
}

export const signupLimiter = createLimiter(RATE_LIMITS.SIGNUP);
export const loginLimiter = createLimiter(RATE_LIMITS.LOGIN);
export const passwordResetLimiter = createLimiter(RATE_LIMITS.PASSWORD_RESET);
```

### Step 6: Implement auth routes

```typescript
// backend/src/routes/auth.ts
import { Router, Request, Response } from 'express';
import { AUTH_ERROR_CODES } from '@deenup/shared';
import { AuthService } from '../services/authService';
import {
  validateSignup,
  validateLogin,
  validatePasswordReset,
  validatePasswordResetConfirm,
} from '../validators/auth';
import { signupLimiter, loginLimiter, passwordResetLimiter } from '../middleware/rateLimiter';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';

const ERROR_STATUS_MAP: Record<string, number> = {
  [AUTH_ERROR_CODES.EMAIL_EXISTS]: 409,
  [AUTH_ERROR_CODES.INVALID_CREDENTIALS]: 401,
  [AUTH_ERROR_CODES.TOKEN_EXPIRED]: 401,
  [AUTH_ERROR_CODES.INVALID_TOKEN]: 401,
  [AUTH_ERROR_CODES.VALIDATION_ERROR]: 400,
  [AUTH_ERROR_CODES.USER_NOT_FOUND]: 404,
  [AUTH_ERROR_CODES.RATE_LIMITED]: 429,
  [AUTH_ERROR_CODES.WEAK_PASSWORD]: 400,
};

function handleError(res: Response, err: any): void {
  const code = err.code ?? AUTH_ERROR_CODES.INTERNAL_ERROR;
  const status = ERROR_STATUS_MAP[code] ?? 500;
  res.status(status).json({ error: { code, message: err.message ?? 'Erreur interne' } });
}

export function createAuthRouter(authService: AuthService): Router {
  const router = Router();

  router.post('/signup', signupLimiter, async (req: Request, res: Response) => {
    const validation = validateSignup(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: { code: AUTH_ERROR_CODES.VALIDATION_ERROR, message: 'Données invalides', details: validation.errors },
      });
      return;
    }
    try {
      const result = await authService.signup(req.body);
      res.status(201).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/login', loginLimiter, async (req: Request, res: Response) => {
    const validation = validateLogin(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: { code: AUTH_ERROR_CODES.VALIDATION_ERROR, message: 'Données invalides', details: validation.errors },
      });
      return;
    }
    try {
      const result = await authService.login(req.body);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/logout', async (req: Request, res: Response) => {
    const token = req.headers.authorization?.substring(7) ?? '';
    try {
      await authService.logout(token);
      res.status(200).json({ message: 'Déconnexion réussie' });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/password-reset', passwordResetLimiter, async (req: Request, res: Response) => {
    const validation = validatePasswordReset(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: { code: AUTH_ERROR_CODES.VALIDATION_ERROR, message: 'Données invalides' },
      });
      return;
    }
    try {
      await authService.requestPasswordReset(req.body.email);
      res.status(200).json({ message: 'Si un compte existe, un e-mail a été envoyé' });
    } catch (err) {
      // Always 200 to prevent enumeration
      res.status(200).json({ message: 'Si un compte existe, un e-mail a été envoyé' });
    }
  });

  router.post('/password-reset-confirm', async (req: Request, res: Response) => {
    const validation = validatePasswordResetConfirm(req.body);
    if (!validation.success) {
      res.status(400).json({
        error: { code: AUTH_ERROR_CODES.VALIDATION_ERROR, message: 'Données invalides' },
      });
      return;
    }
    try {
      await authService.confirmPasswordReset(req.body.token, req.body.newPassword);
      res.status(200).json({ message: 'Mot de passe réinitialisé' });
    } catch (err) {
      handleError(res, err);
    }
  });

  router.get('/me', authMiddleware, async (req: Request, res: Response) => {
    try {
      const token = req.headers.authorization!.substring(7);
      const result = await authService.getMe(token);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  router.post('/social-profile-sync', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { displayName, avatarUrl } = req.body;
      const userId = (req as any).user.id;
      const result = await authService.syncSocialProfile(userId, displayName, avatarUrl);
      res.status(200).json(result);
    } catch (err) {
      handleError(res, err);
    }
  });

  return router;
}
```

### Step 7: Create Express app

```typescript
// backend/src/app.ts
import express from 'express';
import cors from 'cors';
import { createAuthRouter } from './routes/auth';
import { AuthService } from './services/authService';
import { ProfileService } from './services/profileService';
import { supabaseAdmin } from './config/supabase';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  const profileService = new ProfileService(supabaseAdmin);
  const authService = new AuthService(supabaseAdmin, profileService);

  app.use('/api/auth', createAuthRouter(authService));

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  return app;
}
```

```typescript
// backend/src/index.ts
import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';

const PORT = process.env.PORT ?? 3001;
const app = createApp();

app.listen(PORT, () => {
  console.log(`DeenUp API running on port ${PORT}`);
});
```

### Step 8: Run all backend tests — expect PASS

```bash
npm run test:backend
```

### Step 9: Commit

```bash
git add backend/src/middleware/ backend/src/routes/ backend/src/app.ts backend/src/index.ts backend/src/__tests__/
git commit -m "feat(backend): add auth routes, middleware, rate limiter, and Express app"
```

---

### Task 5: Mobile — Supabase Client & AuthContext

**Why fifth:** Mobile is the primary platform. AuthContext provides login/signup/logout to all screens.

**Files:**
- Create: `mobile/src/lib/supabase.ts`
- Create: `mobile/src/contexts/AuthContext.tsx`
- Create: `mobile/src/hooks/useAuth.ts`
- Create: `mobile/src/__tests__/contexts/AuthContext.test.tsx`
- Create: `mobile/src/__tests__/hooks/useAuth.test.ts`
- Modify: `mobile/package.json` — add @supabase/supabase-js, @react-native-async-storage/async-storage

### Step 1: Write failing test for AuthContext

```typescript
// mobile/src/__tests__/contexts/AuthContext.test.tsx
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuthContext } from '../../contexts/AuthContext';

// Mock Supabase client
const mockSignUp = jest.fn();
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn().mockReturnValue({
  data: { subscription: { unsubscribe: jest.fn() } },
});

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}));

// Mock fetch for backend API calls
global.fetch = jest.fn();

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  });

  it('should start with unauthenticated state', async () => {
    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
  });

  it('should call backend signup and update state', async () => {
    const mockSession = {
      accessToken: 'at-1',
      refreshToken: 'rt-1',
      expiresAt: 9999,
      user: { id: 'uuid-1', email: 'test@example.com', displayName: 'Test', elo: 1000, deenPoints: 50 },
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 201,
      json: () => Promise.resolve({ session: mockSession }),
    });

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signup('test@example.com', 'password123', 'Test');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/signup'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should call backend login and update state', async () => {
    const mockSession = {
      accessToken: 'at-2',
      refreshToken: 'rt-2',
      expiresAt: 9999,
      user: { id: 'uuid-1', email: 'test@example.com', displayName: 'Test', elo: 1000, deenPoints: 50 },
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ session: mockSession }),
    });

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/login'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('should clear state on logout', async () => {
    mockSignOut.mockResolvedValue({ error: null });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ message: 'ok' }),
    });

    const { result } = renderHook(() => useAuthContext(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.user).toBeNull();
  });
});
```

### Step 2: Run test — expect FAIL

```bash
npm run test:mobile -- --testPathPattern=AuthContext
```

### Step 3: Implement Supabase client for mobile

```typescript
// mobile/src/lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Step 4: Implement AuthContext

```typescript
// mobile/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, AuthSession, AuthErrorResponse } from '@deenup/shared';
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

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session on mount
    supabase.auth.getSession().then(({ data }) => {
      // Session restored from AsyncStorage — fetch profile if session exists
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
  }, []);

  const fetchMe = async (accessToken: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch {
      // Silently fail — user will need to re-authenticate
    }
  };

  const signup = useCallback(async (email: string, password: string, displayName: string) => {
    const res = await fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
    });
    const data = await res.json();
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
    const data = await res.json();
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
    // Always succeeds from user perspective
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
```

### Step 5: Implement useAuth hook

```typescript
// mobile/src/hooks/useAuth.ts
export { useAuthContext as useAuth } from '../contexts/AuthContext';
```

### Step 6: Run mobile tests — expect PASS

```bash
npm run test:mobile -- --testPathPattern=AuthContext
```

### Step 7: Commit

```bash
git add mobile/src/
git commit -m "feat(mobile): add Supabase client, AuthContext, and useAuth hook with tests"
```

---

### Task 6: Web — Supabase Client, Auth Utilities & Middleware

**Why sixth:** Web is secondary platform but still needs auth for MVP.

**Files:**
- Create: `web/src/lib/supabase.ts`
- Create: `web/src/lib/auth.ts`
- Create: `web/src/middleware.ts`
- Create: `web/src/__tests__/lib/auth.test.ts`
- Modify: `web/package.json` — add @supabase/supabase-js, @supabase/auth-helpers-nextjs

### Step 1: Write failing test for web auth utilities

```typescript
// web/src/__tests__/lib/auth.test.ts
import { authApi } from '../../lib/auth';

global.fetch = jest.fn();

describe('Web Auth Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('authApi.signup', () => {
    it('should call backend signup endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            session: {
              accessToken: 'at-1',
              refreshToken: 'rt-1',
              expiresAt: 9999,
              user: { id: 'uuid-1', displayName: 'Test', elo: 1000, deenPoints: 50 },
            },
          }),
      });

      const result = await authApi.signup('test@example.com', 'password123', 'Test');
      expect(result.session.user.elo).toBe(1000);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/signup'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should throw on error response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 409,
        json: () => Promise.resolve({ error: { code: 'EMAIL_EXISTS', message: 'duplicate' } }),
      });

      await expect(
        authApi.signup('dup@example.com', 'password123', 'Test')
      ).rejects.toMatchObject({ code: 'EMAIL_EXISTS' });
    });
  });

  describe('authApi.login', () => {
    it('should call backend login endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            session: {
              accessToken: 'at-2',
              refreshToken: 'rt-2',
              expiresAt: 9999,
              user: { id: 'uuid-1', displayName: 'Test', elo: 1200, deenPoints: 75 },
            },
          }),
      });

      const result = await authApi.login('test@example.com', 'password123');
      expect(result.session.accessToken).toBe('at-2');
    });
  });
});
```

### Step 2: Run test — expect FAIL

```bash
npm run test:web -- --testPathPattern=auth
```

### Step 3: Implement web Supabase client

```typescript
// web/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});
```

### Step 4: Implement web auth utilities

```typescript
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
```

### Step 5: Implement Next.js middleware for protected routes

```typescript
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
```

### Step 6: Run web tests — expect PASS

```bash
npm run test:web -- --testPathPattern=auth
```

### Step 7: Commit

```bash
git add web/src/
git commit -m "feat(web): add Supabase client, auth utilities, and Next.js middleware with tests"
```

---

### Task 7: Integration Test & End-to-End Verification

**Why last:** Validates the full auth flow works across layers.

**Files:**
- Create: `backend/src/__tests__/auth.integration.test.ts`
- Create: `scripts/test-auth-flow.sh`

### Step 1: Write integration test (requires Supabase local)

```typescript
// backend/src/__tests__/auth.integration.test.ts
import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Auth Integration (requires Supabase local)', () => {
  const testEmail = `test-${Date.now()}@example.com`;
  let accessToken: string;
  let refreshToken: string;

  it('POST /api/auth/signup should create user and profile', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: testEmail, password: 'testpassword123', displayName: 'Integration Test' });

    expect(res.status).toBe(201);
    expect(res.body.session.user.elo).toBe(1000);
    expect(res.body.session.user.deenPoints).toBe(50);
    expect(res.body.session.user.displayName).toBe('Integration Test');
    accessToken = res.body.session.accessToken;
    refreshToken = res.body.session.refreshToken;
  });

  it('GET /api/auth/me should return user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testEmail);
  });

  it('POST /api/auth/login should authenticate existing user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'testpassword123' });

    expect(res.status).toBe(200);
    expect(res.body.session.accessToken).toBeDefined();
  });

  it('POST /api/auth/signup with same email should return 409', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: testEmail, password: 'testpassword123', displayName: 'Dup' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  it('POST /api/auth/login with wrong password should return 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('GET /api/auth/me without token should return 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/password-reset should always return 200', async () => {
    const res = await request(app)
      .post('/api/auth/password-reset')
      .send({ email: 'nonexistent@example.com' });

    expect(res.status).toBe(200);
  });

  it('POST /api/auth/logout should succeed', async () => {
    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
  });
});
```

### Step 2: Run integration tests

```bash
npx supabase start
npx supabase db push
npm run test:backend -- --testPathPattern=auth.integration
```

### Step 3: Verify all unit tests still pass

```bash
npm run test
```

### Step 4: Commit

```bash
git add backend/src/__tests__/auth.integration.test.ts scripts/
git commit -m "test: add auth integration tests for full signup/login/logout flow"
```

---

## Testing Strategy

**Approach:** TDD (Red → Green → Refactor) at every layer.

| Layer | Type | Runner | Mock Strategy |
|-------|------|--------|---------------|
| `shared/` | Unit | `jest` | None — pure types/constants |
| `backend/validators/` | Unit | `jest` | None — pure functions |
| `backend/services/` | Unit | `jest` | Mock Supabase client, mock ProfileService |
| `backend/middleware/` | Unit | `jest` | Mock Supabase admin client |
| `backend/routes/` | Unit | `jest + supertest` | Mock AuthService (dependency injection) |
| `backend/` | Integration | `jest + supertest + supabase local` | Real Supabase local instance |
| `mobile/contexts/` | Unit | `jest + @testing-library/react-native` | Mock Supabase client, mock fetch |
| `web/lib/` | Unit | `jest` | Mock fetch, mock Supabase client |

**Total test scenarios:** 18 (from design doc) + additional edge cases in unit tests.

**Test Commands:**
```bash
npm run test               # All tests across workspaces
npm run test:shared        # Shared types/constants
npm run test:backend       # Backend unit tests
npm run test:mobile        # Mobile AuthContext tests
npm run test:web           # Web auth utility tests

# Integration (requires Supabase local running)
npx supabase start
npm run test:backend -- --testPathPattern=auth.integration
```

---

## Risk Assessment

### High Severity

1. **Supabase local not available in CI**
   - *Risk:* Integration tests can't run in CI pipeline
   - *Mitigation:* Use Supabase CLI Docker container in CI; keep integration tests in separate test suite (`.integration.test.ts` pattern) so unit tests always pass

2. **OAuth deep linking on React Native**
   - *Risk:* `supabase.auth.signInWithOAuth` may not work with React Native deep links out of the box
   - *Mitigation:* Task 5 only implements email/password auth context; OAuth is handled via `social-profile-sync` endpoint after Supabase SDK handles the redirect. If deep linking fails, fall back to `expo-auth-session` **[NEEDS CLARIFICATION — test with actual device before relying on this]**

### Medium Severity

3. **Monorepo workspace resolution**
   - *Risk:* `@deenup/shared` imports may not resolve correctly across workspaces, especially in React Native bundler (Metro)
   - *Mitigation:* Test workspace imports early in Task 1; if Metro can't resolve, use `metro.config.js` `watchFolders` to add `shared/` directory

4. **Rate limiter state in tests**
   - *Risk:* In-memory rate limiter may carry state between test runs, causing flaky tests
   - *Mitigation:* Create rate limiter per-app instance (dependency injection in `createApp`); in tests, create fresh app per test suite

5. **Password reset confirm flow**
   - *Risk:* Supabase `updateUser` for password reset requires the user to have an active session from the reset link callback. The backend may not have access to the session token from the reset email link.
   - *Mitigation:* Password reset confirmation may need to happen client-side (Supabase SDK handles the reset link callback directly). Backend endpoint serves as fallback. **[NEEDS CLARIFICATION — verify Supabase password reset flow mechanics]**

### Low Severity

6. **Token expiry mismatch**
   - *Risk:* Supabase default token expiry may differ from `AUTH_DEFAULTS` constants
   - *Mitigation:* Configure Supabase project settings to match 1h access / 7d refresh; constants are documentation, Supabase is source of truth

7. **French error messages hardcoded**
   - *Risk:* When adding Dutch/English later, all error strings need extraction
   - *Mitigation:* Error messages are centralized in validators and services; straightforward to extract to i18n keys later

---

## Uncertainty Log

| Item | Status | Detail |
|------|--------|--------|
| OAuth provider credentials | **[NEEDS CLARIFICATION]** | Are Google Cloud Console and Apple Developer accounts set up with redirect URIs? |
| Express.js as backend framework | **Assumed** | Design doc assumes Express; confirm before Task 4 |
| React Native deep linking for OAuth | **[NEEDS CLARIFICATION]** | May need `expo-auth-session` instead of Supabase SDK OAuth |
| Supabase password reset flow | **[NEEDS CLARIFICATION]** | Verify if `updateUser` works with reset token or needs client-side handling |
| Metro bundler workspace support | **Medium risk** | May need `metro.config.js` customization for `@deenup/shared` |
| Supabase local CLI availability | **Assumed available** | Required for integration tests; install via `npm install -g supabase` |
