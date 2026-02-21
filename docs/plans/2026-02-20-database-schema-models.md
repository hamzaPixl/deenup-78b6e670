# Database Schema & Models Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create the complete PostgreSQL database schema and TypeScript model layer for DeenUp's competitive Islamic quiz platform.

**Architecture:** Supabase-hosted PostgreSQL with sequential SQL migrations (002–011), Row Level Security on every table, TypeScript interfaces in `@deenup/shared` with barrel exports, and game constants. Migration 001 for profiles already exists conceptually but has no SQL file on disk — the design assumes it exists, so we create it first.

**Tech Stack:** PostgreSQL (via Supabase), TypeScript 5.3, Jest 29, npm workspaces

---

## Important Context

- **No SQL migration files exist on disk.** The design doc says "001_create_profiles.sql already exists," but it does not. We must create it.
- **Existing patterns to follow:**
  - `shared/src/types/auth.ts` — interfaces with PascalCase, `string | null` for nullable
  - `shared/src/constants/auth.ts` — `as const` objects with SCREAMING_SNAKE_CASE
  - `shared/src/index.ts` — barrel exports using `export type {}` for types, `export {}` for values
  - `shared/src/__tests__/auth-types.test.ts` — Jest tests importing from `../index`, `describe` blocks, `it('should …')` assertions
- **Naming:** PostgreSQL uses `snake_case`; TypeScript uses `camelCase` fields and `PascalCase` interfaces
- **Directory to create:** `backend/supabase/migrations/` (does not exist yet)

---

## Tasks

### Task 1: Create Shared Enum Types

**Files:**
- Create: `shared/src/types/enums.ts`
- Modify: `shared/src/index.ts` (add enum exports)
- Create: `shared/src/__tests__/enums.test.ts`

**Step 1: Write the failing test**

Create `shared/src/__tests__/enums.test.ts` that imports all enum union types from `../index` and asserts:
- `Difficulty` accepts exactly: `'easy'`, `'medium'`, `'advanced'`
- `QuestionStatus` accepts exactly: `'draft'`, `'in_review'`, `'approved'`, `'rejected'`
- `MatchStatus` accepts exactly: `'waiting'`, `'in_progress'`, `'completed'`, `'abandoned'`
- `MatchType` accepts exactly: `'ranked'`, `'unranked'`
- `SourceType` accepts exactly: `'quran'`, `'hadith'`, `'jurisprudence'`, `'scholarly'`
- `PointsTransactionType` accepts exactly: `'daily_play'`, `'fast_answer'`, `'match_win'`, `'bonus_time'`, `'double_points'`, `'hint'`
- `ModerationStatus` accepts exactly: `'visible'`, `'flagged'`, `'hidden'`, `'deleted'`

Follow the test pattern in `shared/src/__tests__/auth-types.test.ts`: import from `../index`, use `describe('Enums', () => { ... })`, create typed variables and assert values.

Also test the `ENUM_VALUES` constant object — verify each key maps to a frozen array of the correct literal values (e.g. `ENUM_VALUES.DIFFICULTY` should be `['easy', 'medium', 'advanced']`).

**Step 2: Run test to verify it fails**

Run: `npm run test:shared -- --testPathPattern=enums`
Expected: FAIL — module `../index` does not export these types

**Step 3: Write minimal implementation**

Create `shared/src/types/enums.ts`:
- Define each enum as a string literal union type: `export type Difficulty = 'easy' | 'medium' | 'advanced';`
- Also export a runtime `ENUM_VALUES` object with arrays for each enum, using `as const` (these are useful for runtime validation in the backend and for DB CHECK constraints)
- Follow the pattern of `shared/src/types/auth.ts` — pure type exports, no classes

Update `shared/src/index.ts`:
- Add `export type { Difficulty, QuestionStatus, MatchStatus, MatchType, SourceType, PointsTransactionType, ModerationStatus } from './types/enums';`
- Add `export { ENUM_VALUES } from './types/enums';`

**Step 4: Run test to verify it passes**

Run: `npm run test:shared -- --testPathPattern=enums`
Expected: PASS

**Step 5: Commit**

```bash
git add shared/src/types/enums.ts shared/src/__tests__/enums.test.ts shared/src/index.ts
git commit -m "feat: add game enum types (Difficulty, MatchStatus, etc.)"
```

