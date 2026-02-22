# Real-time Match System — Implementation Plan

> **For Claude:** Execute this plan task-by-task, using TDD methodology and committing after each task.

**Goal:** Build the WebSocket-based 1v1 match engine: matchmaking queue, real-time question delivery with server-authoritative timers, scoring, ELO updates, DeenUp points, and disconnection handling.

**Architecture:** Six new services layered bottom-up: pure `EloService` → data-access `QuestionService`/`MatchService`/`DeenPointsService` → orchestrating `GameEngine` → queue-managing `MatchmakingService`. A `SocketHandler` module wires socket.io events to services. Two REST endpoints serve post-match review and match history. All shared types and constants live in `@deenup/shared`.

**Tech Stack:** TypeScript, Node.js/Express, socket.io, Supabase (PostgreSQL), Jest + supertest

**Design doc:** `design.md` (artifact) — contains full requirements (REQ-1 through REQ-15), WebSocket event protocol, architecture diagram, and 25 test scenarios.

---

## Tasks

### Task 1: Shared Constants and Error Codes

**Files:**
- Create: `shared/src/constants/match.ts`
- Create: `shared/src/types/errors.ts`
- Modify: `shared/src/constants/index.ts` (re-export `match.ts`)
- Modify: `shared/src/index.ts` (re-export `errors.ts`)

**Step 1: Write the failing test**

Create `shared/src/__tests__/constants/match.test.ts`. Test that every constant is exported and has the expected value:
- `MATCHMAKING.INITIAL_ELO_RANGE` = 200
- `MATCHMAKING.ELO_EXPAND_STEP` = 50
- `MATCHMAKING.ELO_EXPAND_INTERVAL_MS` = 10_000
- `MATCHMAKING.MAX_ELO_RANGE` = 500
- `MATCHMAKING.QUEUE_TIMEOUT_MS` = 120_000
- `MATCH_TIMING.RECONNECT_GRACE_MS` = 30_000
- `MATCH_TIMING.QUESTION_RESULT_DELAY_MS` = 3_000
- `ELO.K_FACTOR` = 32
- `MATCH_ERROR_CODES.ALREADY_IN_QUEUE`, `.ALREADY_IN_MATCH`, `.INSUFFICIENT_QUESTIONS`, `.MATCH_NOT_FOUND`, `.UNAUTHORIZED`, `.INVALID_ANSWER`, `.QUEUE_TIMEOUT`

**Step 2: Run test to verify it fails**

Run: `npx jest shared/src/__tests__/constants/match.test.ts -v`
Expected: FAIL — modules don't exist yet.

**Step 3: Write minimal implementation**

