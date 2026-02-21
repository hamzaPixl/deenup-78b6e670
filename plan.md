# Question Management & Validation Implementation Plan

> **For Claude:** Execute this plan task-by-task, using TDD methodology and committing after each task.

**Goal:** Build the complete question management subsystem — shared types, database schema, backend API, and admin web UI — enabling creation, validation, and moderation of Islamic quiz questions with mandatory source citations.

**Architecture:** Monorepo feature spanning `@deenup/shared` (types/constants), `@deenup/backend` (Express REST API), and `@deenup/web` (Next.js admin pages). Data stored in Supabase PostgreSQL with RLS. Questions follow a `draft → pending_review → approved | rejected` lifecycle. All questions require at least one source citation (Quran, Hadith, or Fiqh).

**Tech Stack:** TypeScript, Express.js, Next.js 14 (App Router), Supabase (PostgreSQL + Auth), Jest + Supertest

---

## Tasks

### Task 1: Shared Types — Question Domain Types

**Files:**
- Create: `shared/src/types/question.ts`
- Test: `shared/src/__tests__/question-types.test.ts`

**Step 1: Write the failing test**

Create `shared/src/__tests__/question-types.test.ts` following the exact pattern in `shared/src/__tests__/auth-types.test.ts`. Import all types and constants from `../index`. Write tests that:

- Construct a valid `QuestionOption` object with `{ text: string, isCorrect: boolean }`
- Construct a valid `QuestionSource` object with `{ id, questionId, type: 'quran', reference: 'Al-Baqarah:255', detail: null, createdAt }`
- Construct a valid `Question` object with all fields (id, text, theme, difficulty, type, options, explanation, status, language, createdBy, reviewedBy, reviewedAt, reviewerNotes, createdAt, updatedAt)
- Construct a valid `CreateQuestionRequest` with text, theme, difficulty, type, options array, explanation, sources array, and optional language
- Construct a valid `QuestionReport` with id, questionId, reportedBy, reason, description, resolved, resolvedBy, resolvedAt, createdAt
- Verify the `Question.status` field accepts all 4 values: `'draft'`, `'pending_review'`, `'approved'`, `'rejected'`
- Verify `QuestionSource.type` accepts `'quran'`, `'hadith'`, `'fiqh'`

**Step 2: Run test to verify it fails**

Run: `cd shared && npx jest --verbose`
Expected: FAIL — imports not found

**Step 3: Write the types**

Create `shared/src/types/question.ts` with these interfaces (behavior, not code):

- `QuestionOption` — shape: `{ text: string, isCorrect: boolean }`
- `QuestionSource` — shape: `{ id: string, questionId: string, type: SourceType, reference: string, detail: string | null, createdAt: string }`
- `Question` — all columns from the design's `questions` table, using TypeScript string types. `options` is `QuestionOption[]`. `reviewedBy`, `reviewedAt`, `reviewerNotes` are nullable.
- `QuestionReport` — all columns from the design's `question_reports` table. `description`, `resolvedBy`, `resolvedAt` are nullable.
- `CreateQuestionRequest` — fields needed to create a question: `text`, `theme`, `difficulty`, `type`, `options: QuestionOption[]`, `explanation`, `sources: CreateSourceInput[]`, optional `language`
- `CreateSourceInput` — shape: `{ type: SourceType, reference: string, detail?: string }`
- `UpdateQuestionRequest` — same as Create but all fields optional via `Partial<>`
- `QuestionFilters` — optional fields: `theme`, `difficulty`, `status`, `search` (text search), `language`, `limit`, `cursor`
- `QuestionListResponse` — shape: `{ data: Question[], nextCursor: string | null, total: number }`
- `ReviewAction` — shape: `{ action: 'approve' | 'reject', notes?: string }`

Use string literal union types for: `QuestionStatus`, `QuestionDifficulty`, `QuestionTheme`, `QuestionType`, `SourceType`, `ReportReason` — export these as type aliases.

**Step 4: Run test to verify it passes**

Run: `cd shared && npx jest --verbose`
Expected: PASS — all type construction tests green

**Step 5: Commit**

```bash
git add shared/src/types/question.ts shared/src/__tests__/question-types.test.ts
git commit -m "feat(shared): add question domain types with tests"
```

---

### Task 2: Shared Constants — Question Domain Constants

**Files:**
- Create: `shared/src/constants/question.ts`
- Modify: `shared/src/__tests__/question-types.test.ts` (add constant tests)

**Step 1: Write the failing test**

Add a new `describe('Question Constants', ...)` block to the existing test file. Test that:

- `THEMES` array contains exactly the 8 theme values from CLAUDE.md: `'quran'`, `'jurisprudence'`, `'prophets'`, `'prophet_muhammad'`, `'islamic_history'`, `'companions'`, `'islamic_texts'`, `'general_culture'`
- `DIFFICULTIES` array contains `['easy', 'medium', 'advanced']`
- `QUESTION_TYPES` array contains `['qcm', 'true_false']`
- `QUESTION_STATUSES` array contains `['draft', 'pending_review', 'approved', 'rejected']`
- `SOURCE_TYPES` array contains `['quran', 'hadith', 'fiqh']`
- `REPORT_REASONS` array contains `['inaccurate', 'offensive', 'duplicate', 'wrong_source', 'other']`
- `QUESTION_DEFAULTS.MIN_TEXT_LENGTH` equals 10
- `QUESTION_DEFAULTS.MAX_TEXT_LENGTH` equals 2000
- `QUESTION_DEFAULTS.MIN_EXPLANATION_LENGTH` equals 20
- `QUESTION_DEFAULTS.MAX_EXPLANATION_LENGTH` equals 5000
- `QUESTION_DEFAULTS.QCM_OPTION_COUNT` equals 4
- `QUESTION_DEFAULTS.TRUE_FALSE_OPTION_COUNT` equals 2
- `QUESTION_DEFAULTS.DEFAULT_LANGUAGE` equals `'fr'`
- `QUESTION_DEFAULTS.DEFAULT_PAGE_LIMIT` equals 20
- `QUESTION_DEFAULTS.MAX_PAGE_LIMIT` equals 100
- `QUESTION_RATE_LIMITS.CREATE.maxRequests` equals 30
- `QUESTION_RATE_LIMITS.CREATE.windowMs` equals `3_600_000` (1 hour)
- `QUESTION_ERROR_CODES` contains keys: `SOURCE_REQUIRED`, `INVALID_OPTION_COUNT`, `INVALID_CORRECT_COUNT`, `SELF_REVIEW_FORBIDDEN`, `INVALID_STATUS_TRANSITION`, `QUESTION_NOT_FOUND`, `REPORT_THRESHOLD_REACHED`
- `REPORT_AUTO_FLAG_THRESHOLD` equals 3

**Step 2: Run test to verify it fails**

Run: `cd shared && npx jest --verbose`
Expected: FAIL — constants not found

**Step 3: Write the constants**

Create `shared/src/constants/question.ts` following the exact pattern in `shared/src/constants/auth.ts` (use `as const` assertions). Define all the constants listed in the test expectations above.

**Step 4: Run test to verify it passes**

Run: `cd shared && npx jest --verbose`
Expected: PASS — all constant tests green

**Step 5: Commit**

```bash
git add shared/src/constants/question.ts shared/src/__tests__/question-types.test.ts
git commit -m "feat(shared): add question domain constants with tests"
```

---

### Task 3: Shared Barrel Exports & User Role Extension

**Files:**
- Modify: `shared/src/index.ts`
- Modify: `shared/src/types/auth.ts`
- Modify: `shared/src/__tests__/auth-types.test.ts` (add role test)
- Modify: `shared/src/__tests__/question-types.test.ts` (verify imports from index)

**Step 1: Write the failing test**

Add a test in `auth-types.test.ts` verifying that `User` interface accepts a `role` field with values `'player'`, `'moderator'`, or `'admin'`.

Also add an import test in `question-types.test.ts` verifying all question types and constants are importable from `'../index'` (not from deep paths).

**Step 2: Run tests to verify they fail**

Run: `cd shared && npx jest --verbose`
Expected: FAIL — `role` not on `User`, question exports not in index

**Step 3: Implement changes**

- Add `role: 'player' | 'moderator' | 'admin'` field to the `User` interface in `shared/src/types/auth.ts`
- Export a `UserRole` type alias from `shared/src/types/auth.ts`
- Update `shared/src/index.ts` to re-export all question types (using `export type { ... }`) and question constants (using `export { ... }`) — follow the exact pattern of the existing auth exports

**Step 4: Run tests to verify they pass**

Run: `cd shared && npx jest --verbose`
Expected: PASS — all tests green (auth + question)

**Step 5: Commit**

```bash
git add shared/src/index.ts shared/src/types/auth.ts shared/src/__tests__/auth-types.test.ts shared/src/__tests__/question-types.test.ts
git commit -m "feat(shared): add user role field and export question types"
```

---

### Task 4: Database Migration Script

**Files:**
- Create: `scripts/db/001_questions.sql`

**Step 1: Write the migration SQL**

Create the SQL migration file following the data model in `design.md`. The script should be idempotent (use `CREATE TABLE IF NOT EXISTS` or start with drops). Include:

1. **`questions` table** — All columns from the design with:
   - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
   - CHECK constraints on `theme` (must be one of the 8 themes), `difficulty` (easy/medium/advanced), `type` (qcm/true_false), `status` (draft/pending_review/approved/rejected)
   - `text` with `CHECK (char_length(text) >= 10)`
   - `explanation` with `CHECK (char_length(explanation) >= 20)`
   - Default `status = 'draft'`, default `language = 'fr'`
   - `created_by uuid REFERENCES auth.users(id) NOT NULL`
   - `reviewed_by uuid REFERENCES auth.users(id)`
   - Timestamps with defaults

2. **`question_sources` table** — All columns with:
   - FK to `questions.id` with `ON DELETE CASCADE`
   - CHECK on `type` (quran/hadith/fiqh)

3. **`question_reports` table** — All columns with:
   - FK to `questions.id` with `ON DELETE CASCADE`
   - FK to `auth.users` for `reported_by` and `resolved_by`
   - CHECK on `reason` (inaccurate/offensive/duplicate/wrong_source/other)
   - Default `resolved = false`

4. **Indexes** — On `questions(theme)`, `questions(difficulty)`, `questions(status)`, `questions(created_by)`, `questions(language)`, `question_sources(question_id)`, `question_reports(question_id)`, `question_reports(resolved)`

5. **`updated_at` trigger** — Create a function `update_updated_at_column()` that sets `updated_at = now()` on UPDATE, and attach it to the `questions` table

6. **RLS Policies:**
   - Enable RLS on all 3 tables
   - `questions` SELECT: anyone can read `status = 'approved'`; users with role `admin` or `moderator` (checked via `auth.jwt() -> 'app_metadata' ->> 'role'`) can read all
   - `questions` INSERT/UPDATE: admin/moderator only
   - `questions` DELETE: admin only
   - `question_sources`: follow parent question access (JOIN on question_id)
   - `question_reports` INSERT: any authenticated user
   - `question_reports` SELECT/UPDATE: admin/moderator only

