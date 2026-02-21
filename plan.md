# Post-Match Review System Implementation Plan

> **For Claude:** Execute this plan task-by-task, using TDD methodology and committing after each task.

**Goal:** Build the Post-Match Review endpoint and UI so players can review all 15 questions after a match, with correct answers, explanations, and mandatory Islamic source citations.

**Architecture:** Backend `ReviewService` fetches match data via a single Supabase nested-select query and maps it to a camelCase API response. An Express route at `GET /api/matches/:matchId/review` handles auth + authorization. The web app renders a Next.js dynamic route, and mobile gets a `useMatchReview` hook.

**Tech Stack:** TypeScript, Express, Supabase (PostgREST), Next.js 14, React Native (Expo), Jest + supertest

---

## Tasks

### Task 1: Shared Review Constants

**Files:**
- Create: `shared/src/constants/review.ts`
- Modify: `shared/src/index.ts`
- Test: `shared/src/__tests__/review-constants.test.ts`

**Step 1: Write the failing test**

Create a test file that imports `REVIEW_ERROR_CODES` from `@deenup/shared` and asserts:
- `REVIEW_ERROR_CODES.MATCH_NOT_FOUND` equals `'MATCH_NOT_FOUND'`
- `REVIEW_ERROR_CODES.MATCH_NOT_REVIEWABLE` equals `'MATCH_NOT_REVIEWABLE'`
- `REVIEW_ERROR_CODES.NOT_PARTICIPANT` equals `'NOT_PARTICIPANT'`
- The object has exactly 3 keys

Follow the test structure in `shared/src/__tests__/game-constants.test.ts`.

**Step 2: Run test to verify it fails**

Run: `npm run test:shared -- --testPathPattern=review-constants`
Expected: FAIL — module not found or export not found

**Step 3: Write minimal implementation**

Create `shared/src/constants/review.ts` following the `as const` pattern in `shared/src/constants/auth.ts:1-11`. Define a single exported `REVIEW_ERROR_CODES` object with three string literal properties: `MATCH_NOT_FOUND`, `MATCH_NOT_REVIEWABLE`, `NOT_PARTICIPANT`.

Update `shared/src/index.ts` to add a barrel export for `REVIEW_ERROR_CODES` from `'./constants/review'`. Place it after the existing game constants export block (line 56).

**Step 4: Run test to verify it passes**

Run: `npm run test:shared -- --testPathPattern=review-constants`
Expected: PASS

**Step 5: Commit**

```bash
git add shared/src/constants/review.ts shared/src/__tests__/review-constants.test.ts shared/src/index.ts
git commit -m "feat(shared): add REVIEW_ERROR_CODES constants"
```

---

### Task 2: Shared Review API Types

**Files:**
- Create: `shared/src/types/review.ts`
- Modify: `shared/src/index.ts`
- Test: `shared/src/__tests__/review-types.test.ts`

**Step 1: Write the failing test**

Create a test file that imports all review types and validates their shape via TypeScript compilation (following pattern in `shared/src/__tests__/auth-types.test.ts` and `shared/src/__tests__/game-types.test.ts`).

Test that the following interfaces exist and are correctly typed by creating conforming objects:

1. `ReviewSource` — fields: `sourceType: SourceType`, `reference: string`, `textFr: string | null`
2. `ReviewPlayerAnswer` — fields: `selectedAnswerIndex: number | null`, `isCorrect: boolean`, `timeTakenMs: number`, `pointsEarned: number`
3. `ReviewQuestion` — fields: `questionOrder: number`, `questionText: string`, `answers: string[]`, `correctAnswerIndex: number`, `difficulty: Difficulty`, `explanationFr: string`, `playerAnswer: ReviewPlayerAnswer`, `opponentAnswer: ReviewPlayerAnswer`, `sources: ReviewSource[]`
4. `ReviewMatchSummary` — fields: `matchId: string`, `matchType: MatchType`, `themeName: string`, `player: { id, displayName, score, eloBefore, eloAfter }`, `opponent: { id, displayName, score, eloBefore, eloAfter }`, `winnerId: string | null`, `startedAt: string | null`, `endedAt: string | null`
5. `MatchReviewResponse` — fields: `summary: ReviewMatchSummary`, `questions: ReviewQuestion[]`

All field names use camelCase (API-layer convention per `shared/src/types/auth.ts`).

**Step 2: Run test to verify it fails**

Run: `npm run test:shared -- --testPathPattern=review-types`
Expected: FAIL — import not found