- In `shared/src/constants/match.ts`: Export `MATCHMAKING`, `MATCH_TIMING`, and `ELO` objects with the constants listed above. Follow the pattern in `shared/src/constants/game.ts` (simple `as const` objects).
- In `shared/src/types/errors.ts`: Export `MATCH_ERROR_CODES` object. Follow the pattern of `AUTH_ERROR_CODES` in `shared/src/constants/auth.ts`.
- In `shared/src/constants/index.ts`: Add `export * from './match';`  (this file doesn't exist — create it and re-export `game.ts` and `auth.ts` too, OR just add to existing barrel).
- In `shared/src/index.ts`: Add re-exports for `MATCHMAKING`, `MATCH_TIMING`, `ELO` from `'./constants/match'` and `MATCH_ERROR_CODES` from `'./types/errors'`.

**Step 4: Run test to verify it passes**

Run: `npx jest shared/src/__tests__/constants/match.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add shared/src/constants/match.ts shared/src/types/errors.ts shared/src/index.ts shared/src/__tests__/constants/match.test.ts
git commit -m "feat: add match constants and error codes to shared package"
```

---

### Task 2: Shared WebSocket Event Types

**Files:**
- Create: `shared/src/types/websocket.ts`
- Create: `shared/src/types/match-api.ts`
- Modify: `shared/src/index.ts` (re-export new types)

**Step 1: Write the failing test**

Create `shared/src/__tests__/types/websocket.test.ts`. Import every event name constant and every payload type. Verify the string literal values of event names:
- Client → Server: `queue:join`, `queue:leave`, `match:answer`
- Server → Client: `queue:joined`, `queue:left`, `match:found`, `match:question`, `match:question_result`, `match:opponent_answered`, `match:end`, `match:opponent_disconnected`, `match:opponent_reconnected`, `match:forfeit`, `error`

Also test that the types compile correctly (TypeScript compile-time check — the test importing them without error is sufficient).

**Step 2: Run test to verify it fails**

Run: `npx jest shared/src/__tests__/types/websocket.test.ts -v`
Expected: FAIL — module doesn't exist.

**Step 3: Write minimal implementation**

In `shared/src/types/websocket.ts`:
- Export `CLIENT_EVENTS` and `SERVER_EVENTS` objects with string literal event names.
- Export interfaces for each payload:
  - `QueueJoinPayload`: `{ themeId: string; matchType: MatchType }`
  - `QueueJoinedPayload`: `{ position: number }`
  - `MatchFoundPayload`: `{ matchId: string; opponent: { displayName: string; elo: number; avatarUrl: string | null }; theme: { id: string; slug: string; name_fr: string } }`
  - `MatchQuestionPayload`: `{ questionOrder: number; questionFr: string; answers: string[]; difficulty: Difficulty; timeLimit: number }`
  - `MatchAnswerPayload`: `{ matchId: string; questionOrder: number; selectedAnswerIndex: number }`
  - `QuestionResultPayload`: `{ questionOrder: number; correctAnswerIndex: number; players: Record<string, { selectedAnswerIndex: number | null; isCorrect: boolean; timeTakenMs: number; points: number }> }`
  - `MatchEndPayload`: `{ matchId: string; winnerId: string | null; scores: Record<string, number>; eloChanges: Record<string, { before: number; after: number; delta: number }> | null; deenPointsAwarded: Record<string, number> }`
  - `OpponentDisconnectedPayload`: `{ gracePeriodSeconds: number }`
  - `MatchForfeitPayload`: `{ reason: string }`
  - `SocketErrorPayload`: `{ code: string; message: string }`

In `shared/src/types/match-api.ts`:
- Export `MatchReviewQuestion` interface: question data + both players' answers + sources
- Export `MatchReviewResponse` interface: match metadata + array of `MatchReviewQuestion`
- Export `MatchHistoryItem` interface: summary match data for list view
- Export `MatchHistoryResponse` interface: `{ matches: MatchHistoryItem[]; total: number; page: number; perPage: number }`

In `shared/src/index.ts`: Add re-exports for all new types and event constants.

**Step 4: Run test to verify it passes**

Run: `npx jest shared/src/__tests__/types/websocket.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add shared/src/types/websocket.ts shared/src/types/match-api.ts shared/src/index.ts shared/src/__tests__/types/websocket.test.ts
git commit -m "feat: add WebSocket event types and match API types to shared"
```

---

### Task 3: ELO Service (Pure Logic)

**Files:**
- Create: `backend/src/services/eloService.ts`
- Create: `backend/src/__tests__/services/eloService.test.ts`

**Step 1: Write the failing test**

Test cases for `EloService`:
- `calculateExpectedScore(1200, 1000)` → approximately 0.76
- `calculateExpectedScore(1000, 1200)` → approximately 0.24
- `calculateExpectedScore(1000, 1000)` → 0.5
- `calculateEloChange(1200, 1000, 'win')` → winner gains ~8, loser loses ~8
- `calculateEloChange(1000, 1200, 'win')` → winner gains ~24, loser loses ~24 (upset)
- `calculateEloChange(1000, 1000, 'draw')` → both get 0 delta
- ELO never goes below 0

Use `ELO.K_FACTOR` from shared constants. No Supabase dependency — this is a pure calculation service.

**Step 2: Run test to verify it fails**

Run: `npx jest backend/src/__tests__/services/eloService.test.ts -v`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `EloService` class with:
- `calculateExpectedScore(playerElo: number, opponentElo: number): number` — standard ELO expected score formula: `1 / (1 + 10^((opponentElo - playerElo) / 400))`
- `calculateEloChange(playerElo: number, opponentElo: number, result: 'win' | 'loss' | 'draw'): { playerDelta: number; opponentDelta: number }` — uses K_FACTOR, actual scores (1/0/0.5), clamps result so ELO >= 0
- No constructor dependencies (pure logic class)

**Step 4: Run test to verify it passes**

Run: `npx jest backend/src/__tests__/services/eloService.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/eloService.ts backend/src/__tests__/services/eloService.test.ts
git commit -m "feat: add EloService with pure ELO calculation logic"
```

---

### Task 4: Question Service (Database Access)

**Files:**
- Create: `backend/src/services/questionService.ts`
- Create: `backend/src/__tests__/services/questionService.test.ts`

**Step 1: Write the failing test**

Mock Supabase client (follow pattern in `backend/src/__tests__/services/authService.test.ts`). Test:
- `getRandomQuestions(themeId, 15)`: returns 15 approved questions, calls `.from('questions')` with `status = 'approved'` filter and theme filter
- `getRandomQuestions(themeId, 15)` with < 15 approved questions: throws error with code `INSUFFICIENT_QUESTIONS`
- `getQuestionWithSources(questionId)`: returns question joined with its `question_sources`
- Difficulty distribution: when called with mix option `{ easy: 5, medium: 5, advanced: 5 }`, queries each difficulty separately

**Step 2: Run test to verify it fails**

Run: `npx jest backend/src/__tests__/services/questionService.test.ts -v`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `QuestionService` class:
- Constructor: `constructor(private supabase: SupabaseClient)`
- `getRandomQuestions(themeId: string, count: number, mix?: { easy: number; medium: number; advanced: number }): Promise<Question[]>` — queries `questions` table filtered by `theme_id`, `status = 'approved'`, and optional difficulty. Uses Supabase `.limit()`. Shuffles results. Throws `{ code: MATCH_ERROR_CODES.INSUFFICIENT_QUESTIONS }` if insufficient.
- `getQuestionWithSources(questionId: string): Promise<Question & { sources: QuestionSource[] }>` — fetches question and joins `question_sources` (two queries or Supabase select with embedded relation).

Follow `ProfileService` pattern: constructor DI, async methods, error objects with `{ code, message }`.

**Step 4: Run test to verify it passes**

Run: `npx jest backend/src/__tests__/services/questionService.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/questionService.ts backend/src/__tests__/services/questionService.test.ts
git commit -m "feat: add QuestionService for fetching approved questions"
```

---

### Task 5: Match Service (Database Access)

**Files:**
- Create: `backend/src/services/matchService.ts`
- Create: `backend/src/__tests__/services/matchService.test.ts`

**Step 1: Write the failing test**

Mock Supabase client. Test:
- `createMatch(player1Id, player2Id, themeId, matchType)`: inserts into `matches` with status `waiting`, correct ELO snapshots; returns Match object
- `startMatch(matchId)`: updates status to `in_progress`, sets `started_at`
- `endMatch(matchId, winnerId, scores, eloData)`: updates status to `completed`, sets `ended_at`, winner_id, scores, ELO after values
- `abandonMatch(matchId)`: updates status to `abandoned`
- `recordMatchQuestions(matchId, questionIds[])`: inserts 15 rows into `match_questions` with sequential `question_order` (1-15)
- `recordAnswer(matchId, matchQuestionId, playerId, answerData)`: inserts into `match_answers`
- `getMatchReview(matchId, requesterId)`: returns full match with questions, answers, sources — only if requester is player1 or player2
- `getMatchHistory(playerId, page, perPage)`: paginated query on matches where player is player1 or player2, sorted DESC
- `updateProfileStats(playerId, result)`: updates `total_matches`, `total_wins`/`losses`/`draws`, `win_streak`, `best_win_streak`, `placement_matches_played`, `is_placed`

**Step 2: Run test to verify it fails**

Run: `npx jest backend/src/__tests__/services/matchService.test.ts -v`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `MatchService` class:
- Constructor: `constructor(private supabase: SupabaseClient)`
- Implement each method using Supabase client patterns from `ProfileService` (`.from().insert().select().single()`, `.from().update().eq()`, etc.)
- `getMatchReview`: multi-table query joining `matches` → `match_questions` → `questions` → `question_sources` + `match_answers`. Return structured `MatchReviewResponse`.
- `getMatchHistory`: query with `.or(`player1_id.eq.${id},player2_id.eq.${id}`)`, `.order('created_at', { ascending: false })`, `.range(offset, offset + perPage - 1)`.
- `updateProfileStats`: fetch current profile, compute new values (increment total_matches, conditionally increment wins/losses/draws, reset or increment win_streak, update best_win_streak, increment placement_matches_played and set is_placed when it reaches 2).

**Step 4: Run test to verify it passes**

Run: `npx jest backend/src/__tests__/services/matchService.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/matchService.ts backend/src/__tests__/services/matchService.test.ts
git commit -m "feat: add MatchService for match CRUD, review, and history"
```

---

### Task 6: DeenPoints Service (Database Access)

**Files:**
- Create: `backend/src/services/deenPointsService.ts`
- Create: `backend/src/__tests__/services/deenPointsService.test.ts`

**Step 1: Write the failing test**

Mock Supabase client. Test:
- `awardMatchWin(playerId, matchId)`: awards 20 points (`DEEN_POINTS.MATCH_WIN_REWARD`), inserts ledger entry with `transaction_type = 'match_win'`, updates `profiles.deen_points`
- `awardFastAnswer(playerId, matchId)`: awards 5 points (`DEEN_POINTS.FAST_ANSWER_REWARD`), inserts ledger entry with `transaction_type = 'fast_answer'`
- Ledger entry has correct `balance_after` (current balance + award amount)
- Both methods update `profiles.deen_points` via RPC or direct update

**Step 2: Run test to verify it fails**

Run: `npx jest backend/src/__tests__/services/deenPointsService.test.ts -v`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `DeenPointsService` class:
- Constructor: `constructor(private supabase: SupabaseClient)`
- `awardMatchWin(playerId: string, matchId: string): Promise<void>` — fetch current balance, insert ledger entry, update profile
- `awardFastAnswer(playerId: string, matchId: string): Promise<void>` — same pattern with different amount/type
- Private helper `awardPoints(playerId, matchId, type, amount)` to avoid duplication

**Step 4: Run test to verify it passes**

Run: `npx jest backend/src/__tests__/services/deenPointsService.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/deenPointsService.ts backend/src/__tests__/services/deenPointsService.test.ts
git commit -m "feat: add DeenPointsService for point awards and ledger"
```

---

### Task 7: Matchmaking Service (In-Memory Queue)

**Files:**
- Create: `backend/src/services/matchmakingService.ts`
- Create: `backend/src/__tests__/services/matchmakingService.test.ts`

**Step 1: Write the failing test**

No Supabase mocking needed — this is in-memory. Test:
- `addToQueue(player)`: player is added, `getQueueSize()` increments
- `addToQueue` with player already in queue: throws `ALREADY_IN_QUEUE`
- `addToQueue` with player in active match: throws `ALREADY_IN_MATCH`
- `removeFromQueue(playerId)`: player removed
- `tryMatch()`: two players with same theme and ELO within 200 → returns matched pair
- `tryMatch()`: two players with same theme but ELO difference > 200 → no match initially
- `tryMatch()` after ELO range expansion (simulated time): ELO range expands by 50 every 10s up to 500 → match found
- Placement matches (player with `isPlaced = false`): ELO range ignored
- `tryMatch()`: different themes → no match
- `registerActiveMatch(matchId, player1Id, player2Id)` and `isInActiveMatch(playerId)` → true
- `removeActiveMatch(matchId)` → players no longer in active match
- Queue timeout: player in queue for > 120s → auto-removed (tested with fake timers or manual check)

The queue entry should store: `{ playerId, socketId, themeId, matchType, elo, isPlaced, joinedAt }`

**Step 2: Run test to verify it fails**

Run: `npx jest backend/src/__tests__/services/matchmakingService.test.ts -v`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `MatchmakingService` class:
- Private `queue: Map<string, QueueEntry>` — keyed by playerId
- Private `activeMatches: Map<string, { player1Id: string; player2Id: string }>` — keyed by matchId
- Private `playerToMatch: Map<string, string>` — reverse lookup playerId → matchId
- `addToQueue(entry: QueueEntry): void`
- `removeFromQueue(playerId: string): void`
- `tryMatch(): MatchedPair | null` — iterate queue pairs, check theme match + ELO range (calculated from `joinedAt` elapsed time)
- `registerActiveMatch(matchId, p1, p2): void`
- `removeActiveMatch(matchId): void`
- `isInQueue(playerId): boolean`
- `isInActiveMatch(playerId): boolean`
- `getQueueSize(): number`

The ELO range formula: `INITIAL_ELO_RANGE + Math.floor((now - joinedAt) / ELO_EXPAND_INTERVAL_MS) * ELO_EXPAND_STEP`, capped at `MAX_ELO_RANGE`.

**Step 4: Run test to verify it passes**

Run: `npx jest backend/src/__tests__/services/matchmakingService.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/matchmakingService.ts backend/src/__tests__/services/matchmakingService.test.ts
git commit -m "feat: add MatchmakingService with in-memory ELO-range queue"
```

---

### Task 8: Game Engine (Match Session Orchestrator)

**Files:**
- Create: `backend/src/services/gameEngine.ts`
- Create: `backend/src/__tests__/services/gameEngine.test.ts`

**Step 1: Write the failing test**

Mock all dependencies: `QuestionService`, `MatchService`, `EloService`, `DeenPointsService`. Test:

**Match lifecycle:**
- `createMatch(player1, player2, themeId, matchType)`: calls `questionService.getRandomQuestions`, `matchService.createMatch`, `matchService.recordMatchQuestions`, `matchService.startMatch`; creates in-memory `MatchSession`
- `getSession(matchId)`: returns session
- `getSessionByPlayerId(playerId)`: returns session

**Question flow:**
- `getCurrentQuestion(matchId)`: returns question data for current index (without `correct_answer_index`)
- `submitAnswer(matchId, playerId, answerIndex)`: validates answer, calculates score using `SCORING.BASE_POINTS[difficulty] * (timeRemaining / timeLimit)`, stores in session
- `submitAnswer` with invalid matchId: throws error
- `submitAnswer` when player already answered current question: throws error
- Scoring formula: correct answer on medium in 8000ms → `Math.floor(200 * 12000/20000)` = 120 points
- Scoring: incorrect answer → 0 points
- `bothAnswered(matchId)`: returns true when both players have answered current question

**Question advancement:**
- `advanceQuestion(matchId)`: increments `currentQuestionIndex`, resets answers, records answers in DB via `matchService.recordAnswer`
- After question 15 (index 14): `isMatchComplete(matchId)` returns true

**Match finalization:**
- `finalizeMatch(matchId)`: calculates winner from cumulative scores, calls `matchService.endMatch`, for ranked matches calls `eloService.calculateEloChange` + writes ELO history + updates profiles, calls `matchService.updateProfileStats`, awards DeenUp points (match win + fast answer bonuses), cleans up session
- Draw: `winnerId = null`, both players get draw stats
- Unranked: no ELO changes

**Disconnection:**
- `handleDisconnect(matchId, playerId)`: sets player `connected = false`, starts reconnect timer, sets `paused = true`
- `handleReconnect(matchId, playerId, newSocketId)`: clears timer, sets `connected = true`, resumes match
- `handleForfeit(matchId, forfeitPlayerId)`: opponent wins, match finalized with forfeit
- Both disconnect and timeout: match abandoned, no winner, no ELO change

**Timer:**
- `getQuestionTimeRemaining(matchId)`: returns ms remaining based on `questionStartedAt` and difficulty time limit, accounts for pause time
- `isQuestionTimedOut(matchId)`: true when time remaining <= 0

**Step 2: Run test to verify it fails**

Run: `npx jest backend/src/__tests__/services/gameEngine.test.ts -v`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `GameEngine` class:
- Constructor: `constructor(private questionService: QuestionService, private matchService: MatchService, private eloService: EloService, private deenPointsService: DeenPointsService)`
- Private `sessions: Map<string, MatchSession>` — keyed by matchId
- Private `playerToMatch: Map<string, string>` — reverse lookup

`MatchSession` interface (internal, not shared):
```
matchId, player1Id, player2Id, matchType, themeId,
players: Map<string, { socketId, connected, reconnectTimer? }>,
questions: QuestionWithOrder[],
currentQuestionIndex: number,
questionStartedAt: number,
pausedAt: number | null,
totalPausedMs: number,
answers: Map<string, { selectedAnswerIndex, timeTakenMs }>,
scores: Map<string, number>,
paused: boolean
```

Key behaviors:
- Scoring: `Math.floor(BASE_POINTS[difficulty] * (timeRemainingMs / TIME_LIMITS_MS[difficulty]))` — 0 for incorrect
- Fast answer detection: difficulty === 'advanced' && isCorrect && timeTakenMs < 10_000
- Timer accounting: `elapsed = Date.now() - questionStartedAt - totalPausedMs`
- All DB writes delegated to injected services

**Step 4: Run test to verify it passes**

Run: `npx jest backend/src/__tests__/services/gameEngine.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/services/gameEngine.ts backend/src/__tests__/services/gameEngine.test.ts
git commit -m "feat: add GameEngine for match session orchestration"
```

---

### Task 9: Match Validators

**Files:**
- Create: `backend/src/validators/match.ts`
- Create: `backend/src/__tests__/validators/match.test.ts`

**Step 1: Write the failing test**

Follow pattern in `backend/src/__tests__/validators/auth.test.ts` (if exists) or `backend/src/validators/auth.ts`. Test:
- `validateQueueJoin({ themeId, matchType })`:
  - Valid MVP theme ID + 'ranked' → `{ success: true, errors: [] }`
  - Missing themeId → error on `themeId` field
  - Non-MVP theme ID → error "Thème non disponible"
  - Invalid matchType → error on `matchType` field
- `validateAnswer({ matchId, questionOrder, selectedAnswerIndex })`:
  - Valid data → success
  - Missing matchId → error
  - `selectedAnswerIndex` not in 0-3 → error
  - `questionOrder` not in 1-15 → error

**Step 2: Run test to verify it fails**

Run: `npx jest backend/src/__tests__/validators/match.test.ts -v`
Expected: FAIL

**Step 3: Write minimal implementation**

Create pure validation functions following `backend/src/validators/auth.ts` pattern:
- `validateQueueJoin(input)`: check `themeId` is one of the 3 MVP theme UUIDs from `THEMES`, check `matchType` is 'ranked' or 'unranked'
- `validateAnswer(input)`: check `matchId` is non-empty string, `questionOrder` is 1-15, `selectedAnswerIndex` is 0-3
- Same `ValidationResult` return type: `{ success: boolean; errors: Array<{ field: string; message: string }> }`

**Step 4: Run test to verify it passes**

Run: `npx jest backend/src/__tests__/validators/match.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/validators/match.ts backend/src/__tests__/validators/match.test.ts
git commit -m "feat: add match validators for queue join and answer"
```

---

### Task 10: Socket Authentication Middleware

**Files:**
- Create: `backend/src/websocket/socketAuth.ts`
- Create: `backend/src/__tests__/websocket/socketAuth.test.ts`

**Step 1: Write the failing test**

Mock `supabaseAdmin.auth.getUser`. Test:
- Valid JWT in `socket.handshake.auth.token` → `next()` called, `socket.data.user` set to `{ id, email }`
- Missing token → `next(Error)` with authentication error
- Invalid/expired token → `next(Error)`
- Token in `socket.handshake.headers.authorization` (Bearer prefix) → also works (fallback)

Mock socket object: `{ handshake: { auth: { token }, headers: {} }, data: {} }`

**Step 2: Run test to verify it fails**

Run: `npx jest backend/src/__tests__/websocket/socketAuth.test.ts -v`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `createSocketAuthMiddleware(supabase: SupabaseClient)` factory function:
- Returns socket.io middleware `(socket, next) => { ... }`
- Extracts token from `socket.handshake.auth.token` or `socket.handshake.headers.authorization` (strip 'Bearer ')
- Calls `supabase.auth.getUser(token)`
- On success: sets `socket.data.user = { id, email }`, calls `next()`
- On failure: calls `next(new Error('Authentication failed'))`
- Follows same Supabase auth verification as `backend/src/middleware/auth.ts`

**Step 4: Run test to verify it passes**

Run: `npx jest backend/src/__tests__/websocket/socketAuth.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/websocket/socketAuth.ts backend/src/__tests__/websocket/socketAuth.test.ts
git commit -m "feat: add socket.io JWT authentication middleware"
```

---

### Task 11: Socket Handler (Event Wiring)

**Files:**
- Create: `backend/src/websocket/socketHandler.ts`
- Create: `backend/src/__tests__/websocket/socketHandler.test.ts`

**Step 1: Write the failing test**

This is the integration layer. Mock `MatchmakingService` and `GameEngine`. Test event handlers:

- `queue:join` event → calls `matchmakingService.addToQueue`, emits `queue:joined`
- `queue:join` when already in queue → emits `error` event with `ALREADY_IN_QUEUE` code
- `queue:leave` → calls `matchmakingService.removeFromQueue`, emits `queue:left`
- `match:answer` → calls `gameEngine.submitAnswer`, when both answered emits `match:question_result` to match room, then after delay advances or finalizes
- `disconnect` event → calls `gameEngine.handleDisconnect`, emits `match:opponent_disconnected` to opponent
- Reconnection (new connection from same user with active match) → calls `gameEngine.handleReconnect`, emits `match:opponent_reconnected`

For this test file, use `socket.io-client` to create real client connections against a test server, OR mock the socket objects. The mock approach is simpler and recommended for unit tests.

**Step 2: Run test to verify it fails**

Run: `npx jest backend/src/__tests__/websocket/socketHandler.test.ts -v`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `setupSocketHandlers(io: Server, matchmakingService: MatchmakingService, gameEngine: GameEngine): void`:
- Uses `io.on('connection', (socket) => { ... })`
- Registers handlers for each client event:
  - `queue:join`: validate input, add to queue, attempt match. If matched → create match via `gameEngine.createMatch`, join both sockets to a room (`match:${matchId}`), emit `match:found` to both, emit first `match:question`
  - `queue:leave`: remove from queue
  - `match:answer`: submit answer, check if both answered, if yes → emit `match:question_result` to room, setTimeout for `QUESTION_RESULT_DELAY_MS`, then advance or finalize
  - `disconnect`: if in queue → remove. If in active match → handle disconnect with grace period timer. If grace period expires → forfeit
- Matchmaking poll: after a player joins queue, call `matchmakingService.tryMatch()`. Could also use a simple interval (every 1-2 seconds) to check for matches.
- Room management: each match gets a socket.io room `match:${matchId}`

**Step 4: Run test to verify it passes**

Run: `npx jest backend/src/__tests__/websocket/socketHandler.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/websocket/socketHandler.ts backend/src/__tests__/websocket/socketHandler.test.ts
git commit -m "feat: add socket handler wiring events to services"
```

---

### Task 12: REST Match Routes

**Files:**
- Create: `backend/src/routes/matches.ts`
- Create: `backend/src/__tests__/routes/matches.test.ts`

**Step 1: Write the failing test**

Follow exact pattern in `backend/src/__tests__/routes/auth.test.ts`: use supertest, mock service, mock auth middleware. Test:

- `GET /api/matches/:id/review`:
  - Authenticated, valid match ID where user is a participant → 200 with `MatchReviewResponse`
  - Unauthenticated → 401
  - Match not found → 404
  - User is not a participant → 403
- `GET /api/matches/history`:
  - Authenticated → 200 with `MatchHistoryResponse`
  - `?page=2` → correct pagination
  - Unauthenticated → 401

**Step 2: Run test to verify it fails**

Run: `npx jest backend/src/__tests__/routes/matches.test.ts -v`
Expected: FAIL

**Step 3: Write minimal implementation**

Create `createMatchRouter(matchService: MatchService): Router`:
- `GET /:id/review`: auth middleware → `matchService.getMatchReview(req.params.id, req.user.id)` → respond with review data. Catch `MATCH_NOT_FOUND` → 404, `UNAUTHORIZED` → 403.
- `GET /history`: auth middleware → `matchService.getMatchHistory(req.user.id, page, perPage)` → respond with paginated results. Parse `page` from query (default 1), `perPage` = 20.
- Use same `handleError` pattern and `ERROR_STATUS_MAP` as `backend/src/routes/auth.ts`

**Step 4: Run test to verify it passes**

Run: `npx jest backend/src/__tests__/routes/matches.test.ts -v`
Expected: PASS

**Step 5: Commit**

```bash
git add backend/src/routes/matches.ts backend/src/__tests__/routes/matches.test.ts
git commit -m "feat: add match review and history REST endpoints"
```

---

### Task 13: Wire Everything into App + Install socket.io

**Files:**
- Modify: `backend/package.json` (add `socket.io` dependency)
- Modify: `backend/src/index.ts` (create HTTP server, attach socket.io)
- Modify: `backend/src/app.ts` (instantiate match services, mount match router)

**Step 1: Install socket.io**

Run: `cd backend && npm install socket.io && npm install -D @types/node`

Verify `socket.io` appears in `backend/package.json` dependencies.

**Step 2: Modify `backend/src/app.ts`**

Add to the existing `createApp()` function:
- Import and instantiate all new services: `QuestionService`, `MatchService`, `EloService`, `DeenPointsService`, `GameEngine`, `MatchmakingService`
- Wire DI chain: `questionService(supabaseAdmin)` → `matchService(supabaseAdmin)` → `eloService()` → `deenPointsService(supabaseAdmin)` → `gameEngine(questionService, matchService, eloService, deenPointsService)` → `matchmakingService()`
- Mount match router: `app.use('/api/matches', createMatchRouter(matchService))`
- Export `gameEngine` and `matchmakingService` (needed for socket handler setup in `index.ts`)

Change `createApp` to return `{ app, gameEngine, matchmakingService }` instead of just `app` — OR export a separate `createServices` function. Either way, `index.ts` needs access to the services for socket handler setup.

**Step 3: Modify `backend/src/index.ts`**

Change from `app.listen()` to:
- `import { createServer } from 'http'`
- `import { Server } from 'socket.io'`
- `const server = createServer(app)`
- `const io = new Server(server, { cors: { origin: '*' } })`
- Apply socket auth middleware: `io.use(createSocketAuthMiddleware(supabaseAdmin))`
- Call `setupSocketHandlers(io, matchmakingService, gameEngine)`
- `server.listen(PORT, ...)`

**Step 4: Verify build**

Run: `cd backend && npx tsc --noEmit`
Expected: No type errors.

**Step 5: Run all tests**

Run: `npm run test:backend`
Expected: All tests pass (existing auth tests + all new tests).

**Step 6: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/app.ts backend/src/index.ts
git commit -m "feat: wire socket.io and match services into Express app"
```

---

### Task 14: WebSocket Integration Test (End-to-End Match Flow)

**Files:**
- Modify: `backend/package.json` (add `socket.io-client` dev dependency)
- Create: `backend/src/__tests__/websocket/matchFlow.integration.test.ts`

**Step 1: Install test dependency**

Run: `cd backend && npm install -D socket.io-client`

**Step 2: Write integration test**

Create a full end-to-end test that:
1. Starts a test HTTP server with socket.io attached (using `createApp` + services with mocked Supabase)
2. Creates two `socket.io-client` instances with mock auth tokens
3. Both clients emit `queue:join` with same theme
4. Both receive `match:found`
5. Both receive `match:question` (question 1/15)
6. Client 1 emits `match:answer` with correct answer
7. Client 2 emits `match:answer` with incorrect answer
8. Both receive `match:question_result` with correct scoring
9. Repeat for remaining 14 questions (can simplify by having all questions auto-answered or testing a subset)
10. Both receive `match:end` with final scores and winner

Additional scenarios:
- Disconnect/reconnect: client 1 disconnects, reconnects within 30s → match resumes
- Forfeit: client 1 disconnects, 30s passes → client 2 receives `match:end` with forfeit

Note: Mock Supabase at the service level so DB calls return expected data. The integration test validates the socket event flow, not DB persistence.

**Step 3: Run integration test**

Run: `npx jest backend/src/__tests__/websocket/matchFlow.integration.test.ts -v --testTimeout=30000`
Expected: PASS

**Step 4: Run full test suite**

Run: `npm run test:backend`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/src/__tests__/websocket/matchFlow.integration.test.ts
git commit -m "test: add end-to-end WebSocket match flow integration test"
```

---

## Testing Strategy

### Layer-by-layer testing approach:

1. **Unit tests (Tasks 3-9):** Each service tested in isolation with mocked dependencies. Jest mocks for Supabase client. No real DB connections. Tests validate business logic, scoring formulas, ELO calculations, state management, and error handling.

2. **Route tests (Task 12):** Supertest against Express router with mocked services. Validates HTTP status codes, request/response shapes, authentication enforcement, and error mapping.

3. **WebSocket unit tests (Tasks 10-11):** Socket auth middleware tested with mock socket objects. Socket handler tested with mock services — validates event routing and error emission.

4. **Integration test (Task 14):** Full socket.io client-server test with two real WebSocket connections. Validates the complete match flow end-to-end: queue → match → questions → scoring → completion. Uses mocked Supabase but real socket.io transport.

### Test commands:

```bash
# Individual service tests
npx jest backend/src/__tests__/services/eloService.test.ts -v
npx jest backend/src/__tests__/services/questionService.test.ts -v
npx jest backend/src/__tests__/services/matchService.test.ts -v
npx jest backend/src/__tests__/services/deenPointsService.test.ts -v
npx jest backend/src/__tests__/services/gameEngine.test.ts -v
npx jest backend/src/__tests__/services/matchmakingService.test.ts -v

# Validator tests
npx jest backend/src/__tests__/validators/match.test.ts -v

# Route tests
npx jest backend/src/__tests__/routes/matches.test.ts -v

# WebSocket tests
npx jest backend/src/__tests__/websocket/socketAuth.test.ts -v
npx jest backend/src/__tests__/websocket/socketHandler.test.ts -v
npx jest backend/src/__tests__/websocket/matchFlow.integration.test.ts -v

# ALL match-related tests
npx jest backend/src/__tests__ --testPathPattern="(match|elo|gameEngine|deen|question|socket)" -v

# Full backend suite (includes existing auth tests)
npm run test:backend
```

### Coverage targets:

- EloService: 100% — pure math, every branch testable
- QuestionService: 90%+ — all query paths, insufficient questions edge case
- MatchService: 90%+ — all CRUD operations, authorization check on review
- DeenPointsService: 90%+ — both award types, ledger correctness
- GameEngine: 85%+ — full lifecycle, scoring formula, disconnection, timer
- MatchmakingService: 90%+ — queue operations, ELO matching, placement
- Socket handler: 80%+ — all event paths, error handling
- Routes: 90%+ — all HTTP paths including auth and error cases

---

## Risk Assessment

### High Severity

- **Risk:** Timer accuracy in Node.js — `setTimeout` and `Date.now()` are not perfectly precise, especially under load. Server-authoritative timer could drift.
  - **Mitigation:** Use `Date.now()` for elapsed time calculation (not setTimeout tracking). Timer resolution of ~10-50ms is acceptable for quiz time limits of 15-30 seconds. Add a small tolerance buffer (100ms) when checking timeout.

- **Risk:** Race condition when both players answer simultaneously — two `match:answer` events could arrive at the same time, causing double processing.
  - **Mitigation:** Use synchronous answer processing within the Node.js event loop (single-threaded). The `answers` Map in MatchSession provides atomic read/check/write within a single tick. No external locks needed for single-server MVP.

### Medium Severity

- **Risk:** `socket.io` version compatibility with client libraries (React Native, Next.js) — version mismatch can cause silent connection failures.
  - **Mitigation:** Pin `socket.io` version in package.json. Document required client version in README. Test with `socket.io-client` in integration tests.

- **Risk:** Memory leak from abandoned match sessions or queue entries not being cleaned up.
  - **Mitigation:** Implement cleanup in `handleForfeit` and `handleBothDisconnected` that remove sessions from `GameEngine.sessions` and `MatchmakingService.activeMatches`. Add a periodic cleanup sweep (every 5 min) for orphaned sessions older than 1 hour.

- **Risk:** Supabase free tier rate limits — match finalization writes to 5+ tables (matches, match_answers ×30, elo_history ×2, deen_points_ledger, profiles ×2).
  - **Mitigation:** Batch writes where possible. Monitor Supabase dashboard during testing. The free tier allows 500 requests/minute which should be sufficient for MVP.

- **Risk:** `getRandomQuestions` may return the same questions in consecutive matches for the same theme if the question pool is small (100-200 total).
  - **Mitigation:** Accept for MVP. The randomization via Supabase `.order('random()')` or application-level shuffle provides adequate variety. Post-MVP: track recently-used questions per player.

### Low Severity

- **Risk:** Missing approved questions in DB for testing — all service tests mock Supabase, but integration tests need realistic question data.
  - **Mitigation:** Integration test uses mocked QuestionService that returns hardcoded test questions. Real question seeding is a separate concern (db:seed script).

- **Risk:** `shared/src/index.ts` barrel export — adding many new exports could cause circular dependency issues.
  - **Mitigation:** New types are in separate files (websocket.ts, match-api.ts, errors.ts) with no imports from other shared modules except enums.ts. Circular deps are unlikely.

---

## Dependency Graph

```
Task 1  (shared constants)     ─┐
Task 2  (shared WS types)      ─┤
                                ├→ Task 3  (EloService)         ─┐
                                ├→ Task 4  (QuestionService)     ├→ Task 8  (GameEngine) ─┐
                                ├→ Task 5  (MatchService)        ┤                        │
                                ├→ Task 6  (DeenPointsService)  ─┘                        │
                                │                                                          │
                                ├→ Task 7  (MatchmakingService)  ─────────────────────────┤
                                │                                                          │
                                ├→ Task 9  (Validators)          ─────────────────────────┤
                                │                                                          │
                                └→ Task 10 (Socket Auth)         ─────────────────────────┤
                                                                                           │
                                                        Task 11 (Socket Handler) ←────────┤
                                                        Task 12 (REST Routes)    ←── Task 5
                                                        Task 13 (Wiring)         ←── All above
                                                        Task 14 (Integration)    ←── Task 13
```

Tasks 3, 4, 5, 6, 7, 9, 10 can be implemented in parallel (after Tasks 1-2).
Task 8 depends on Tasks 3, 4, 5, 6.
Task 11 depends on Tasks 7, 8, 9, 10.
Task 12 depends on Task 5.
Task 13 depends on all services.
Task 14 depends on Task 13.