**Step 2: Verify the SQL**

Run: `psql $DATABASE_URL -f scripts/db/001_questions.sql` (against local Supabase or test DB)
Expected: No errors; tables, indexes, and policies created

**Note:** If no local database is available, verify syntax by reading the SQL carefully. The migration will be tested against Supabase during integration.

**Step 3: Commit**

```bash
git add scripts/db/001_questions.sql
git commit -m "feat(db): add question tables migration with RLS policies"
```

---

### Task 5: Backend Foundation — Express App, Supabase Client, Auth Middleware

**Files:**
- Create: `backend/src/index.ts`
- Create: `backend/src/db/supabase.ts`
- Create: `backend/src/middleware/auth.ts`
- Create: `backend/src/__tests__/auth-middleware.test.ts`

**Step 1: Write the failing test**

Create `backend/src/__tests__/auth-middleware.test.ts`. Test the auth middleware functions by mocking the Supabase client:

- `authenticateUser` middleware: test that it extracts the Bearer token from `Authorization` header, calls Supabase `auth.getUser()`, attaches `req.user` on success, returns 401 if no token, returns 401 if invalid token
- `requireRole('admin')` middleware: test that it returns 403 if `req.user.role` is not `admin`, passes through if role matches
- `requireRole('moderator')` middleware: test that it allows both `admin` and `moderator` roles (admin is always permitted)

Use Jest manual mocks for the Supabase client. Mock `express.Request` and `express.Response` objects.

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest --verbose`
Expected: FAIL — files not found

**Step 3: Implement**

- **`backend/src/db/supabase.ts`** — Initialize and export a Supabase client using `createClient()` from `@supabase/supabase-js` with `process.env.SUPABASE_URL` and `process.env.SUPABASE_SERVICE_ROLE_KEY`. Export both a service-role client (for admin operations bypassing RLS) and a function to create a per-request client with the user's JWT (for RLS-respecting operations).

- **`backend/src/middleware/auth.ts`** — Export:
  - `authenticateUser`: Express middleware that extracts Bearer token, calls `supabase.auth.getUser(token)`, fetches user role from `app_metadata`, attaches `{ id, email, role }` to `req.user`. Returns 401 JSON on failure.
  - `requireRole(...roles: string[])`: Middleware factory that checks `req.user.role` against the allowed roles. Admin role always passes. Returns 403 JSON on failure.
  - `optionalAuth`: Express middleware that tries to authenticate but doesn't fail — sets `req.user` if token is valid, otherwise leaves it undefined. Used for public endpoints where admin gets extra data.

- **`backend/src/index.ts`** — Basic Express app setup:
  - Import express, cors, dotenv
  - `dotenv.config()`
  - Create express app with `express.json()`, `cors()` middleware
  - Mount question routes at `/api/questions` (placeholder import — will be created in Task 7)
  - Mount report routes at `/api/reports` (placeholder import — will be created in Task 9)
  - Global error handler middleware
  - Export the app (for supertest) and start server if `NODE_ENV !== 'test'`
  - Listen on `process.env.PORT || 3001`

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/index.ts backend/src/db/supabase.ts backend/src/middleware/auth.ts backend/src/__tests__/auth-middleware.test.ts
git commit -m "feat(backend): add Express app, Supabase client, and auth middleware"
```

---

### Task 6: Backend Validation Middleware

**Files:**
- Create: `backend/src/middleware/validate.ts`
- Create: `backend/src/__tests__/validate-middleware.test.ts`

**Step 1: Write the failing test**

Create `backend/src/__tests__/validate-middleware.test.ts`. Test the `validateCreateQuestion` and `validateUpdateQuestion` middleware functions:

- **Valid QCM request** — passes validation (calls `next()`)
- **Valid True/False request** — passes validation
- **Missing `text`** — returns 400 with appropriate error message
- **`text` too short** (< 10 chars) — returns 400
- **`text` too long** (> 2000 chars) — returns 400
- **Invalid `theme`** (not in THEMES array) — returns 400
- **Invalid `difficulty`** — returns 400
- **Invalid `type`** — returns 400
- **QCM with 3 options** instead of 4 — returns 400, error references `INVALID_OPTION_COUNT`
- **QCM with 5 options** — returns 400
- **QCM with 0 correct answers** — returns 400, error references `INVALID_CORRECT_COUNT`
- **QCM with 2 correct answers** — returns 400
- **True/False with 4 options** — returns 400
- **Empty sources array** — returns 400, error references `SOURCE_REQUIRED`
- **Source with invalid type** — returns 400
- **`explanation` too short** (< 20 chars) — returns 400
- **`explanation` too long** (> 5000 chars) — returns 400
- **Option with empty text** — returns 400

Use mocked `Request`/`Response` objects. Import validation constants from `@deenup/shared`.

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/__tests__/validate-middleware.test.ts --verbose`
Expected: FAIL

**Step 3: Implement**

Create `backend/src/middleware/validate.ts`:

- `validateCreateQuestion`: Express middleware that validates the full `CreateQuestionRequest` body against all rules from the design document. Uses constants from `@deenup/shared` (`THEMES`, `DIFFICULTIES`, `QUESTION_TYPES`, `SOURCE_TYPES`, `QUESTION_DEFAULTS`). On failure, returns 400 JSON with `{ error: { code: 'VALIDATION_ERROR', message: '...' } }`.
- `validateUpdateQuestion`: Same rules but all fields are optional (only validate fields that are present in the body).
- Helper function `validateOptions(type, options)` — checks correct count based on question type and exactly 1 correct answer.
- Helper function `validateSources(sources)` — checks array is non-empty, each source has valid type and non-empty reference.

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/__tests__/validate-middleware.test.ts --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/middleware/validate.ts backend/src/__tests__/validate-middleware.test.ts
git commit -m "feat(backend): add question validation middleware with tests"
```

