// shared/src/constants/match.ts

export const ELO = {
  /** Standard K-factor for ELO calculation (MVP: constant K=32) */
  K_FACTOR: 32,
  /** Minimum ELO rating — cannot go below this */
  MIN_RATING: 0,
  /** Default starting ELO for new players */
  INITIAL_RATING: 1000,
  /** ELO window for matchmaking (search expands over time) */
  MATCHMAKING_WINDOW_INITIAL: 100,
  MATCHMAKING_WINDOW_MAX: 500,
  MATCHMAKING_WINDOW_STEP: 50,
} as const;

export const MATCHMAKING = {
  /** Queue timeout in seconds — player removed after this */
  QUEUE_TIMEOUT_SECONDS: 120,
  /** How often the matchmaking loop runs, in ms */
  LOOP_INTERVAL_MS: 2_000,
  /** How often the queue window expands (every N intervals) */
  WINDOW_EXPAND_INTERVAL_LOOPS: 5,
} as const;

export const GAME_SESSION = {
  /** Time allowed between answer submission and next question reveal, in ms */
  ANSWER_REVEAL_DELAY_MS: 2_000,
  /** Grace period after time limit before marking as timeout, in ms */
  ANSWER_TIMEOUT_GRACE_MS: 500,
  /** Periodic cleanup interval for orphaned sessions, in ms (5 minutes) */
  CLEANUP_INTERVAL_MS: 5 * 60 * 1_000,
  /** Sessions older than this are considered orphaned, in ms (1 hour) */
  ORPHAN_THRESHOLD_MS: 60 * 60 * 1_000,
} as const;

export const QUESTION_DISTRIBUTION = {
  /** Number of questions per difficulty in a 15-question match */
  easy: 5,
  medium: 5,
  advanced: 5,
} as const;

export const FAST_ANSWER = {
  /** Percentage of time limit — answering in this window is "fast" (e.g. 33%) */
  THRESHOLD_PERCENT: 0.33,
} as const;