---

### Task 2: Create Game Constants

**Files:**
- Create: `shared/src/constants/game.ts`
- Modify: `shared/src/index.ts` (add constant exports)
- Create: `shared/src/__tests__/game-constants.test.ts`

**Step 1: Write the failing test**

Create `shared/src/__tests__/game-constants.test.ts` importing from `../index`. Test:

- `SCORING.BASE_POINTS.easy` === 100, `.medium` === 200, `.advanced` === 400
- `TIME_LIMITS.EASY_MS` === 15000, `MEDIUM_MS` === 20000, `ADVANCED_MS` === 30000
- `MATCH_FORMAT.QUESTIONS_PER_MATCH` === 15
- `MATCH_FORMAT.ANSWERS_PER_QUESTION` === 4
- `DEEN_POINTS.INITIAL` === 50 (matches `AUTH_DEFAULTS.INITIAL_DEEN_POINTS`)
- `DEEN_POINTS.COSTS.BONUS_TIME` === 10, `DOUBLE_POINTS` === 10, `HINT` === 10
- `THEMES` is an array of length 8, each with `id`, `slug`, `nameFr`, `isMvp`
- Exactly 3 themes have `isMvp: true` (quran, prophets, prophet_muhammad)
- `SALONS` is an array of length 4 with slugs: quran, prophets, general, competition

Follow the test pattern in `shared/src/__tests__/auth-types.test.ts`.

**Step 2: Run test to verify it fails**

Run: `npm run test:shared -- --testPathPattern=game-constants`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `shared/src/constants/game.ts`:
- `SCORING` object with `BASE_POINTS` nested by difficulty
- `TIME_LIMITS` with millisecond values per difficulty
- `MATCH_FORMAT` with `QUESTIONS_PER_MATCH: 15`, `ANSWERS_PER_QUESTION: 4`
- `DEEN_POINTS` with `INITIAL: 50` and `COSTS` sub-object
- `THEMES` array with 8 entries (French names): each `{ id: string (UUID), slug: string, nameFr: string, isMvp: boolean }`
  - MVP themes: quran, prophets, prophet_muhammad
  - Non-MVP: jurisprudence, islamic_history, companions, islamic_texts, general_culture
- `SALONS` array with 4 entries: `{ id: string (UUID), slug: string, nameFr: string, emoji: string }`
  - Entries: Quran (📖), Prophètes (🕌), Général (⭐), Compétition (🏆)
- All objects use `as const` assertion
- Use deterministic UUID v5 (or hardcoded UUIDs) for theme/salon IDs so SQL seed data matches TypeScript constants

Follow the pattern of `shared/src/constants/auth.ts`.

Update `shared/src/index.ts`:
- Add `export { SCORING, TIME_LIMITS, MATCH_FORMAT, DEEN_POINTS, THEMES, SALONS } from './constants/game';`

**Step 4: Run test to verify it passes**

Run: `npm run test:shared -- --testPathPattern=game-constants`
Expected: PASS

**Step 5: Commit**

```bash
git add shared/src/constants/game.ts shared/src/__tests__/game-constants.test.ts shared/src/index.ts
git commit -m "feat: add game constants (scoring, time limits, themes, salons)"
```

---

### Task 3: Create Game TypeScript Interfaces

**Files:**
- Create: `shared/src/types/game.ts`
- Modify: `shared/src/index.ts` (add type exports)
- Create: `shared/src/__tests__/game-types.test.ts`

**Step 1: Write the failing test**

Create `shared/src/__tests__/game-types.test.ts` importing from `../index`. Test instantiation of every interface by creating valid objects and asserting field values:

- `Theme`: `{ id, slug, nameFr, isMvp, createdAt, updatedAt }`
- `AnswerOption`: `{ text: string, index: number }` — used inside Question.answers JSONB
- `Question`: `{ id, themeId, questionText, answers: AnswerOption[] (length 4), correctAnswerIndex (0-3), difficulty, status, createdAt, updatedAt }` — verify answers array length is 4
- `QuestionSource`: `{ id, questionId, sourceType, reference, bookOrCollection, chapterOrVerse: string | null, createdAt }`
- `Match`: `{ id, themeId, player1Id, player2Id, matchType, status, winnerId: string | null, startedAt: string | null, endedAt: string | null, createdAt, updatedAt }`
- `MatchQuestion`: `{ id, matchId, questionId, questionOrder, createdAt }`
- `MatchAnswer`: `{ id, matchQuestionId, playerId, selectedAnswerIndex: number | null, isCorrect, timeTakenMs, pointsScored, createdAt }`
- `EloHistoryEntry`: `{ id, playerId, matchId, oldElo, newElo, delta, createdAt }`
- `DeenPointsTransaction`: `{ id, playerId, transactionType, amount, balanceAfter, matchId: string | null, description: string | null, createdAt }`
- `Conversation`: `{ id, player1Id, player2Id, lastMessageAt: string | null, createdAt, updatedAt }`
- `Message`: `{ id, conversationId, senderId, content, reaction: string | null, createdAt }`
- `Salon`: `{ id, slug, nameFr, emoji, description: string | null, createdAt, updatedAt }`
- `SalonMessage`: `{ id, salonId, senderId, content, isPinned, moderationStatus, createdAt }`
- `PlayerStats`: `{ totalMatches, wins, losses, draws, winStreak, bestWinStreak, placementMatchesPlayed, isPlaced }`

Follow the pattern in `shared/src/__tests__/auth-types.test.ts`.

**Step 2: Run test to verify it fails**

Run: `npm run test:shared -- --testPathPattern=game-types`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `shared/src/types/game.ts`:
- Define all 14 interfaces listed above
- Use the enum types from `./enums` for typed fields (e.g., `difficulty: Difficulty`, `status: QuestionStatus`)
- Use `string | null` for nullable fields (not `?:` optional — match DB behavior where column exists but may be NULL)
- All IDs are `string` (UUIDs)
- All timestamps are `string` (ISO 8601 — mapped from PostgreSQL TIMESTAMPTZ)
- `AnswerOption` is a plain interface (not exported from index as a top-level type, but exported for use in Question)

Update `shared/src/index.ts`:
- Add `export type { Theme, AnswerOption, Question, QuestionSource, Match, MatchQuestion, MatchAnswer, EloHistoryEntry, DeenPointsTransaction, Conversation, Message, Salon, SalonMessage, PlayerStats } from './types/game';`

**Step 4: Run test to verify it passes**

Run: `npm run test:shared -- --testPathPattern=game-types`
Expected: PASS

**Step 5: Commit**

```bash
git add shared/src/types/game.ts shared/src/__tests__/game-types.test.ts shared/src/index.ts
git commit -m "feat: add game type interfaces (Question, Match, EloHistory, etc.)"
```

---

### Task 4: Create Migration Directory and Profiles Migration (001)

**Files:**
- Create: `backend/supabase/migrations/001_create_profiles.sql`

**Step 1: Verify directory does not exist**

Run: `ls backend/supabase/migrations/ 2>&1 || echo "Directory does not exist"`
Expected: "Directory does not exist"

**Step 2: Create directory and migration**

Create directory `backend/supabase/migrations/`.