---

### Task 7: Backend Question Service & Routes — CRUD

**Files:**
- Create: `backend/src/services/question.ts`
- Create: `backend/src/routes/questions.ts`
- Create: `backend/src/__tests__/question-routes.test.ts`

**Step 1: Write the failing test**

Create `backend/src/__tests__/question-routes.test.ts`. Use `supertest` to test the Express app. Mock the Supabase client at the module level. Test these scenarios:

**Create (POST /api/questions):**
- Valid request → 201, returns created question with sources, status is `'draft'`
- Missing auth → 401
- Non-admin role → 403
- Validation failure (missing source) → 400

**Read single (GET /api/questions/:id):**
- Approved question, no auth → 200, returns question with sources
- Draft question, no auth → 404
- Draft question, admin auth → 200

**List (GET /api/questions):**
- No auth → returns only approved questions
- Admin auth → returns all questions
- Filter by theme → only matching theme returned
- Filter by difficulty → only matching difficulty returned
- Pagination: `?limit=2` → max 2 results with `nextCursor`

**Update (PUT /api/questions/:id):**
- Valid update → 200, updated fields reflect changes
- Update approved question → status resets to `'draft'`
- Non-admin → 403

**Delete (DELETE /api/questions/:id):**
- Admin → 200, question removed
- Moderator → 403
- Non-admin → 403

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/__tests__/question-routes.test.ts --verbose`
Expected: FAIL

**Step 3: Implement**

**`backend/src/services/question.ts`** — Business logic layer (all database operations via Supabase client):

- `createQuestion(data: CreateQuestionRequest, userId: string)`: Inserts into `questions` table, then inserts sources into `question_sources`. Returns the full question with sources. Sets `created_by = userId`, `status = 'draft'`.
- `getQuestion(id: string, includeNonApproved: boolean)`: Fetches question by ID with its sources. If `includeNonApproved` is false, only returns if `status = 'approved'`.
- `listQuestions(filters: QuestionFilters, includeAllStatuses: boolean)`: Builds Supabase query with optional filters (theme, difficulty, status, text search via `ilike`). Implements cursor-based pagination using `created_at` + `id`. Default limit 20, max 100.
- `updateQuestion(id: string, data: UpdateQuestionRequest)`: Updates question fields. If the question was `'approved'`, resets `status` to `'draft'`. Updates `updated_at`.
- `deleteQuestion(id: string)`: Deletes the question (cascade deletes sources and reports).

**`backend/src/routes/questions.ts`** — Express router:

- `POST /` — `authenticateUser`, `requireRole('moderator')`, `validateCreateQuestion`, calls `createQuestion`
- `GET /` — Optional auth (try to authenticate but don't fail). If admin/moderator, `listQuestions(filters, true)`. Otherwise, `listQuestions(filters, false)`.
- `GET /:id` — Optional auth. If admin/moderator, `getQuestion(id, true)`. Otherwise, `getQuestion(id, false)`.
- `PUT /:id` — `authenticateUser`, `requireRole('moderator')`, `validateUpdateQuestion`, calls `updateQuestion`
- `DELETE /:id` — `authenticateUser`, `requireRole('admin')`, calls `deleteQuestion`
- Rate limiting on POST: use `express-rate-limit` with `QUESTION_RATE_LIMITS.CREATE` from shared constants

Wire this router into `backend/src/index.ts` at `/api/questions`.

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/__tests__/question-routes.test.ts --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/question.ts backend/src/routes/questions.ts backend/src/__tests__/question-routes.test.ts backend/src/index.ts
git commit -m "feat(backend): add question CRUD service and routes with tests"
```

---

### Task 8: Backend Review Workflow Endpoints

**Files:**
- Modify: `backend/src/services/question.ts` (add review methods)
- Modify: `backend/src/routes/questions.ts` (add review routes)
- Create: `backend/src/__tests__/review-workflow.test.ts`

**Step 1: Write the failing test**

Create `backend/src/__tests__/review-workflow.test.ts`. Use supertest with mocked Supabase. Test:

**Submit for review (POST /api/questions/:id/submit-review):**
- Draft question → 200, status becomes `'pending_review'`
- Already pending_review → 400, invalid status transition
- Approved question → 400, invalid status transition
- Non-creator submitting → 403 [NEEDS CLARIFICATION: design says "Admin/Moderator (creator)" — assumption is only the creator can submit their own question for review]

**Approve (POST /api/questions/:id/approve):**
- Pending_review question, different admin → 200, status `'approved'`, `reviewed_by` set, `reviewed_at` set
- Creator tries to approve own question → 403, `SELF_REVIEW_FORBIDDEN`
- Already approved → 400, invalid status transition
- Draft question → 400, must be pending_review first

**Reject (POST /api/questions/:id/reject):**
- Pending_review question, with notes → 200, status `'rejected'`, `reviewer_notes` set
- Reject without notes → 400, rejection notes required
- Creator rejects own → 403, `SELF_REVIEW_FORBIDDEN`

