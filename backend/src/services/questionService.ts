// backend/src/services/questionService.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { Question, QUESTION_DISTRIBUTION } from '@deenup/shared';
import { MATCH_ERROR_CODES } from '@deenup/shared';
import type { Difficulty } from '@deenup/shared';

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'advanced'];

export class QuestionService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Fetch questions for a match: 5 easy + 5 medium + 5 advanced from a theme.
   * Uses random ordering via PostgreSQL uuid_generate_v4() as a workaround for
   * Supabase's lack of native random() ordering support.
   *
   * Strategy: ORDER BY created_at DESC with LIMIT, then shuffle in memory.
   * This avoids the PostgREST random() limitation (Gap 4 from plan review).
   */
  async getQuestionsForMatch(themeId: string): Promise<Question[]> {
    const questionsByDifficulty = await Promise.all(
      DIFFICULTIES.map((difficulty) =>
        this.fetchQuestionsByDifficulty(themeId, difficulty, QUESTION_DISTRIBUTION[difficulty])
      )
    );

    const allQuestions = questionsByDifficulty.flat();

    if (allQuestions.length < 15) {
      throw {
        code: MATCH_ERROR_CODES.QUESTION_NOT_FOUND,
        message: `Not enough approved questions for theme ${themeId}. Need 15, found ${allQuestions.length}.`,
      };
    }

    // Shuffle the combined list so difficulties are interspersed
    return this.shuffleArray(allQuestions);
  }

  /**
   * Fetch a single question by ID.
   */
  async getQuestionById(questionId: string): Promise<Question> {
    const { data, error } = await this.supabase
      .from('questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (error || !data) {
      throw {
        code: MATCH_ERROR_CODES.QUESTION_NOT_FOUND,
        message: `Question ${questionId} not found`,
      };
    }

    return data as Question;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async fetchQuestionsByDifficulty(
    themeId: string,
    difficulty: Difficulty,
    count: number
  ): Promise<Question[]> {
    // Fetch more than needed (2× count) so we can pick randomly from a larger pool,
    // then shuffle in memory to achieve randomization without random() in SQL.
    const fetchCount = Math.max(count * 2, count + 10);

    const { data, error } = await this.supabase
      .from('questions')
      .select('*')
      .eq('theme_id', themeId)
      .eq('difficulty', difficulty)
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(fetchCount);

    if (error) {
      throw {
        code: MATCH_ERROR_CODES.INTERNAL_ERROR,
        message: `Failed to fetch ${difficulty} questions: ${error.message}`,
      };
    }

    const questions = (data ?? []) as Question[];

    if (questions.length < count) {
      // Not enough for this difficulty — we'll let the caller aggregate and throw
      return questions;
    }

    // Shuffle and take exactly `count`
    return this.shuffleArray(questions).slice(0, count);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
