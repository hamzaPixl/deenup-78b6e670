// shared/src/types/game.ts
//
// NAMING CONVENTION NOTE:
// These interfaces use snake_case field names because they map 1:1 to PostgreSQL
// column names (DB-layer types). This is an intentional split from the camelCase
// convention used in auth.ts, which represents API/application-layer types.
// When data crosses the DB → API boundary a mapping utility converts snake_case
// to camelCase. Both conventions coexist in shared/ by design.
//
import type {
  Difficulty,
  QuestionStatus,
  MatchStatus,
  MatchType,
  SourceType,
  PointsTransactionType,
  ModerationStatus,
} from './enums';

export interface Theme {
  id: string;
  slug: string;
  name_fr: string;
  is_mvp: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestionSource {
  id: string;
  question_id: string;
  source_type: SourceType;
  reference: string;
  text_fr: string | null;
  created_at: string;
}

export interface Question {
  id: string;
  theme_id: string;
  difficulty: Difficulty;
  question_fr: string;
  answers: string[];          // Array of 4 answer options (JSONB in DB)
  correct_answer_index: number; // 0-3
  explanation_fr: string;
  status: QuestionStatus;
  created_by?: string | null;
  reviewed_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  player1_id: string;
  player2_id: string | null;
  match_type: MatchType;
  status: MatchStatus;
  winner_id: string | null;
  player1_score: number;
  player2_score: number;
  player1_elo_before: number;
  player2_elo_before: number | null;
  player1_elo_after: number | null;
  player2_elo_after: number | null;
  theme_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MatchQuestion {
  id: string;
  match_id: string;
  question_id: string;
  question_order: number;
  created_at: string;
}

export interface MatchAnswer {
  id: string;
  match_id: string;
  match_question_id: string;
  player_id: string;
  selected_answer_index: number | null; // null = timeout
  is_correct: boolean;
  time_taken_ms: number;
  points_earned: number;
  created_at: string;
}

export interface EloHistory {
  id: string;
  player_id: string;
  match_id: string;
  elo_before: number;
  elo_after: number;
  delta: number;
  created_at: string;
}

export interface DeenPointsTransaction {
  id: string;
  player_id: string;
  transaction_type: PointsTransactionType;
  amount: number;  // positive = credit, negative = debit
  balance_after: number;
  match_id: string | null;
  created_at: string;
}

export interface Profile {
  id: string;                          // References auth.users(id)
  display_name: string;
  avatar_url: string | null;
  elo: number;
  deen_points: number;
  // Aggregate stats (added in migration 011)
  total_matches: number;
  total_wins: number;
  losses: number;
  draws: number;
  win_streak: number;
  best_win_streak: number;
  placement_matches_played: number;    // 0-2: tracks ELO placement progress
  is_placed: boolean;                  // true once 2 placement matches completed
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  player1_id: string;
  player2_id: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  reaction: string | null;
  created_at: string;
}

export interface Salon {
  id: string;
  slug: string;
  name_fr: string;
  emoji: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalonMessage {
  id: string;
  salon_id: string;
  sender_id: string;
  content: string;
  is_pinned: boolean;
  moderation_status: ModerationStatus;
  created_at: string;
  updated_at: string;
}