**Step 3: Write minimal implementation**

Create `shared/src/types/review.ts` with the 5 interfaces listed above. Import `Difficulty`, `MatchType`, and `SourceType` from `'./enums'` (following pattern in `shared/src/types/game.ts:10-18`).

Key design notes:
- Use camelCase for all fields (this is an API-layer type, not DB-layer)
- `ReviewPlayerAnswer.selectedAnswerIndex` is `number | null` — null means timeout
- `ReviewQuestion.sources` is `ReviewSource[]` (at least 1 per question, but array to support multiple)
- Player/opponent in summary use an inline `{ id: string; displayName: string; score: number; eloBefore: number; eloAfter: number | null }` shape
- **`eloAfter` is `number | null` intentionally:** While the review endpoint requires `status === 'completed'`, ELO calculation may be deferred or fail asynchronously. The DB schema (`matches.player1_elo_after`, `matches.player2_elo_after`) allows NULL. Keeping the type nullable ensures the UI handles this gracefully (display "—" if null). If ELO is always calculated synchronously on match completion, the nullable type is still safe (never triggers the null path).

Update `shared/src/index.ts` to export all 5 types from `'./types/review'`. Place after the game types export block (line 45).

**Step 4: Run test to verify it passes**

Run: `npm run test:shared -- --testPathPattern=review-types`
Expected: PASS

**Step 5: Commit**

```bash
git add shared/src/types/review.ts shared/src/__tests__/review-types.test.ts shared/src/index.ts
git commit -m "feat(shared): add MatchReviewResponse API types"
```

---

### Task 3: Review Validator

**Files:**
- Create: `backend/src/validators/review.ts`
- Test: `backend/src/__tests__/validators/review.test.ts`

**Step 1: Write the failing test**

Create a test file following the validation pattern in `backend/src/validators/auth.ts`.

Test `validateMatchId(id: string)`:
- Valid UUID v4 string → `{ success: true, errors: [] }`
- Empty string → `{ success: false, errors: [{ field: 'matchId', message: '...' }] }`
- Non-UUID string `"not-a-uuid"` → failure
- `null`/`undefined` → failure
- UUID-like but wrong format (e.g., missing dashes) → failure

Return type: `{ success: boolean; errors: Array<{ field: string; message: string }> }` — same `ValidationResult` shape used in `backend/src/validators/auth.ts:4-7`.

**Step 2: Run test to verify it fails**

Run: `npm run test:backend -- --testPathPattern=validators/review`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `backend/src/validators/review.ts` following the pattern in `backend/src/validators/auth.ts`. Export a `validateMatchId` function that checks the input against a UUID v4 regex pattern. French error message: `'Identifiant de match invalide'`.

**Step 4: Run test to verify it passes**

Run: `npm run test:backend -- --testPathPattern=validators/review`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/validators/review.ts backend/src/__tests__/validators/review.test.ts
git commit -m "feat(backend): add matchId UUID validator for review endpoint"
```

---

### Task 4: ReviewService

**Files:**
- Create: `backend/src/services/reviewService.ts`
- Test: `backend/src/__tests__/services/reviewService.test.ts`

**Step 1: Write the failing test**

Create a test file following the pattern in `backend/src/__tests__/services/profileService.test.ts`. Mock the Supabase client.

The `ReviewService` class receives a `SupabaseClient` via constructor (same DI pattern as `ProfileService` at `backend/src/services/profileService.ts:6`).

Test `getMatchReview(matchId: string, requestingPlayerId: string)`:

**Happy path test:**
- Mock `supabase.from('matches').select(...).eq('id', matchId).single()` to return a completed match with nested `match_questions` (each having a `questions` with `question_sources`, and `match_answers`)
- Assert the return value conforms to `MatchReviewResponse`
- Assert questions are sorted by `question_order` (1-15)
- Assert `playerAnswer` contains the requesting player's answer and `opponentAnswer` contains the other player's answer
- Assert sources are mapped from snake_case `question_sources` to camelCase `ReviewSource`

**Error case tests:**
- Match not found (Supabase returns error/null) → throws `{ code: REVIEW_ERROR_CODES.MATCH_NOT_FOUND }`
- Requesting player is not `player1_id` or `player2_id` → throws `{ code: REVIEW_ERROR_CODES.NOT_PARTICIPANT }`
- Match status is `'in_progress'` → throws `{ code: REVIEW_ERROR_CODES.MATCH_NOT_REVIEWABLE }`
- Match status is `'waiting'` → throws `{ code: REVIEW_ERROR_CODES.MATCH_NOT_REVIEWABLE }`
- Match status is `'abandoned'` → throws `{ code: REVIEW_ERROR_CODES.MATCH_NOT_REVIEWABLE }`

**Edge case tests:**
- Player timed out on a question (`selected_answer_index: null` in `match_answers`) → `playerAnswer.selectedAnswerIndex` is `null`
- Question has multiple sources → all returned in `sources` array
- Missing answer for a question (no `match_answers` row) → treat as timeout with 0 points

**Step 2: Run test to verify it fails**

Run: `npm run test:backend -- --testPathPattern=services/reviewService`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `backend/src/services/reviewService.ts` with:

- Class `ReviewService` with constructor `(private supabase: SupabaseClient)` — follow `backend/src/services/profileService.ts:5-6`
- Public method `async getMatchReview(matchId: string, requestingPlayerId: string): Promise<MatchReviewResponse>`
- Import `MatchReviewResponse`, `ReviewQuestion`, `ReviewPlayerAnswer`, `ReviewSource`, `ReviewMatchSummary` from `@deenup/shared`
- Import `REVIEW_ERROR_CODES` from `@deenup/shared`

Query strategy — single Supabase call:
```
this.supabase
  .from('matches')
  .select(`
    *,
    match_questions (
      *,
      questions (*,  question_sources (*)),
      match_answers (*)
    ),
    player1:profiles!matches_player1_id_fkey (id, display_name),
    player2:profiles!matches_player2_id_fkey (id, display_name)
  `)
  .eq('id', matchId)
  .single()