**Review queue (GET /api/questions/review-queue):**
- Returns only `pending_review` questions, ordered by `created_at` ASC (oldest first)
- Non-admin → 403

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/__tests__/review-workflow.test.ts --verbose`
Expected: FAIL

**Step 3: Implement**

Add to `backend/src/services/question.ts`:

- `submitForReview(questionId: string, userId: string)`: Validates current status is `'draft'` and `created_by === userId`. Updates status to `'pending_review'`.
- `approveQuestion(questionId: string, reviewerId: string)`: Validates status is `'pending_review'` and `created_by !== reviewerId`. Updates status to `'approved'`, sets `reviewed_by`, `reviewed_at`.
- `rejectQuestion(questionId: string, reviewerId: string, notes: string)`: Validates status is `'pending_review'`, `created_by !== reviewerId`, and `notes` is non-empty. Updates status to `'rejected'`, sets `reviewed_by`, `reviewed_at`, `reviewer_notes`.
- `getReviewQueue(filters?)`: Lists questions where `status = 'pending_review'`, ordered by `created_at ASC`.

Add to `backend/src/routes/questions.ts`:

- `GET /review-queue` — `authenticateUser`, `requireRole('moderator')`, calls `getReviewQueue`. **Important:** This route MUST be defined before `GET /:id` to avoid the path parameter matching `review-queue` as an ID.
- `POST /:id/submit-review` — `authenticateUser`, `requireRole('moderator')`, calls `submitForReview`
- `POST /:id/approve` — `authenticateUser`, `requireRole('moderator')`, calls `approveQuestion`
- `POST /:id/reject` — `authenticateUser`, `requireRole('moderator')`, calls `rejectQuestion`

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/__tests__/review-workflow.test.ts --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/question.ts backend/src/routes/questions.ts backend/src/__tests__/review-workflow.test.ts
git commit -m "feat(backend): add review workflow endpoints with tests"
```

---

### Task 9: Backend Report/Moderation Endpoints

**Files:**
- Modify: `backend/src/services/question.ts` (add report methods)
- Create: `backend/src/routes/reports.ts`
- Create: `backend/src/__tests__/report-routes.test.ts`

**Step 1: Write the failing test**

Create `backend/src/__tests__/report-routes.test.ts`. Use supertest. Test:

**Report question (POST /api/questions/:id/report):**
- Authenticated user reports with valid reason → 201, report created
- Missing reason → 400
- Invalid reason value → 400
- Unauthenticated → 401
- Report on non-existent question → 404

**Auto-flag on 3 reports:**
- Mock 2 existing unresolved reports on a question. Creating a 3rd report → question status changes to `'pending_review'` (if it was `'approved'`)

**List reports (GET /api/reports):**
- Admin → 200, returns reports list
- Filter `?resolved=false` → only unresolved reports
- Non-admin → 403

**Resolve report (PUT /api/reports/:id/resolve):**
- Admin resolves → 200, `resolved = true`, `resolved_by` set, `resolved_at` set
- Already resolved → 400
- Non-admin → 403

**Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/__tests__/report-routes.test.ts --verbose`
Expected: FAIL

**Step 3: Implement**

Add to `backend/src/services/question.ts`:

- `reportQuestion(questionId: string, userId: string, reason: string, description?: string)`: Creates a report in `question_reports`. Then counts unresolved reports for this question. If count >= `REPORT_AUTO_FLAG_THRESHOLD` (3) and question is `'approved'`, updates question status to `'pending_review'`.
- `listReports(filters: { resolved?: boolean, questionId?: string })`: Lists reports with optional filters, joined with question text for display.
- `resolveReport(reportId: string, userId: string)`: Validates report is unresolved. Sets `resolved = true`, `resolved_by`, `resolved_at`.

Create `backend/src/routes/reports.ts`:

- `POST /api/questions/:id/report` — `authenticateUser` (any role), validates reason, calls `reportQuestion`. **Note:** This route is mounted on the questions router, not the reports router.
- `GET /api/reports` — `authenticateUser`, `requireRole('moderator')`, calls `listReports`
- `PUT /api/reports/:id/resolve` — `authenticateUser`, `requireRole('moderator')`, calls `resolveReport`

Wire the reports router into `backend/src/index.ts` at `/api/reports`.
Add the report route to the questions router for `POST /:id/report`.

**Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/__tests__/report-routes.test.ts --verbose`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/question.ts backend/src/routes/reports.ts backend/src/__tests__/report-routes.test.ts backend/src/index.ts
git commit -m "feat(backend): add report and moderation endpoints with tests"
```

---

### Task 10: Web Admin Foundation — Layout, Supabase Client, API Helpers

**Files:**
- Create: `web/src/lib/supabase.ts`
- Create: `web/src/lib/api.ts`
- Create: `web/src/app/admin/layout.tsx`

**Step 1: Implement**

No TDD for this task — it's pure scaffolding with no testable logic.

**`web/src/lib/supabase.ts`:**
- Create a browser Supabase client using `createBrowserClient` from `@supabase/auth-helpers-nextjs` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars.
- Create a server Supabase client using `createServerComponentClient` from `@supabase/auth-helpers-nextjs` for use in Server Components (uses `cookies()` from `next/headers`).

[NEEDS CLARIFICATION: The `@supabase/auth-helpers-nextjs` version `0.8.0` may use different APIs than current docs. Use the API matching v0.8.0 documentation. If it fails, update to the latest compatible version.]

**`web/src/lib/api.ts`:**
- Export an `apiClient` object with methods: `get(path, params?)`, `post(path, body)`, `put(path, body)`, `delete(path)`.
- Each method fetches from `process.env.NEXT_PUBLIC_API_URL` (defaults to `http://localhost:3001`).
- Attaches the Supabase session token as `Authorization: Bearer <token>` header.
- Returns parsed JSON response. Throws on non-2xx responses.

