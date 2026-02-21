// shared/src/types/match-api.ts
// Payload types for WebSocket events and REST match API

import type { MatchType, Difficulty } from './enums';
import type { Match, MatchAnswer } from './game';

// ---------------------------------------------------------------------------
// Client → Server payloads
// ---------------------------------------------------------------------------

export interface JoinQueuePayload {
  matchType: MatchType;
  themeId?: string; // optional — omit for random theme
}

export interface SubmitAnswerPayload {
  matchId: string;
  questionOrder: number; // 0-indexed position in the match
  selectedAnswerIndex: number | null; // null = intentional timeout
  timeTakenMs: number;
}

// ---------------------------------------------------------------------------
// Server → Client payloads
// ---------------------------------------------------------------------------

export interface QueueJoinedPayload {
  position: number;
  estimatedWaitSeconds: number;
}

export interface MatchFoundPayload {
  matchId: string;
  opponentId: string;
  opponentDisplayName: string;
  opponentElo: number;
  matchType: MatchType;
  themeId: string;
}

export interface QuestionStartPayload {
  matchId: string;
  questionOrder: number; // 0-indexed
  totalQuestions: number;
  questionId: string;
  questionText: string;
  answers: string[]; // shuffled options displayed to player
  difficulty: Difficulty;
  timeLimitMs: number;
}

export interface QuestionRevealPayload {
  matchId: string;
  questionOrder: number;
  correctAnswerIndex: number;
  explanationFr: string;
  player1Answer: AnswerSummary | null;
  player2Answer: AnswerSummary | null;
  player1Score: number;
  player2Score: number;
}

export interface AnswerSummary {
  playerId: string;
  selectedAnswerIndex: number | null;
  isCorrect: boolean;
  timeTakenMs: number;
  pointsEarned: number;
}

export interface AnswerAcceptedPayload {
  matchId: string;
  questionOrder: number;
  isCorrect: boolean;
  pointsEarned: number;
  correctAnswerIndex: number;
}

export interface OpponentAnsweredPayload {
  matchId: string;
  questionOrder: number;
  // We only tell the player that the opponent answered — not which answer (to prevent cheating)
  answeredAt: string; // ISO timestamp
}

export interface MatchEndedPayload {
  matchId: string;
  winnerId: string | null; // null = draw
  player1Score: number;
  player2Score: number;
  player1EloChange: number;
  player2EloChange: number;
  player1EloAfter: number;
  player2EloAfter: number;
  answers: MatchAnswer[]; // full review data
}

export interface MatchErrorPayload {
  code: string;
  message: string;
}

// ---------------------------------------------------------------------------
// REST API types
// ---------------------------------------------------------------------------

export interface MatchHistoryResponse {
  matches: Match[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MatchDetailResponse {
  match: Match;
  answers: MatchAnswer[];
}