```

> **FK name verification (see Risk 3):** The FK constraint names `matches_player1_id_fkey` and `matches_player2_id_fkey` are assumed from PostgreSQL's auto-naming convention (`{table}_{column}_fkey`). Add a code comment in the implementation: `// FK names assumed auto-generated — if this query fails, replace with separate profile fetch (see Risk 3)`. After Task 9, if a Supabase instance is available, verify by running the select query in Supabase SQL Editor or checking `\d matches` for actual constraint names.

Validation order:
1. If no match found → throw `MATCH_NOT_FOUND`
2. If `requestingPlayerId` is neither `player1_id` nor `player2_id` → throw `NOT_PARTICIPANT`
3. If `status !== 'completed'` → throw `MATCH_NOT_REVIEWABLE`

Private mapper method `mapReview(dbMatch, requestingPlayerId)`:
- Determine which DB player is "player" vs "opponent" based on `requestingPlayerId`
- Sort `match_questions` by `question_order`
- For each `match_question`, find the requesting player's `match_answers` entry and the opponent's entry
- Map `question_sources` from snake_case to `ReviewSource` camelCase
- Build `ReviewMatchSummary` with player names from the joined `profiles`
- Return `MatchReviewResponse`

Follow the snake_case → camelCase mapping pattern in `backend/src/services/profileService.ts:73-84`.

**Step 4: Run test to verify it passes**