**`web/src/app/admin/layout.tsx`:**
- Server component that renders a sidebar with navigation links: Questions (`/admin/questions`), Review Queue (`/admin/review`), Reports (`/admin/reports`)
- Wraps `{children}` in a main content area
- Simple, functional CSS (inline styles or a CSS module)
- Skip auth gate for now — no login page exists yet. Auth will be added when auth UI is built.

**Step 2: Commit**

```bash
git add web/src/lib/supabase.ts web/src/lib/api.ts web/src/app/admin/layout.tsx
git commit -m "feat(web): add admin layout, Supabase client, and API helpers"
```

---

### Task 11: Web Admin — Question List Page

**Files:**
- Create: `web/src/app/admin/questions/page.tsx`
- Create: `web/src/components/admin/QuestionTable.tsx`

**Step 1: Implement**

**`web/src/components/admin/QuestionTable.tsx`:**
- Client component (`'use client'`)
- Props: `questions: Question[]`, `onEdit: (id: string) => void`, `onDelete: (id: string) => void`
- Renders an HTML table with columns: Text (truncated to 80 chars), Theme, Difficulty, Status, Type, Created At, Actions (Edit / Delete buttons)
- Status displayed with color-coded badges: draft (gray), pending_review (yellow), approved (green), rejected (red)
- Import `Question` type from `@deenup/shared`

**`web/src/app/admin/questions/page.tsx`:**
- Client component that fetches questions from the API
- Filter controls at the top: Theme dropdown (from `THEMES` constant), Difficulty dropdown (from `DIFFICULTIES`), Status dropdown (from `QUESTION_STATUSES`), Text search input
- "New Question" button linking to `/admin/questions/new`
- Renders `QuestionTable` with fetched data
- Pagination controls (Next / Previous) using cursor from API response
- Loading state and error state handling

**Step 2: Commit**

```bash
git add web/src/app/admin/questions/page.tsx web/src/components/admin/QuestionTable.tsx
git commit -m "feat(web): add question list page with filters and pagination"
```

---

### Task 12: Web Admin — Question Create/Edit Form

**Files:**
- Create: `web/src/components/admin/QuestionForm.tsx`
- Create: `web/src/app/admin/questions/new/page.tsx`
- Create: `web/src/app/admin/questions/[id]/edit/page.tsx`

**Step 1: Implement**

**`web/src/components/admin/QuestionForm.tsx`:**
- Client component (`'use client'`)
- Props: `initialData?: Question` (for edit mode), `onSubmit: (data: CreateQuestionRequest) => Promise<void>`
- Form fields:
  - `text`: textarea, required
  - `theme`: select dropdown populated from `THEMES` constant
  - `difficulty`: select dropdown from `DIFFICULTIES`
  - `type`: select from `QUESTION_TYPES` — changing this resets the options array
  - Dynamic options editor:
    - If `type = 'qcm'`: exactly 4 text inputs with radio buttons to mark correct answer
    - If `type = 'true_false'`: exactly 2 text inputs (pre-filled "Vrai" / "Faux") with radio buttons
  - `explanation`: textarea, required
  - Sources editor: dynamic list of source entries, each with type select (quran/hadith/fiqh), reference text input, optional detail textarea. "Add source" button. At least 1 required.
- Client-side validation using the same rules as `QUESTION_DEFAULTS` from shared constants
- Submit button shows loading state
- Error display area

**`web/src/app/admin/questions/new/page.tsx`:**
- Renders `QuestionForm` without `initialData`
- On submit, calls `POST /api/questions` via API client
- On success, redirects to `/admin/questions`

**`web/src/app/admin/questions/[id]/edit/page.tsx`:**
- Fetches the existing question by `params.id` via `GET /api/questions/:id`
- Renders `QuestionForm` with `initialData` pre-populated
- On submit, calls `PUT /api/questions/:id` via API client
- On success, redirects to `/admin/questions`

**Step 2: Commit**

```bash
git add web/src/components/admin/QuestionForm.tsx web/src/app/admin/questions/new/page.tsx "web/src/app/admin/questions/[id]/edit/page.tsx"
git commit -m "feat(web): add question create and edit pages with form component"
```

---

### Task 13: Web Admin — Review Queue Page

**Files:**
- Create: `web/src/components/admin/ReviewPanel.tsx`
- Create: `web/src/app/admin/review/page.tsx`

**Step 1: Implement**

**`web/src/components/admin/ReviewPanel.tsx`:**
- Client component
- Props: `question: Question` (with sources included), `onApprove: (id: string) => Promise<void>`, `onReject: (id: string, notes: string) => Promise<void>`
- Displays: full question text, theme badge, difficulty badge, all options (highlighted correct one), explanation, all sources with type badges and references
- Two action buttons:
  - "Approve" — green button, one-click action, calls `onApprove`
  - "Reject" — red button, opens a textarea for rejection notes (required), then calls `onReject`
- Loading state on both actions
- Creator info display

**`web/src/app/admin/review/page.tsx`:**
- Fetches pending review questions from `GET /api/questions/review-queue`
- Displays count of pending questions
- Renders each question in a `ReviewPanel`
- On approve: calls `POST /api/questions/:id/approve`, removes from list on success
- On reject: calls `POST /api/questions/:id/reject` with notes, removes from list on success
- Empty state: "No questions pending review" message

**Step 2: Commit**

```bash
git add web/src/components/admin/ReviewPanel.tsx web/src/app/admin/review/page.tsx
git commit -m "feat(web): add review queue page with approve/reject actions"
```

