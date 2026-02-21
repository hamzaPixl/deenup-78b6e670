# Review: Real-time Match System

## Automated Checks

| Check | Scope | Result |
|-------|-------|--------|
| **TypeScript (shared)** | `shared/src/**/*.ts` | ✅ PASS — no type errors |
| **TypeScript (backend)** | `backend/src/**/*.ts` | ✅ PASS — no type errors |
| **Tests (shared)** | 7 suites, 92 tests | ✅ ALL PASS (0 failures) |
| **Tests (backend)** | 15 suites, 157 tests | ✅ ALL PASS (0 failures, 2 skipped — live DB integration) |
| **Linting** | N/A | ⚠️ No ESLint configured — no linter to run |
| **Coverage** | N/A | ⚠️ No coverage threshold configured in jest.config.js |
| **TODO/FIXME** | Changed files | ✅ None found |

**Total: 249 tests passing, 2 skipped (live DB), 0 failures.**

---

## Summary

**Verdict:** NEEDS WORK

The implementation covers all 13 plan tasks, compiles cleanly, and has 249 passing tests with good coverage of happy paths and basic edge cases. The architecture (services, validators, WebSocket handler, REST routes) follows clean separation of concerns. However, code review uncovered **4 critical bugs** that will cause incorrect behavior in production, plus several high-severity issues around data integrity and security.

---

## Critical Issues (Must Fix)

### C1. ELO applied backwards when player2 wins
**File:** `backend/src/services/gameEngine.ts` lines 304-318
**Severity:** Critical

`applyEloChange` returns `{ winnerNewElo, loserNewElo }` where "winner"/"loser" refer to the first/second argument positions, not the actual match winner. The result is unconditionally mapped as `player1EloAfter: eloResult.winnerNewElo` and `player2EloAfter: eloResult.loserNewElo`. When `outcome = 'loss'` (player2 wins), the losing player gets the rating boost and the winning player gets penalized. **This corrupts ranking data.**

### C2. Race condition on DeenPoints balance update
**File:** `backend/src/services/deenPointsService.ts` lines 64-71
**Severity:** Critical

Classic TOCTOU: `getBalance()` then `update({ deen_points: newBalance })`. If `awardMatchWin` and `awardFastAnswer` fire concurrently for the same player (likely during match finalization), one award is lost. Fix: use atomic SQL `deen_points = deen_points + amount` via RPC or raw SQL.

### C3. Placeholder `matchQuestionId` silently breaks answer persistence
**File:** `backend/src/services/gameEngine.ts` line 246
**Severity:** Critical

```ts
matchQuestionId: `${matchId}-q${questionOrder}`, // placeholder
```
This fabricated string will violate FK constraints (if they exist) or store unjoinable data. Combined with `.catch(() => {})` on line 253, **all answer saves fail silently** — destroying the post-match review feature, which the PRD calls the "most important differentiator."

### C4. Race condition on concurrent `SUBMIT_ANSWER` — can skip questions or double-finalize
**File:** `backend/src/websocket/socketHandler.ts` lines 311-361
**Severity:** Critical

Both players submitting simultaneously can cause `handleBothAnswered` to be called 0 or 2 times due to no locking. Double-finalize corrupts the match; zero calls stalls it permanently. Needs a per-match mutex.

---

## High-Severity Issues (Should Fix Before Ship)

### H1. Hardcoded ELO 1000 for all players in matchmaking
**File:** `backend/src/websocket/socketHandler.ts` line 285

Every player enters the queue with ELO 1000 regardless of actual rating. Makes ranked matchmaking meaningless and stores incorrect `elo_before` values in DB.

### H2. `MatchEndedPayload.answers` is always empty
**File:** `backend/src/websocket/socketHandler.ts` line 144

Hardcoded `answers: []`. Clients never receive answer data for post-match review — the app's key differentiator is broken.

### H3. PostgREST filter injection via string interpolation
**File:** `backend/src/services/matchService.ts` line 199

```ts
.or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
```
`playerId` is interpolated directly into the PostgREST filter string. A crafted `playerId` could alter query semantics. Must validate UUID format before interpolation.

### H4. Disconnect does not abandon active matches
**File:** `backend/src/websocket/socketHandler.ts` lines 388-390

On disconnect, only queue removal happens. Active matches become zombie sessions — opponent waits forever for an answer.

### H5. `handleMatchFound` proceeds with disconnected sockets
**File:** `backend/src/websocket/socketHandler.ts` lines 180-188

If a player disconnects between queue match and session creation, the match is created with a missing player. Creates a zombie match that persists until orphan cleanup (1 hour).

### H6. CORS `origin: '*'` on both Express and Socket.io
**File:** `backend/src/app.ts` lines 34, 61-64

Wide-open CORS. Any website can make authenticated API requests. Acceptable for local dev but must be locked down.

### H7. Cleanup function discarded — no graceful shutdown
**File:** `backend/src/app.ts` line 71

`createSocketHandler()` returns a cleanup function that is never stored. Matchmaking `setInterval` runs forever. No `SIGTERM`/`SIGINT` handler exists.