Run: `npm run test:backend -- --testPathPattern=services/reviewService`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/reviewService.ts backend/src/__tests__/services/reviewService.test.ts
git commit -m "feat(backend): add ReviewService with getMatchReview method"
```

---

### Task 5: Review Route + App Wiring

**Files:**
- Create: `backend/src/routes/review.ts`
- Modify: `backend/src/app.ts`
- Test: `backend/src/__tests__/routes/review.test.ts`

**Step 1: Write the failing test**

Create a test file following the exact pattern in `backend/src/__tests__/routes/auth.test.ts:1-39`.

Mock setup:
- Mock `../../middleware/auth` to inject `req.user = { id: 'uuid-player1', email: 'p1@test.com' }` — same pattern as `backend/src/__tests__/routes/auth.test.ts:14-18`
- Create `mockReviewService` with `getMatchReview: jest.fn()`
- Create Express app, mount review router at `/api/matches`

Test cases (7+ tests organized in `describe` blocks):

**`describe('GET /api/matches/:matchId/review')`:**

1. **200 — happy path:** `mockReviewService.getMatchReview` resolves with a full `MatchReviewResponse`. Assert status 200, response body matches.
2. **403 — not participant:** `mockReviewService.getMatchReview` rejects with `{ code: 'NOT_PARTICIPANT', message: '...' }`. Assert status 403.
3. **404 — match not found:** Service rejects with `{ code: 'MATCH_NOT_FOUND' }`. Assert status 404.
4. **400 — match not reviewable:** Service rejects with `{ code: 'MATCH_NOT_REVIEWABLE' }`. Assert status 400.
5. **400 — invalid matchId format:** Request with `matchId = 'not-a-uuid'`. Assert status 400 with validation error.
6. **500 — unexpected service error:** Service rejects with `{ code: 'INTERNAL_ERROR' }`. Assert status 500.
7. **Verify service is called with correct args:** Assert `getMatchReview` was called with `(matchId, 'uuid-player1')` — the user ID injected by auth mock.

> **Note on 401 unauthenticated scenario:** The 401 path (missing/invalid Bearer token) is covered by the auth middleware's own test suite at `backend/src/__tests__/middleware/auth.test.ts`. The review route tests mock the middleware as authenticated to focus on review-specific behavior (authorization, validation, service error mapping). This is consistent with how `backend/src/__tests__/routes/auth.test.ts` handles auth — it also mocks the middleware globally.

**Step 2: Run test to verify it fails**

Run: `npm run test:backend -- --testPathPattern=routes/review`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `backend/src/routes/review.ts`:
- Export `createReviewRouter(reviewService: ReviewService): Router` — follow factory pattern in `backend/src/routes/auth.ts:32`
- Define `REVIEW_ERROR_STATUS_MAP` mapping error codes to HTTP statuses: `MATCH_NOT_FOUND → 404`, `NOT_PARTICIPANT → 403`, `MATCH_NOT_REVIEWABLE → 400`, `VALIDATION_ERROR → 400`, `INTERNAL_ERROR → 500`
- `handleReviewError(res, err)` — follow pattern at `backend/src/routes/auth.ts:26-30`
- Single route: `GET /:matchId/review` protected by `authMiddleware`
  1. Extract `matchId` from `req.params`
  2. Validate with `validateMatchId` — if invalid, return 400
  3. Extract `userId` from `(req as any).user.id`
  4. Call `reviewService.getMatchReview(matchId, userId)`
  5. Return 200 with result
  6. Catch errors via `handleReviewError`

Modify `backend/src/app.ts`:
- Import `ReviewService` from `'./services/reviewService'`
- Import `createReviewRouter` from `'./routes/review'`
- Instantiate `ReviewService` with `supabaseAdmin` (after line 15)
- Mount: `app.use('/api/matches', createReviewRouter(reviewService))` (after line 18)

**Step 4: Run test to verify it passes**

Run: `npm run test:backend -- --testPathPattern=routes/review`
Expected: PASS

**Step 5: Run all backend tests to verify no regressions**

Run: `npm run test:backend`
Expected: All tests PASS

**Step 6: Commit**

```bash
git add backend/src/routes/review.ts backend/src/__tests__/routes/review.test.ts backend/src/app.ts
git commit -m "feat(backend): add GET /api/matches/:matchId/review route"
```

---

### Task 6: Web Review API Helper

**Files:**
- Create: `web/src/lib/review.ts`
- Test: `web/src/__tests__/lib/review.test.ts`

**Step 1: Write the failing test**

Create a test file following the pattern in `web/src/__tests__/lib/auth.test.ts`.

Mock `global.fetch` using `jest.fn()`.

Test `fetchMatchReview(matchId: string, accessToken: string)`:
- **Happy path:** Mock fetch to return `{ ok: true, json: () => mockReviewResponse }`. Assert the function returns the parsed `MatchReviewResponse`.
- **Unauthorized:** Mock fetch to return `{ ok: false, status: 401, json: () => ({ error: { code: 'INVALID_TOKEN' } }) }`. Assert the function throws the error object.
- **Not found:** Mock fetch returning 404. Assert it throws.
- **Correct URL:** Assert `fetch` was called with `${API_URL}/api/matches/${matchId}/review` and correct Authorization header.

**Step 2: Run test to verify it fails**

Run: `npm run test:web -- --testPathPattern=lib/review`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `web/src/lib/review.ts` following the `apiCall` pattern in `web/src/lib/auth.ts:7-15`:

Export an async function `fetchMatchReview(matchId: string, accessToken: string): Promise<MatchReviewResponse>` that:
1. Calls `fetch(\`\${API_URL}/api/matches/\${matchId}/review\`, { headers: { Authorization: \`Bearer \${accessToken}\` } })`
2. Parses JSON response
3. If `!res.ok`, throws `data.error`
4. Returns `data` typed as `MatchReviewResponse`

Import `MatchReviewResponse` from `@deenup/shared`.
Use the same `API_URL` pattern from `web/src/lib/auth.ts:5`.

**Step 4: Run test to verify it passes**

Run: `npm run test:web -- --testPathPattern=lib/review`
Expected: PASS

**Step 5: Commit**

```bash
git add web/src/lib/review.ts web/src/__tests__/lib/review.test.ts
git commit -m "feat(web): add fetchMatchReview API helper"
```

---

### Task 7: Web Review Page

**Files:**
- Create: `web/src/app/match/[matchId]/review/page.tsx`

**Step 1: Write the failing test**

Create `web/src/__tests__/app/match-review-page.test.tsx` (note `.tsx` extension for JSX support):

**Smoke test (module export):**
- Import the page component
- Assert it's a function (React component)

**Render test (loading state):**
- Mock `next/navigation`'s `useParams` to return `{ matchId: 'test-uuid' }`
- Mock `web/src/lib/review.ts`'s `fetchMatchReview` to return a pending promise (never resolves during test)
- Mock `web/src/lib/supabase.ts`'s `supabase.auth.getSession` to return a mock session with `access_token`
- Call `render(<MatchReviewPage />)` using React Testing Library (if `@testing-library/react` is available in web devDependencies — check first; if not, install it as a devDependency)
- Assert the loading state renders without throwing (e.g., expect the document body to contain text like "Chargement" or a loading indicator)
- This catches import errors, JSX compilation issues, and basic hook wiring problems

> **Why this level of testing:** The web review page is the most complex UI component in this plan (question cards, source sections, loading/error/success states). A render smoke test provides much more confidence than a module-export-only test, catching common issues like missing imports, broken JSX, or hook errors.

**Step 2: Run test to verify it fails**

Run: `npm run test:web -- --testPathPattern=match-review-page`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `web/src/app/match/[matchId]/review/page.tsx`:

This is a client component (`'use client'`) that:

1. **State management:** Uses `useState` for `reviewData`, `isLoading`, `error`
2. **Auth:** Gets session via `supabase.auth.getSession()` from `web/src/lib/supabase.ts`. This is the first client component in the web app to use this pattern directly. It works because the Supabase client in `web/src/lib/supabase.ts` is configured with `persistSession: true` and `autoRefreshToken: true`, so the session is available client-side from localStorage. If this fails in practice (e.g., cookies-only auth is enforced by middleware), fall back to a Next.js API route proxy as noted in Risk 4.
3. **Data fetching:** On mount, calls `fetchMatchReview(matchId, session.access_token)` from `web/src/lib/review.ts`
4. **Layout** (follow the inline style pattern from `web/src/app/match/page.tsx`):

   **Header section:**
   - Back link "← Tableau de bord" to `/dashboard` (same pattern as `web/src/app/match/page.tsx:7`)
   - Match summary card: player names, scores (large), winner indicator, ELO deltas (±N), theme name

   **Questions list:**
   - Scrollable list of 15 question cards, each showing:
     - Question number badge (1-15) + difficulty label
     - Question text (`questionText`)
     - 4 answer option buttons with visual indicators:
       - Correct answer: green background/border
       - Player's wrong answer: red background/border
       - Player timeout (`selectedAnswerIndex === null`): grey badge "Temps écoulé"
       - Opponent's answer: subtle icon/indicator
     - Time taken display
     - Points earned display
     - Explanation text in a highlighted box
     - Collapsible "Sources" section showing each source: type badge, reference, optional excerpt

   **Footer:**
   - "Revanche" button — disabled with tooltip "Bientôt disponible" (match creation flow doesn't exist yet)

   **Loading state:** Spinner/skeleton
   **Error state:** Error message with retry button

All text in French per MVP scope.

**Step 4: Run test to verify it passes**

Run: `npm run test:web -- --testPathPattern=match-review-page`
Expected: PASS

**Step 5: Commit**

```bash
git add "web/src/app/match/[matchId]/review/page.tsx" web/src/__tests__/app/match-review-page.test.tsx
git commit -m "feat(web): add post-match review page with question cards and sources"
```

---

### Task 8: Mobile useMatchReview Hook

**Files:**
- Create: `mobile/src/hooks/useMatchReview.ts`
- Test: `mobile/src/__tests__/hooks/useMatchReview.test.ts`

**Step 1: Write the failing test**

Create a test file following the pattern in `mobile/src/__tests__/hooks/useAuth.test.ts`.

Since `useMatchReview` is a custom hook that wraps `fetch`, test it by:
- Mocking `global.fetch`
- Mocking the Supabase client (via the module mapper in `mobile/jest.config.js`)
- Testing the hook's exported type/existence (minimal approach matching existing pattern)

Test cases:
- **Module exports:** `useMatchReview` is exported as a function
- **Return type:** Returns an object (validated at runtime by calling with a mock matchId in a test component if `renderHook` is available)

Note: The existing mobile test pattern (`mobile/src/__tests__/hooks/useAuth.test.ts`) uses minimal module-export verification. Follow this same lightweight approach. If `@testing-library/react-native`'s `renderHook` is available, add state transition tests (loading → success, loading → error).

**Step 2: Run test to verify it fails**

Run: `npm run test:mobile -- --testPathPattern=hooks/useMatchReview`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

Create `mobile/src/hooks/useMatchReview.ts`:

Export a custom hook `useMatchReview(matchId: string)` that returns `{ data: MatchReviewResponse | null, isLoading: boolean, error: any }`.

Implementation approach (follow patterns from `mobile/src/contexts/AuthContext.tsx:30-42`):
1. Use `useState` for `data`, `isLoading` (initially `true`), `error`
2. Use `useEffect` with `matchId` dependency
3. In the effect, get session via `supabase.auth.getSession()` from `mobile/src/lib/supabase.ts`
4. Call `fetch(\`\${API_URL}/api/matches/\${matchId}/review\`, { headers: { Authorization: \`Bearer \${session.access_token}\` } })`
5. Parse JSON, set `data` on success, set `error` on failure
6. Set `isLoading: false` in `finally` block

Import `MatchReviewResponse` from `@deenup/shared`.
Use the `API_URL` pattern from `mobile/src/contexts/AuthContext.tsx:6`.

> **Follow-up note:** This task creates the data-fetching hook only. A mobile `ReviewScreen` component (React Native view consuming `useMatchReview`) is a follow-up task, not included in this plan. The hook is built first so that the data layer is ready when the screen is implemented. The screen depends on React Navigation setup which is not yet in place.

**Step 4: Run test to verify it passes**

Run: `npm run test:mobile -- --testPathPattern=hooks/useMatchReview`
Expected: PASS

**Step 5: Commit**

```bash
git add mobile/src/hooks/useMatchReview.ts mobile/src/__tests__/hooks/useMatchReview.test.ts
git commit -m "feat(mobile): add useMatchReview hook for review data fetching"
```

---

### Task 9: Final Integration Verification

**Files:**
- No new files — verification only

**Step 1: Run all tests across all workspaces**

```bash
npm run test:shared
npm run test:backend
npm run test:web
npm run test:mobile
```

Expected: All PASS, zero regressions.

**Step 2: Verify shared package builds**

```bash
npm run build --workspace=shared
```

Expected: Clean TypeScript compilation, all new types and constants exported.

**Step 3: Verify backend builds**

```bash
npm run build --workspace=backend
```

Expected: Clean compilation, `ReviewService` and review route properly imported and wired in `app.ts`.

**Step 4: Verify Supabase FK join names (if Supabase instance is available)**

If a running Supabase instance is available, verify the FK constraint names used in the `ReviewService` select query:
```bash
# In Supabase SQL Editor or psql:
SELECT conname FROM pg_constraint WHERE conrelid = 'matches'::regclass AND contype = 'f';
```
Expected: Constraint names include `matches_player1_id_fkey` and `matches_player2_id_fkey`. If they differ, update the select query in `reviewService.ts` accordingly. If no Supabase instance is available, skip — this will be verified during the first real integration test.

**Step 5: Commit (if any fixes were needed)**

```bash
git add -A
git commit -m "fix: resolve integration issues from review feature"
```

---

## Testing Strategy

### Overall Approach

TDD (Red-Green-Refactor) at every layer:

1. **Shared package tests** — Type conformance tests ensure interfaces compile correctly and constants have expected values. These are fast, pure TypeScript checks.

2. **Backend validator tests** — Pure function tests with no mocks. Input → output validation for UUID format checking.

3. **Backend service tests** — Unit tests with mocked Supabase client. Test the full `ReviewService.getMatchReview()` method including:
   - Query construction (verify `.from()`, `.select()`, `.eq()` are called correctly)
   - Authorization logic (participant check)
   - Status validation (only completed matches)
   - Data mapping (snake_case DB → camelCase API)
   - Edge cases (timeouts, missing answers, multiple sources)

4. **Backend route tests** — Integration tests with supertest and mocked service. Test HTTP concerns:
   - Status codes for each error scenario
   - Request validation (invalid UUID format)
   - Auth middleware integration
   - Response body structure

5. **Web API helper tests** — Mock `fetch`, test the `fetchMatchReview` wrapper handles success/error responses correctly.

6. **Mobile hook tests** — Test the `useMatchReview` hook's state management and fetch logic.

### Test Data Strategy

Since no match gameplay exists yet, all tests use mock/fixture data:
- Backend service tests: Mock Supabase responses with realistic match structures
- Backend route tests: Mock the ReviewService entirely (no DB interaction)
- Frontend tests: Mock the fetch API with realistic response bodies

### Key Test Scenarios (from design.md)

| # | Scenario | Layer | Expected |
|---|----------|-------|----------|
| 1 | Happy path — full 15-question review | Service + Route | 200 with complete MatchReviewResponse |
| 2 | Unauthenticated request | Auth middleware tests (not review route tests) | 401 |
| 3 | Non-participant access | Service + Route | 403 |
| 4 | Match not found | Service + Route | 404 |
| 5 | Match in_progress | Service + Route | 400 MATCH_NOT_REVIEWABLE |
| 6 | Match waiting | Service | 400 MATCH_NOT_REVIEWABLE |
| 7 | Match abandoned | Service | 400 MATCH_NOT_REVIEWABLE |
| 8 | Invalid UUID format | Route (validator) | 400 VALIDATION_ERROR |
| 9 | Timeout answer (null) | Service | selectedAnswerIndex: null |
| 10 | Multiple sources per question | Service | All sources in array |
| 11 | Missing answer row | Service | Treated as timeout |
| 12 | Question ordering | Service | Sorted by questionOrder 1-15 |

### Commands

```bash
# Run review tests only (fastest feedback loop)
npm run test:backend -- --testPathPattern=review

# Run all backend tests (regression check)
npm run test:backend

# Run shared tests
npm run test:shared

# Run all workspace tests
npm test
```

---

## Risks and Mitigations

### Risk 1: Supabase nested select query shape may not work as expected
- **Severity:** Medium
- **Detail:** The review query uses PostgREST nested selects across 4+ table joins (`matches → match_questions → questions → question_sources` + `match_questions → match_answers` + `matches → profiles`). The exact FK relationship names for the profile joins (`matches_player1_id_fkey`, `matches_player2_id_fkey`) must match what Supabase auto-generates.
- **Mitigation:** If the nested select fails, fall back to 2-3 sequential queries: (1) fetch match, (2) fetch match_questions with questions and sources, (3) fetch match_answers. This is slower but functionally identical. The service tests mock Supabase, so this risk only surfaces in real integration testing.

### Risk 2: No match gameplay data exists for manual testing
- **Severity:** Low
- **Detail:** The review endpoint depends on completed matches with answers in the database. No match creation/gameplay service exists yet.
- **Mitigation:** All tests use mocked data. For manual testing, create a seed script that inserts a completed match with 15 questions, 30 answers, and sources directly via Supabase admin client. This is a future task and not blocking the review feature implementation.

### Risk 3: Profile FK join names for Supabase
- **Severity:** Medium
- **Detail:** Joining `profiles` twice (for player1 and player2) requires specifying the FK constraint name in Supabase's `.select()` syntax. The exact names depend on how the migration defined the foreign keys.
- **Mitigation:** Check the migration `004_create_matches.sql` for FK constraint names. If the auto-generated names don't match, use the alternative Supabase syntax with `!inner` or explicit FK hints. Worst case: fetch profiles in a separate query.

### Risk 4: Web page auth token retrieval
- **Severity:** Low
- **Detail:** The web review page needs the user's access token to call the backend API. The existing web auth uses cookies, but the `fetchMatchReview` helper needs a Bearer token. `supabase.auth.getSession()` should provide this client-side.
- **Mitigation:** Follow the same pattern used in `web/src/lib/auth.ts` where the Supabase session provides the access token. If cookies-only auth is enforced, add a proxy API route in Next.js.

### Risk 5: Rematch button depends on unbuilt match creation flow
- **Severity:** Low
- **Detail:** REQ-10 requires a "Revanche" button that pre-selects the opponent in match creation. This flow doesn't exist yet.
- **Mitigation:** Render the button as disabled with French tooltip "Bientôt disponible". Wire the navigation once match creation is implemented. This is explicitly noted in the design doc's open questions.

---

## File Changes Summary

| File | Action | Task |
|------|--------|------|
| `shared/src/constants/review.ts` | create | Task 1 |
| `shared/src/__tests__/review-constants.test.ts` | create | Task 1 |
| `shared/src/index.ts` | modify | Task 1, Task 2 |
| `shared/src/types/review.ts` | create | Task 2 |
| `shared/src/__tests__/review-types.test.ts` | create | Task 2 |
| `backend/src/validators/review.ts` | create | Task 3 |
| `backend/src/__tests__/validators/review.test.ts` | create | Task 3 |
| `backend/src/services/reviewService.ts` | create | Task 4 |
| `backend/src/__tests__/services/reviewService.test.ts` | create | Task 4 |
| `backend/src/routes/review.ts` | create | Task 5 |
| `backend/src/__tests__/routes/review.test.ts` | create | Task 5 |
| `backend/src/app.ts` | modify | Task 5 |
| `web/src/lib/review.ts` | create | Task 6 |
| `web/src/__tests__/lib/review.test.ts` | create | Task 6 |
| `web/src/app/match/[matchId]/review/page.tsx` | create | Task 7 |
| `web/src/__tests__/app/match-review-page.test.tsx` | create | Task 7 |
| `mobile/src/hooks/useMatchReview.ts` | create | Task 8 |
| `mobile/src/__tests__/hooks/useMatchReview.test.ts` | create | Task 8 |

---

## Review Responses

This section documents the reviewer's feedback (from `plan-review.md`) and how each gap was addressed.

### Gap 1 (MEDIUM): Web Review Page test is too minimal
**Reviewer:** Task 7 only checks module exports a function — no render/smoke test. Most complex UI component gets weakest coverage.
**Action: REVISED.** Task 7, Step 1 now includes a full render smoke test using React Testing Library with mocked `useParams`, `fetchMatchReview`, and `supabase.auth.getSession`. Test file renamed to `.tsx` for JSX support. The test verifies the loading state renders without throwing, catching import errors, JSX compilation issues, and hook wiring problems. Added explanatory note on why this level of testing is appropriate.

### Gap 2 (MEDIUM): Supabase FK constraint names not runtime-verified
**Reviewer:** FK names `matches_player1_id_fkey` and `matches_player2_id_fkey` are assumed auto-generated but not verified. Service tests mock Supabase, so mismatches won't surface until integration.
**Action: REVISED.** Added explicit FK verification note in Task 4's query strategy section with a code comment to include in implementation. Added a new Step 4 in Task 9 to verify FK constraint names via SQL query against a running Supabase instance (if available). Risk 3 mitigation remains as the fallback strategy.

### Gap 3 (MEDIUM): No explicit 401 test in review route tests
**Reviewer:** Test scenario #2 lists "Unauthenticated request → 401" but Task 5 mocks auth middleware to always pass.
**Action: REVISED.** Added clarification note in Task 5 explaining that the 401 path is covered by the auth middleware's own test suite (`backend/src/__tests__/middleware/auth.test.ts`), not the review route tests. Updated Testing Strategy table scenario #2 to specify "Auth middleware tests (not review route tests)" as the testing layer. This is consistent with how `auth.test.ts` route tests handle auth.

### Gap 4 (LOW): Client-side getSession pattern not verified
**Reviewer:** Task 7 is the first web client component to use `supabase.auth.getSession()` directly. Risk 4 acknowledges this but no concrete verification exists.
**Action: REVISED.** Added detailed explanation in Task 7, Step 3 (auth section) explaining why `getSession()` works client-side (Supabase client configured with `persistSession: true`), and what the fallback is (Next.js API route proxy per Risk 4). This gives the implementer enough context to diagnose issues if the pattern doesn't work as expected.

### Gap 5 (LOW): eloAfter nullable type not justified
**Reviewer:** `ReviewMatchSummary.eloAfter` is `number | null` but plan requires completed matches. If ELO is always calculated on completion, nullable may be unnecessary.
**Action: REVISED.** Added justification note in Task 2, Step 3: the DB schema allows NULL for `player1_elo_after`/`player2_elo_after`, and ELO calculation may be deferred or fail. Keeping the type nullable is the safe default — if ELO is always calculated synchronously, the null path simply never triggers. The UI should display "—" for null values.

### Gap 6 (LOW): Mobile hook has no UI consumer
**Reviewer:** Task 8 creates `useMatchReview` but no mobile ReviewScreen is created in this plan.
**Action: REVISED.** Added follow-up note in Task 8 explicitly stating that a mobile `ReviewScreen` component is a follow-up task. The hook is built first so the data layer is ready. The screen depends on React Navigation setup which is not yet in place.