---

### Task 14: Web Admin — Reports Dashboard Page

**Files:**
- Create: `web/src/components/admin/ReportsList.tsx`
- Create: `web/src/app/admin/reports/page.tsx`

**Step 1: Implement**

**`web/src/components/admin/ReportsList.tsx`:**
- Client component
- Props: `reports: QuestionReport[]`, `onResolve: (reportId: string) => Promise<void>`
- Renders a table with columns: Question Text (linked or truncated), Reporter, Reason (badge), Description, Status (Resolved/Unresolved), Created At, Actions
- Unresolved reports have a "Resolve" button
- Resolved reports show resolved_by and resolved_at info

**`web/src/app/admin/reports/page.tsx`:**
- Fetches reports from `GET /api/reports`
- Filter toggle: All / Unresolved / Resolved
- Renders `ReportsList` with fetched data
- On resolve: calls `PUT /api/reports/:id/resolve`, refreshes list
- Empty state handling

**Step 2: Commit**

```bash
git add web/src/components/admin/ReportsList.tsx web/src/app/admin/reports/page.tsx
git commit -m "feat(web): add reports dashboard page with resolve actions"
```

---

### Task 15: Seed Script & Final Integration

**Files:**
- Create: `scripts/db/seed_questions.ts`
- Modify: `backend/package.json` (add seed script)

**Step 1: Write the seed script**

Create `scripts/db/seed_questions.ts` using `@supabase/supabase-js` with the service role key:

- Insert 15 sample questions across the 3 MVP themes (5 per theme: Quran, Prophets, Muhammad ﷺ)
- Mix of difficulties: 5 easy, 5 medium, 5 advanced
- Mix of types: 12 QCM, 3 True/False
- Each question has 1-2 authentic source citations with real references (e.g., "Al-Fatiha:1-7", "Bukhari:1", "Muslim:2699")
- All text in French
- Set 10 questions to `status: 'approved'` (ready for use in matches), 3 to `'draft'`, 2 to `'pending_review'`
- Include explanations that reference the sources

Add a script entry to `backend/package.json`:
```json
"seed": "ts-node ../scripts/db/seed_questions.ts"
```

**Step 2: Run the seed**

Run: `cd backend && npm run seed`
Expected: 15 questions inserted with sources

**Step 3: Integration test**

Run: `npm test` from root
Expected: All tests across shared and backend pass

**Step 4: Commit**

```bash
git add scripts/db/seed_questions.ts backend/package.json
git commit -m "feat(scripts): add question seed script with 15 sample questions"
```

---

## Testing Strategy

### Unit Tests (Shared Package)
- **File:** `shared/src/__tests__/question-types.test.ts`
- **Coverage:** All type interfaces are constructable with correct fields. All constants contain expected values and are immutable (`as const`). Enum arrays contain exact expected members.
- **Run:** `cd shared && npx jest --verbose`

### Unit Tests (Backend Middleware)
- **File:** `backend/src/__tests__/auth-middleware.test.ts`
- **Coverage:** Token extraction, Supabase auth verification, role checking, 401/403 error responses.
- **File:** `backend/src/__tests__/validate-middleware.test.ts`
- **Coverage:** All 18+ validation scenarios from the design (option counts, source requirements, field lengths, enum values).
- **Run:** `cd backend && npx jest --verbose`

### Integration Tests (Backend API)
- **File:** `backend/src/__tests__/question-routes.test.ts`
- **Coverage:** Full CRUD lifecycle via HTTP endpoints. Auth enforcement. Filtering and pagination. Status code verification.
- **File:** `backend/src/__tests__/review-workflow.test.ts`
- **Coverage:** Status transitions (draft → pending → approved/rejected). Self-review prevention. Invalid transitions.
- **File:** `backend/src/__tests__/report-routes.test.ts`
- **Coverage:** Report creation, auto-flagging at 3 reports, report listing, report resolution.
- **Run:** `cd backend && npx jest --verbose`

### Mocking Strategy
- Mock `@supabase/supabase-js` at module level in all backend tests
- Create a `backend/src/__tests__/helpers/mockSupabase.ts` helper that provides chainable mock methods (`.from().select().eq().single()` etc.)
- Never hit a real database in unit/integration tests

### Manual/Integration Verification
- Run the seed script against a real Supabase instance to verify SQL migration and data insertion
- Test admin UI pages manually in the browser against the running backend

### Test Commands Summary
```bash
# All tests
npm test

# Shared types only
cd shared && npx jest --verbose

# Backend only
cd backend && npx jest --verbose

# Specific test file
cd backend && npx jest src/__tests__/question-routes.test.ts --verbose

# With coverage
cd backend && npx jest --coverage
```

---

## File Changes

