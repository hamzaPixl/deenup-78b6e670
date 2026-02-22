// backend/src/services/matchService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { Match, MatchAnswer, MatchType } from '@deenup/shared';
import { MATCH_ERROR_CODES } from '@deenup/shared';

export interface CreateMatchOptions {
  player1Id: string;
  player2Id: string;
  matchType: MatchType;
  themeId: string;
  player1EloBefore: number;
  player2EloBefore: number;
}

export interface FinalizeMatchOptions {
  matchId: string;
  winnerId: string | null;
  player1Score: number;
  player2Score: number;
  player1EloAfter: number;
  player2EloAfter: number;
}

export interface SaveAnswerOptions {
  matchId: string;
  matchQuestionId: string;
  playerId: string;
  selectedAnswerIndex: number | null;
  isCorrect: boolean;
  timeTakenMs: number;
  pointsEarned: number;
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface MatchHistoryResult {
  matches: Match[];
  total: number;
  page: number;
  pageSize: number;
}

export class MatchService {
  constructor(private supabase: SupabaseClient) {}

  async createMatch(options: CreateMatchOptions): Promise<Match> {
    const { data, error } = await this.supabase
      .from('matches')
      .insert({
        player1_id: options.player1Id,
        player2_id: options.player2Id,
        match_type: options.matchType,
        theme_id: options.themeId,
        status: 'waiting',
        player1_score: 0,
        player2_score: 0,
        player1_elo_before: options.player1EloBefore,
        player2_elo_before: options.player2EloBefore,
      })
      .select()
      .single();

    if (error || !data) {
      throw {
        code: MATCH_ERROR_CODES.INTERNAL_ERROR,
        message: `Failed to create match: ${error?.message ?? 'No data returned'}`,
      };
    }

    return data as Match;
  }

  async getMatchById(matchId: string): Promise<Match> {
    const { data, error } = await this.supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (error || !data) {
      throw {
        code: MATCH_ERROR_CODES.MATCH_NOT_FOUND,
        message: `Match ${matchId} not found`,
      };
    }

    return data as Match;
  }

  async updateMatchStatus(
    matchId: string,
    status: 'waiting' | 'in_progress' | 'completed' | 'abandoned',
    extraFields?: Record<string, unknown>
  ): Promise<Match> {
    const updatePayload: Record<string, unknown> = { status, ...extraFields };
    if (status === 'in_progress' && !extraFields?.started_at) {
      updatePayload['started_at'] = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('matches')
      .update(updatePayload)
      .eq('id', matchId)
      .select()
      .single();

    if (error || !data) {
      throw {
        code: MATCH_ERROR_CODES.INTERNAL_ERROR,
        message: `Failed to update match status: ${error?.message ?? 'No data returned'}`,
      };
    }

    return data as Match;
  }

  async finalizeMatch(options: FinalizeMatchOptions): Promise<Match> {
    const { data, error } = await this.supabase
      .from('matches')
      .update({
        status: 'completed',
        winner_id: options.winnerId,
        player1_score: options.player1Score,
        player2_score: options.player2Score,
        player1_elo_after: options.player1EloAfter,
        player2_elo_after: options.player2EloAfter,
        ended_at: new Date().toISOString(),
      })
      .eq('id', options.matchId)
      .select()
      .single();

    if (error || !data) {
      throw {
        code: MATCH_ERROR_CODES.INTERNAL_ERROR,
        message: `Failed to finalize match: ${error?.message ?? 'No data returned'}`,
      };
    }

    return data as Match;
  }

  /**
   * Save match questions and return their generated UUIDs in question_order.
   * Fix C2: returns real FK IDs so gameEngine can reference them when saving answers.
   */
  async saveMatchQuestions(matchId: string, questionIds: string[]): Promise<string[]> {
    const rows = questionIds.map((questionId, index) => ({
      match_id: matchId,
      question_id: questionId,
      question_order: index,
    }));

    const { data, error } = await this.supabase
      .from('match_questions')
      .insert(rows)
      .select('id, question_order');

    if (error) {
      throw {
        code: MATCH_ERROR_CODES.INTERNAL_ERROR,
        message: `Failed to save match questions: ${error.message}`,
      };
    }

    // Sort by question_order and return IDs in order
    const sorted = ((data ?? []) as { id: string; question_order: number }[])
      .sort((a, b) => a.question_order - b.question_order);
    return sorted.map((row) => row.id);
  }

  async saveAnswer(options: SaveAnswerOptions): Promise<MatchAnswer> {
    const { data, error } = await this.supabase
      .from('match_answers')
      .insert({
        match_id: options.matchId,
        match_question_id: options.matchQuestionId,
        player_id: options.playerId,
        selected_answer_index: options.selectedAnswerIndex,
        is_correct: options.isCorrect,
        time_taken_ms: options.timeTakenMs,
        points_earned: options.pointsEarned,
      })
      .select()
      .single();

    if (error || !data) {
      throw {
        code: MATCH_ERROR_CODES.INTERNAL_ERROR,
        message: `Failed to save answer: ${error?.message ?? 'No data returned'}`,
      };
    }

    return data as MatchAnswer;
  }

  async getMatchHistory(
    playerId: string,
    pagination: PaginationOptions
  ): Promise<MatchHistoryResult> {
    const { page, pageSize } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await this.supabase
      .from('matches')
      .select('*', { count: 'exact' })
      .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`)
      .eq('status', 'completed')
      .order('ended_at', { ascending: false })
      .range(from, to);

    if (error) {
      throw {
        code: MATCH_ERROR_CODES.INTERNAL_ERROR,
        message: `Failed to fetch match history: ${error.message}`,
      };
    }

    return {
      matches: (data ?? []) as Match[],
      total: count ?? 0,
      page,
      pageSize,
    };
  }

  async getMatchAnswers(matchId: string): Promise<MatchAnswer[]> {
    const { data, error } = await this.supabase
      .from('match_answers')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true });

    if (error) {
      throw {
        code: MATCH_ERROR_CODES.INTERNAL_ERROR,
        message: `Failed to fetch match answers: ${error.message}`,
      };
    }

    return (data ?? []) as MatchAnswer[];
  }
}