Write `001_create_profiles.sql`:
- Create `handle_updated_at()` trigger function (IF NOT EXISTS / CREATE OR REPLACE) — this trigger is reused by all subsequent migrations
- Create `profiles` table extending `auth.users`:
  - `id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
  - `display_name TEXT NOT NULL`
  - `avatar_url TEXT`
  - `email TEXT NOT NULL`
  - `elo INTEGER NOT NULL DEFAULT 1000`
  - `deen_points INTEGER NOT NULL DEFAULT 50`
  - `preferred_language TEXT NOT NULL DEFAULT 'fr'`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Apply `handle_updated_at` trigger to profiles
- Enable RLS
- RLS policies: users can read own profile, users can update own profile, service role can do all
- Use `CREATE TABLE IF NOT EXISTS` for idempotency

**Step 3: Validate SQL syntax**

Run: `npx supabase start && npx supabase db push` (if Supabase CLI available)
If Supabase CLI is not installed, validate SQL syntax by visual inspection — ensure all statements end with semicolons, all column types are valid PostgreSQL types, and foreign key references are correct.

**Step 4: Commit**

```bash
git add backend/supabase/migrations/001_create_profiles.sql
git commit -m "feat: add profiles migration with handle_updated_at trigger"
```

---

### Task 5: Create Themes Migration (002)

**Files:**
- Create: `backend/supabase/migrations/002_create_themes.sql`

**Step 1: Write migration**

Create `002_create_themes.sql`:
- `CREATE TABLE IF NOT EXISTS themes`:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `slug TEXT NOT NULL UNIQUE`
  - `name_fr TEXT NOT NULL`
  - `is_mvp BOOLEAN NOT NULL DEFAULT false`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Apply `handle_updated_at` trigger
- Enable RLS
- RLS policy: public/anon can SELECT (themes are public data)
- Seed 8 theme rows using the same UUIDs from `THEMES` constant in Task 2
  - Use `INSERT ... ON CONFLICT (slug) DO NOTHING` for idempotency
  - Set `is_mvp = true` for: quran, prophets, prophet_muhammad
  - French names: Coran, Jurisprudence, Prophètes, Prophète Muhammad ﷺ, Histoire islamique, Compagnons, Textes islamiques, Culture générale

**Step 2: Validate**

Review that UUIDs match `shared/src/constants/game.ts` THEMES array.
Run: `npx supabase db push` (if available)

**Step 3: Commit**

```bash
git add backend/supabase/migrations/002_create_themes.sql
git commit -m "feat: add themes migration with 8 seed entries"
```

---

### Task 6: Create Questions & Sources Migration (003)

**Files:**
- Create: `backend/supabase/migrations/003_create_questions.sql`

**Step 1: Write migration**

Create `003_create_questions.sql` with TWO tables:

**Table `questions`:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE RESTRICT`
- `question_text TEXT NOT NULL`
- `answers JSONB NOT NULL` — CHECK constraint: `jsonb_array_length(answers) = 4`
- `correct_answer_index INTEGER NOT NULL` — CHECK constraint: `correct_answer_index BETWEEN 0 AND 3`
- `difficulty TEXT NOT NULL` — CHECK constraint: `difficulty IN ('easy', 'medium', 'advanced')`
- `status TEXT NOT NULL DEFAULT 'draft'` — CHECK constraint: `status IN ('draft', 'in_review', 'approved', 'rejected')`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Apply `handle_updated_at` trigger
- Index: `CREATE INDEX idx_questions_theme_status ON questions(theme_id, status)`
- Enable RLS
- RLS policies: anon/public can SELECT WHERE `status = 'approved'`; service role full access

**Table `question_sources`:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE`
- `source_type TEXT NOT NULL` — CHECK: `source_type IN ('quran', 'hadith', 'jurisprudence', 'scholarly')`
- `reference TEXT NOT NULL` (e.g., "Al-Baqarah 2:255")
- `book_or_collection TEXT` (e.g., "Sahih al-Bukhari")
- `chapter_or_verse TEXT` (e.g., "2:255")
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Index: `CREATE INDEX idx_question_sources_question ON question_sources(question_id)`
- Enable RLS
- RLS policies: same as questions (public SELECT for approved question sources via JOIN or service role)

**Step 2: Commit**

```bash
git add backend/supabase/migrations/003_create_questions.sql
git commit -m "feat: add questions and question_sources migrations"
```

---

### Task 7: Create Matches Migration (004)

**Files:**
- Create: `backend/supabase/migrations/004_create_matches.sql`

**Step 1: Write migration**

Create `004_create_matches.sql`:

**Table `matches`:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `theme_id UUID NOT NULL REFERENCES themes(id) ON DELETE RESTRICT`
- `player1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`
- `player2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`
- `match_type TEXT NOT NULL DEFAULT 'ranked'` — CHECK: `match_type IN ('ranked', 'unranked')`
- `status TEXT NOT NULL DEFAULT 'waiting'` — CHECK: `status IN ('waiting', 'in_progress', 'completed', 'abandoned')`
- `winner_id UUID REFERENCES profiles(id) ON DELETE SET NULL`
- `started_at TIMESTAMPTZ`
- `ended_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- CHECK: `player1_id != player2_id`
- Apply `handle_updated_at` trigger
- Index: `CREATE INDEX idx_matches_player1 ON matches(player1_id)` and `idx_matches_player2 ON matches(player2_id)`
- Enable RLS
- RLS policies: authenticated users can SELECT matches where they are player1 or player2; service role full access

**Step 2: Commit**