| Task | File | Action |
|------|------|--------|
| 1 | `shared/src/types/question.ts` | create |
| 1 | `shared/src/__tests__/question-types.test.ts` | create |
| 2 | `shared/src/constants/question.ts` | create |
| 2 | `shared/src/__tests__/question-types.test.ts` | modify |
| 3 | `shared/src/index.ts` | modify |
| 3 | `shared/src/types/auth.ts` | modify |
| 3 | `shared/src/__tests__/auth-types.test.ts` | modify |
| 3 | `shared/src/__tests__/question-types.test.ts` | modify |
| 4 | `scripts/db/001_questions.sql` | create |
| 5 | `backend/src/index.ts` | create |
| 5 | `backend/src/db/supabase.ts` | create |
| 5 | `backend/src/middleware/auth.ts` | create |
| 5 | `backend/src/__tests__/auth-middleware.test.ts` | create |
| 6 | `backend/src/middleware/validate.ts` | create |
| 6 | `backend/src/__tests__/validate-middleware.test.ts` | create |
| 7 | `backend/src/services/question.ts` | create |
| 7 | `backend/src/routes/questions.ts` | create |
| 7 | `backend/src/__tests__/question-routes.test.ts` | create |
| 7 | `backend/src/index.ts` | modify |
| 8 | `backend/src/services/question.ts` | modify |
| 8 | `backend/src/routes/questions.ts` | modify |
| 8 | `backend/src/__tests__/review-workflow.test.ts` | create |
| 9 | `backend/src/services/question.ts` | modify |
| 9 | `backend/src/routes/reports.ts` | create |
| 9 | `backend/src/__tests__/report-routes.test.ts` | create |
| 9 | `backend/src/index.ts` | modify |
| 10 | `web/src/lib/supabase.ts` | create |
| 10 | `web/src/lib/api.ts` | create |
| 10 | `web/src/app/admin/layout.tsx` | create |
| 11 | `web/src/app/admin/questions/page.tsx` | create |
| 11 | `web/src/components/admin/QuestionTable.tsx` | create |
| 12 | `web/src/components/admin/QuestionForm.tsx` | create |
| 12 | `web/src/app/admin/questions/new/page.tsx` | create |
| 12 | `web/src/app/admin/questions/[id]/edit/page.tsx` | create |
| 13 | `web/src/components/admin/ReviewPanel.tsx` | create |
| 13 | `web/src/app/admin/review/page.tsx` | create |
| 14 | `web/src/components/admin/ReportsList.tsx` | create |
| 14 | `web/src/app/admin/reports/page.tsx` | create |
| 15 | `scripts/db/seed_questions.ts` | create |
| 15 | `backend/package.json` | modify |

---

## Risk Assessment

### High Severity

- **Risk: No existing backend code** — The `backend/src/` directory is empty. Task 5 creates the entire Express foundation from scratch. If patterns don't align with future features, refactoring will be needed.
  - **Mitigation:** Follow standard Express patterns (middleware chain, router mounting, error handler). Keep the service layer separate from routes for testability. This structure can be reused by all future API endpoints.

- **Risk: User role storage is undefined** — The existing `User` type has no `role` field. The question system requires role-based access (admin, moderator). How roles are stored in Supabase (custom claims vs. separate table) affects the auth middleware.
  - **Mitigation:** Task 3 adds `role` to the `User` interface. Auth middleware reads from `app_metadata.role` in the JWT (Supabase convention for custom claims). Document that roles must be set in Supabase dashboard or via admin API.

### Medium Severity

- **Risk: Supabase RLS complexity** — The RLS policies reference `auth.jwt()` for role checks. If the Supabase project's JWT structure differs from expectations, RLS may block legitimate requests.
  - **Mitigation:** Test RLS policies against the actual Supabase instance before relying on them. The backend uses the service role key (bypasses RLS) for admin operations, so RLS primarily protects direct client access.

- **Risk: No auth UI exists in web app** — The admin pages assume an authenticated session, but no login page exists. Admin functionality is inaccessible without authentication.
  - **Mitigation:** Admin layout renders without auth gate initially (noted in Task 10). For local development, the API can be tested via supertest and curl.

- **Risk: Self-review prevention with solo developer** — REQ says `reviewed_by !== created_by`, but a solo developer needs to both create and review questions during initial content seeding.
  - **Mitigation:** Add a `ALLOW_SELF_REVIEW` environment variable (default `false`) that bypasses the check in development. Document this as dev-only.

### Low Severity

- **Risk: Next.js App Router assumptions** — No `app/` directory exists yet. The plan assumes App Router but Pages Router is also possible with Next.js 14.
  - **Mitigation:** Next.js 14 defaults to App Router. The `next` dependency is 14.0.0 which supports both. All file paths use `app/` convention.

- **Risk: Supabase client version compatibility** — `@supabase/supabase-js ^2.38.0` and `@supabase/auth-helpers-nextjs ^0.8.0` may have API differences from latest docs.
  - **Mitigation:** Pin to exact versions in package.json. Test client initialization in Task 10.

- **Risk: French content accuracy in seed data** — Seed questions need to be in French with authentic Islamic references. Inaccurate content could mislead during testing.
  - **Mitigation:** Use well-known, widely cited Quran verses and Hadith for seed data. Mark seed data clearly as "sample — requires scholar review."

---

## Uncertainty

- **[NEEDS CLARIFICATION] Submit-for-review authorization** — The design says the submit-review endpoint requires "Admin/Moderator (creator)". It's unclear whether "creator" means only the question's creator can submit it for review, or any admin/moderator can submit any draft question. **Current assumption:** Only the creator can submit their own question for review.

- **[NEEDS CLARIFICATION] Soft delete vs hard delete** — The design mentions both options. **Current assumption:** Hard delete for MVP simplicity (CASCADE deletes sources and reports). Soft delete can be added later if audit requirements increase.

- **[NEEDS CLARIFICATION] Admin UI authentication** — No login page or auth flow exists in the web app. **Current assumption:** Skip auth gate in the admin layout for now; render the layout unconditionally.

- **[NEEDS CLARIFICATION] Supabase auth-helpers-nextjs API** — The `@supabase/auth-helpers-nextjs` version `0.8.0` may use different APIs than current docs (e.g., `createBrowserClient` vs `createClientComponentClient`). **Current assumption:** Use the API matching v0.8.0 documentation.