### H8. `cleanupOrphanedSessions` is never called
**File:** Cross-file

The method exists in `GameEngine` with constants defined, but no code ever starts the cleanup interval. Orphaned sessions leak memory indefinitely.

---

## Security

| Finding | Severity | File |
|---------|----------|------|
| PostgREST filter injection via `playerId` interpolation | **High** | `matchService.ts:199` |
| CORS `origin: '*'` on Express + Socket.io | **High** | `app.ts:34,61` |
| No rate limiting on any endpoint | **Medium** | `app.ts` (missing) |
| `timeTakenMs` not server-validated — client controls scoring | **Medium** | `validators/match.ts`, `gameEngine.ts` |
| No server-side question timeout — matches stall if clients stop responding | **Medium** | `socketHandler.ts` |
| Raw Supabase errors leaked in messages | **Low** | `questionService.ts:85` |
| No security headers (Helmet) | **Low** | `app.ts` |

---

## Completeness

| Requirement | Status |
|-------------|--------|
| ELO calculation service | ✅ Implemented (but C1 bug in application layer) |
| Question fetching with distribution | ✅ Implemented |
| Match CRUD service | ✅ Implemented |
| DeenPoints rewards | ⚠️ Implemented (C2 race condition) |
| Matchmaking queue | ✅ Implemented |
| Game engine orchestration | ⚠️ Implemented (C1, C3, C4 bugs) |
| Socket auth middleware | ✅ Implemented |
| Socket event handler | ⚠️ Implemented (H1, H2, H4, H5 issues) |
| REST match routes | ✅ Implemented |
| Input validators | ✅ Implemented |
| Shared types/constants | ⚠️ Implemented (missing payload types for 11/18 events) |
| Post-match review data | ❌ Broken (H2: answers always empty, C3: answers not persisted) |
| Rematch flow handlers | ❌ Events defined but no handler implementation |
| Power-up (DeenPoints spend) | ❌ No debit/spend method |
| Graceful shutdown | ❌ Not implemented |

---

## Performance

| Finding | Severity |
|---------|----------|
| Biased question randomization — always favors newest questions (`ORDER BY created_at DESC`) | Medium |
| In-memory sessions lost on server restart — no persistence/recovery | Medium |
| Asymmetric ELO window matching — new players can be pulled into wide-gap matches | Low |
| `deenPointsService` `.single()` without `.select()` — `data` always null, falls through to default | Low |

---

## Recommendations

### Must Fix (Critical)
1. **Fix ELO mapping in `gameEngine.finalizeMatch`** — when player2 wins, swap the assignment of `winnerNewElo`/`loserNewElo` to player ELO fields, or refactor `eloService` to accept player1/player2 semantics directly.
2. **Make DeenPoints update atomic** — use Supabase RPC or raw SQL: `deen_points = deen_points + $amount`.
3. **Fix `matchQuestionId`** — store real `match_questions.id` values (returned from `saveMatchQuestions`) and pass them to `saveAnswer`.
4. **Add per-match mutex** for `submitAnswer` in the socket handler to prevent double-finalize/skip.

### Should Fix (High)
5. **Fetch real player ELO** from DB in `JOIN_QUEUE` handler.
6. **Populate `MatchEndedPayload.answers`** with actual answer data from the game session.
7. **Handle disconnect for active matches** — abandon the match and notify opponent.
8. **Guard `handleMatchFound`** against disconnected sockets — abort if either is gone.
9. **Wire up `cleanupOrphanedSessions`** on an interval and store the cleanup function return value.
10. **Add graceful shutdown** — `SIGTERM` handler to stop matchmaking loop, close HTTP server, clean sessions.

### Should Fix (Medium)
11. **Lock down CORS** to allowed origins from env config.
12. **Add rate limiting** on match routes and WebSocket connection.
13. **Validate `timeTakenMs`** against server-side question start timestamp.
14. **Add server-side question timeout** — auto-submit null answers when time expires.
15. **Type `MatchErrorPayload.code` as `MatchErrorCode`** instead of `string`.
16. **Add payload types for remaining 11 WebSocket events**.

---

## Files Reviewed

### Shared Package
- `shared/src/constants/match.ts`
- `shared/src/types/errors.ts`
- `shared/src/types/websocket.ts`
- `shared/src/types/match-api.ts`
- `shared/src/index.ts`

### Backend — Services
- `backend/src/services/eloService.ts`
- `backend/src/services/questionService.ts`
- `backend/src/services/matchService.ts`
- `backend/src/services/deenPointsService.ts`
- `backend/src/services/matchmakingService.ts`
- `backend/src/services/gameEngine.ts`

### Backend — WebSocket
- `backend/src/websocket/socketAuth.ts`
- `backend/src/websocket/socketHandler.ts`

### Backend — Routes & Validators
- `backend/src/routes/matches.ts`
- `backend/src/validators/match.ts`

### Backend — App Wiring
- `backend/src/app.ts`
- `backend/src/index.ts`

### Tests (all 22 test files verified via `npx jest --verbose`)