```bash
git add backend/supabase/migrations/004_create_matches.sql
git commit -m "feat: add matches migration"
```

---

### Task 8: Create Match Questions & Answers Migrations (005, 006)

**Files:**
- Create: `backend/supabase/migrations/005_create_match_questions.sql`
- Create: `backend/supabase/migrations/006_create_match_answers.sql`

**Step 1: Write match_questions migration (005)**

Create `005_create_match_questions.sql`:

**Table `match_questions`:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE`
- `question_id UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT`
- `question_order INTEGER NOT NULL` — CHECK: `question_order BETWEEN 1 AND 15`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- UNIQUE constraint: `(match_id, question_order)` — no duplicate order positions
- UNIQUE constraint: `(match_id, question_id)` — no duplicate questions per match
- Enable RLS
- RLS policies: authenticated users can SELECT match_questions for their matches; service role full access

**Step 2: Write match_answers migration (006)**

Create `006_create_match_answers.sql`:

**Table `match_answers`:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `match_question_id UUID NOT NULL REFERENCES match_questions(id) ON DELETE CASCADE`
- `player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`
- `selected_answer_index INTEGER` — NULL if player didn't answer (timeout); CHECK: `selected_answer_index BETWEEN 0 AND 3` (when not NULL)
- `is_correct BOOLEAN NOT NULL DEFAULT false`
- `time_taken_ms INTEGER NOT NULL DEFAULT 0` — CHECK: `time_taken_ms >= 0`
- `points_scored INTEGER NOT NULL DEFAULT 0` — CHECK: `points_scored >= 0`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- UNIQUE constraint: `(match_question_id, player_id)` — one answer per player per question
- Enable RLS
- RLS policies: authenticated users can SELECT their own answers; service role full access

**Step 3: Commit**

```bash
git add backend/supabase/migrations/005_create_match_questions.sql backend/supabase/migrations/006_create_match_answers.sql
git commit -m "feat: add match_questions and match_answers migrations"
```

---

### Task 9: Create ELO History & DeenUp Points Migrations (007, 008)

**Files:**
- Create: `backend/supabase/migrations/007_create_elo_history.sql`
- Create: `backend/supabase/migrations/008_create_deen_points_ledger.sql`

**Step 1: Write elo_history migration (007)**

Create `007_create_elo_history.sql`:

**Table `elo_history`:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`
- `match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE`
- `old_elo INTEGER NOT NULL`
- `new_elo INTEGER NOT NULL`
- `delta INTEGER NOT NULL` — can be negative
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Index: `CREATE INDEX idx_elo_history_player ON elo_history(player_id, created_at DESC)`
- Enable RLS
- RLS policies: authenticated users can SELECT own history; service role full access

**Step 2: Write deen_points_ledger migration (008)**

Create `008_create_deen_points_ledger.sql`:

**Table `deen_points_ledger`:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `player_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`
- `transaction_type TEXT NOT NULL` — CHECK: `transaction_type IN ('daily_play', 'fast_answer', 'match_win', 'bonus_time', 'double_points', 'hint')`
- `amount INTEGER NOT NULL` — positive for earning, negative for spending
- `balance_after INTEGER NOT NULL` — CHECK: `balance_after >= 0`
- `match_id UUID REFERENCES matches(id) ON DELETE SET NULL` — optional, links to related match
- `description TEXT` — optional human-readable note
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Index: `CREATE INDEX idx_deen_points_player ON deen_points_ledger(player_id, created_at DESC)`
- Enable RLS
- RLS policies: authenticated users can SELECT own ledger; service role full access

**Step 3: Commit**

```bash
git add backend/supabase/migrations/007_create_elo_history.sql backend/supabase/migrations/008_create_deen_points_ledger.sql
git commit -m "feat: add elo_history and deen_points_ledger migrations"
```

---

### Task 10: Create Chat Migrations (009, 010)

**Files:**
- Create: `backend/supabase/migrations/009_create_conversations.sql`
- Create: `backend/supabase/migrations/010_create_salons.sql`

**Step 1: Write conversations migration (009)**

Create `009_create_conversations.sql` with TWO tables:

**Table `conversations`:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `player1_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`
- `player2_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`
- `last_message_at TIMESTAMPTZ`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- CHECK: `player1_id != player2_id`
- UNIQUE constraint: ensure one conversation per player pair — use `UNIQUE(LEAST(player1_id, player2_id), GREATEST(player1_id, player2_id))` or a functional unique index to prevent duplicates regardless of column order
- Apply `handle_updated_at` trigger
- Enable RLS
- RLS policies: authenticated users can SELECT conversations where they are player1 or player2

**Table `messages`:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE`
- `sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`
- `content TEXT NOT NULL` — CHECK: `char_length(content) > 0 AND char_length(content) <= 2000`
- `reaction TEXT` — nullable, one of the Islamic-themed reactions or NULL
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Index: `CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC)`
- Enable RLS
- RLS policies: authenticated users can SELECT messages in their conversations; authenticated users can INSERT messages in their conversations

**Step 2: Write salons migration (010)**

Create `010_create_salons.sql` with TWO tables:

**Table `salons`:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `slug TEXT NOT NULL UNIQUE`
- `name_fr TEXT NOT NULL`
- `emoji TEXT NOT NULL`
- `description TEXT`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Apply `handle_updated_at` trigger
- Enable RLS
- RLS policy: public/anon can SELECT (salons are public data)
- Seed 4 salon rows using UUIDs matching `SALONS` constant from Task 2
  - `INSERT ... ON CONFLICT (slug) DO NOTHING`

**Table `salon_messages`:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `salon_id UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE`
- `sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE`
- `content TEXT NOT NULL` — CHECK: `char_length(content) > 0 AND char_length(content) <= 2000`
- `is_pinned BOOLEAN NOT NULL DEFAULT false`
- `moderation_status TEXT NOT NULL DEFAULT 'visible'` — CHECK: `moderation_status IN ('visible', 'flagged', 'hidden', 'deleted')`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Index: `CREATE INDEX idx_salon_messages_salon ON salon_messages(salon_id, created_at DESC)`
- Enable RLS
- RLS policies: authenticated users can SELECT visible salon_messages; authenticated users can INSERT; service role can UPDATE moderation_status

**Step 3: Commit**

```bash
git add backend/supabase/migrations/009_create_conversations.sql backend/supabase/migrations/010_create_salons.sql
git commit -m "feat: add conversations, messages, salons, salon_messages migrations"
```

---

### Task 11: Extend Profiles Table (011) and Add Leaderboard Index

**Files:**
- Create: `backend/supabase/migrations/011_extend_profiles.sql`

**Step 1: Write migration**

Create `011_extend_profiles.sql`:
- `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_matches INTEGER NOT NULL DEFAULT 0;`
- `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wins INTEGER NOT NULL DEFAULT 0;`
- `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS losses INTEGER NOT NULL DEFAULT 0;`
- `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS draws INTEGER NOT NULL DEFAULT 0;`
- `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS win_streak INTEGER NOT NULL DEFAULT 0;`
- `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS best_win_streak INTEGER NOT NULL DEFAULT 0;`
- `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS placement_matches_played INTEGER NOT NULL DEFAULT 0;` — CHECK: `placement_matches_played BETWEEN 0 AND 2`
- `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_placed BOOLEAN NOT NULL DEFAULT false;`
- Index: `CREATE INDEX IF NOT EXISTS idx_profiles_elo ON profiles(elo DESC)` — leaderboard query
- Index: `CREATE INDEX IF NOT EXISTS idx_profiles_deen_points ON profiles(deen_points DESC)` — points leaderboard

**Step 2: Commit**

```bash
git add backend/supabase/migrations/011_extend_profiles.sql
git commit -m "feat: extend profiles with game stats and leaderboard indexes"
```

---

### Task 12: Final Integration — Verify All Exports and Run Full Test Suite

**Files:**
- Modify (verify): `shared/src/index.ts`

**Step 1: Verify barrel exports are complete**

Read `shared/src/index.ts` and verify it exports:
- All type exports from `./types/auth` (already exists)
- All type exports from `./types/enums` (added in Task 1)
- All type exports from `./types/game` (added in Task 3)
- All constant exports from `./constants/auth` (already exists)
- All constant exports from `./constants/game` (added in Task 2)
- `ENUM_VALUES` from `./types/enums` (added in Task 1)

**Step 2: Run full test suite**

Run: `npm run test:shared`
Expected: ALL tests pass (auth-types, enums, game-constants, game-types)

**Step 3: Verify TypeScript compilation**

Run: `cd shared && npx tsc --noEmit`
Expected: No errors

**Step 4: Verify migration file count**

Run: `ls backend/supabase/migrations/`
Expected: 11 files (001 through 011)

**Step 5: Final commit (if any adjustments needed)**

```bash
git add -A
git commit -m "feat: verify all exports and integration for database schema"
```

---

## Testing Strategy

### Unit Tests (Shared Package)

All tests live in `shared/src/__tests__/` and run via `npm run test:shared`.

| Test File | What It Validates | Key Assertions |
|-----------|-------------------|----------------|
| `enums.test.ts` | Enum union types compile and hold correct values | Each enum value is assignable; `ENUM_VALUES` arrays are correct length with correct members |
| `game-constants.test.ts` | Game constants have correct values | Scoring base points (100/200/400), time limits (15k/20k/30k ms), match format (15 questions), theme count (8, 3 MVP), salon count (4) |
| `game-types.test.ts` | All 14 interfaces are instantiable | Create valid objects for each interface; verify nullable fields accept null; verify typed enum fields |

### SQL Migration Validation

Migrations are validated by:
1. **Syntax check:** Each file should parse as valid PostgreSQL SQL
2. **Idempotency:** Running `supabase db push` twice should succeed without errors (all `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`)
3. **Dependency order:** Migrations 001→011 apply sequentially without FK violations
4. **RLS enabled:** Every table has `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`

### Commands

```bash
# Run all shared tests
npm run test:shared

# Run specific test file
npm run test:shared -- --testPathPattern=enums
npm run test:shared -- --testPathPattern=game-constants
npm run test:shared -- --testPathPattern=game-types

# TypeScript compilation check
cd shared && npx tsc --noEmit

# Full workspace test
npm run test

# Validate migrations (requires Supabase CLI + Docker)
npx supabase start
npx supabase db push
```

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Migration 001 does not exist on disk — design doc claims it does | **High** | Task 4 creates it explicitly. Verified via codebase exploration that no SQL files exist. |
| UUID mismatch between TypeScript constants and SQL seed data | **Medium** | Use hardcoded UUIDs in both `shared/src/constants/game.ts` and SQL INSERT statements. Verify in Task 12. |
| `handle_updated_at()` trigger function may not exist when migrations 002+ run | **High** | Migration 001 creates this function. Migrations are sequential — 001 always runs first. |
| Supabase free tier may limit number of RLS policies | **Low** | Free tier supports unlimited RLS policies. If issues arise, consolidate policies per table. |
| JSONB CHECK constraint `jsonb_array_length(answers) = 4` may have performance implications | **Low** | Only evaluated on INSERT/UPDATE, not SELECT. Acceptable for MVP volume. |
| `auth.users` table may not exist in local dev without Supabase setup | **Medium** | Document that `supabase start` is required for local development. Migration 001 FK to `auth.users` will fail without it. |
| Conversation uniqueness constraint using LEAST/GREATEST may be complex | **Low** | Standard PostgreSQL pattern. Use a functional unique index: `CREATE UNIQUE INDEX ON conversations (LEAST(player1_id, player2_id), GREATEST(player1_id, player2_id))`. |
| Jest tests only validate TypeScript types, not actual DB behavior | **Medium** | Acceptable for this feature scope — DB integration tests belong in a separate feature (backend service layer). Type tests catch interface/constant regressions. |

---

## Uncertainty

- **[NEEDS CLARIFICATION] Supabase CLI availability:** The design doc assumes `supabase db push` is available for migration validation. If the Supabase CLI is not installed in the dev environment, migrations can only be validated by syntax review. The plan does not block on this — SQL validation is a nice-to-have, not a gate.

- **[NEEDS CLARIFICATION] `auth.users` table structure:** Migration 001 references `auth.users(id)` as a foreign key. This table is auto-created by Supabase Auth. If the project is not yet connected to a Supabase instance, this FK will fail. Mitigation: the migration uses `IF NOT EXISTS` and can be re-run once Supabase is configured.

- **[NEEDS CLARIFICATION] Existing `plan.md` at project root:** There is a `plan.md` file at the project root. It's unclear if this conflicts with or relates to this feature's plan. This implementation plan is saved separately in `docs/plans/`.
