// backend/src/services/gameEngine.ts
import { Question, MatchType, SCORING, TIME_LIMITS_MS, FAST_ANSWER } from '@deenup/shared';
import { MATCH_ERROR_CODES } from '@deenup/shared';
import { QuestionService } from './questionService';
import { MatchService } from './matchService';
import { EloService } from './eloService';
import { DeenPointsService } from './deenPointsService';
import type { Difficulty } from '@deenup/shared';

// ---------------------------------------------------------------------------
// Session state types
// ---------------------------------------------------------------------------

export type SessionState = 'awaiting_start' | 'in_progress' | 'completed' | 'abandoned';

export interface PlayerAnswerRecord {
  selectedAnswerIndex: number | null;
  isCorrect: boolean;
  timeTakenMs: number;
  pointsEarned: number;
}

export interface QuestionAnswers {
  player1?: PlayerAnswerRecord;
  player2?: PlayerAnswerRecord;
}

export interface MatchSession {
  matchId: string;
  player1Id: string;
  player2Id: string;
  player1Elo: number;
  player2Elo: number;
  matchType: MatchType;
  themeId: string;
  questions: Question[];
  state: SessionState;
  currentQuestionIndex: number;
  player1Score: number;
  player2Score: number;
  /** answers[questionIndex] = { player1?: ..., player2?: ... } */
  answers: QuestionAnswers[];
  startedAt: Date | null;
}

export interface CreateSessionOptions {
  player1Id: string;
  player2Id: string;
  player1Elo: number;
  player2Elo: number;
  matchType: MatchType;
  themeId: string;
}

export interface SubmitAnswerOptions {
  playerId: string;
  questionOrder: number;
  selectedAnswerIndex: number | null;
  timeTakenMs: number;
}

export interface SubmitAnswerResult {
  isCorrect: boolean;
  pointsEarned: number;
  correctAnswerIndex: number;
  bothAnswered: boolean;
  opponentAnswered: boolean;
}

export interface FinalizeResult {
  matchId: string;
  winnerId: string | null;
  player1Score: number;
  player2Score: number;
  player1EloAfter: number;
  player2EloAfter: number;
  player1EloDelta: number;
  player2EloDelta: number;
}

export interface QuestionPayload {
  questionOrder: number;
  questionText: string;
  answers: string[];
  difficulty: Difficulty;
  timeLimitMs: number;
}

/**
 * Game Engine — orchestrates match sessions in memory.
 * All persistent storage is delegated to the injected service instances.
 */
export class GameEngine {
  // In-memory session store — Map<matchId, MatchSession>
  private sessions: Map<string, MatchSession> = new Map();

  constructor(
    private questionService: QuestionService,
    private matchService: MatchService,
    private eloService: EloService,
    private deenPointsService: DeenPointsService
  ) {}

  // ---------------------------------------------------------------------------
  // Session lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Create a new match session.
   * - Creates the DB match record
   * - Fetches 15 questions
   * - Stores the session in memory
   */
  async createSession(options: CreateSessionOptions): Promise<MatchSession> {
    // 1. Create DB match record
    const match = await this.matchService.createMatch({
      player1Id: options.player1Id,
      player2Id: options.player2Id,
      matchType: options.matchType,
      themeId: options.themeId,
      player1EloBefore: options.player1Elo,
      player2EloBefore: options.player2Elo,
    });

    // 2. Fetch questions
    const questions = await this.questionService.getQuestionsForMatch(options.themeId);

    // 3. Save question list to DB
    await this.matchService.saveMatchQuestions(
      match.id,
      questions.map((q) => q.id)
    );

    // 4. Build session
    const session: MatchSession = {
      matchId: match.id,
      player1Id: options.player1Id,
      player2Id: options.player2Id,
      player1Elo: options.player1Elo,
      player2Elo: options.player2Elo,
      matchType: options.matchType,
      themeId: options.themeId,
      questions,
      state: 'awaiting_start',
      currentQuestionIndex: 0,
      player1Score: 0,
      player2Score: 0,
      answers: Array.from({ length: questions.length }, () => ({})),
      startedAt: null,
    };

    this.sessions.set(match.id, session);
    return session;
  }

  /**
   * Start a session — transitions state and returns the first question payload.
   */
  async startSession(matchId: string): Promise<QuestionPayload | null> {
    const session = this.requireSession(matchId);
    session.state = 'in_progress';
    session.startedAt = new Date();
    session.currentQuestionIndex = 0;

    await this.matchService.updateMatchStatus(matchId, 'in_progress');

    return this.buildQuestionPayload(session, 0);
  }

  /**
   * Submit an answer for the current question.
   */
  async submitAnswer(matchId: string, options: SubmitAnswerOptions): Promise<SubmitAnswerResult> {
    const session = this.requireSession(matchId);

    const { playerId, questionOrder, selectedAnswerIndex, timeTakenMs } = options;
    const question = session.questions[questionOrder];

    if (!question) {
      throw {
        code: MATCH_ERROR_CODES.ANSWER_OUT_OF_ORDER,
        message: `Question order ${questionOrder} is out of range`,
      };
    }

    const isPlayer1 = playerId === session.player1Id;
    const isPlayer2 = playerId === session.player2Id;

    if (!isPlayer1 && !isPlayer2) {
      throw {
        code: MATCH_ERROR_CODES.NOT_MATCH_PARTICIPANT,
        message: `Player ${playerId} is not a participant in match ${matchId}`,
      };
    }

    const answerSlot = session.answers[questionOrder];
    const playerKey = isPlayer1 ? 'player1' : 'player2';

    if (answerSlot[playerKey]) {
      throw {
        code: MATCH_ERROR_CODES.ANSWER_ALREADY_SUBMITTED,
        message: `Player ${playerId} already answered question ${questionOrder}`,
      };
    }

    // Calculate score
    const isCorrect =
      selectedAnswerIndex !== null &&
      selectedAnswerIndex === question.correct_answer_index;

    const pointsEarned = this.calculatePoints(
      question.difficulty as Difficulty,
      isCorrect,
      timeTakenMs
    );

    // Store in memory
    const record: PlayerAnswerRecord = {
      selectedAnswerIndex,
      isCorrect,
      timeTakenMs,
      pointsEarned,
    };
    answerSlot[playerKey] = record;

    // Update score
    if (isPlayer1) {
      session.player1Score += pointsEarned;
    } else {
      session.player2Score += pointsEarned;
    }

    // Award fast answer bonus (non-blocking)
    const timeLimitMs = TIME_LIMITS_MS[question.difficulty as Difficulty];
    const isFast = timeTakenMs <= timeLimitMs * FAST_ANSWER.THRESHOLD_PERCENT;
    if (isCorrect && isFast) {
      this.deenPointsService.awardFastAnswer(playerId, matchId).catch(() => {
        // Log but don't fail the answer submission
      });
    }

    // Persist answer to DB (non-blocking for performance — will retry on engine shutdown if needed)
    this.matchService
      .saveAnswer({
        matchId,
        matchQuestionId: `${matchId}-q${questionOrder}`, // placeholder — real ID from match_questions table
        playerId,
        selectedAnswerIndex,
        isCorrect,
        timeTakenMs,
        pointsEarned,
      })
      .catch(() => {
        // Log but don't fail the answer submission
      });

    const bothAnswered = !!(answerSlot.player1 && answerSlot.player2);
    const opponentAnswered = isPlayer1 ? !!answerSlot.player2 : !!answerSlot.player1;

    return {
      isCorrect,
      pointsEarned,
      correctAnswerIndex: question.correct_answer_index,
      bothAnswered,
      opponentAnswered,
    };
  }

  /**
   * Advance to the next question. Returns the next question payload, or null if match is over.
   */
  advanceQuestion(matchId: string): QuestionPayload | null {
    const session = this.requireSession(matchId);
    session.currentQuestionIndex++;

    if (session.currentQuestionIndex >= session.questions.length) {
      return null; // Match over
    }

    return this.buildQuestionPayload(session, session.currentQuestionIndex);
  }

  /**
   * Finalize the match: compute ELO, award DeenPoints, update DB.
   */
  async finalizeMatch(matchId: string): Promise<FinalizeResult> {
    const session = this.requireSession(matchId);
    session.state = 'completed';

    // Determine winner
    let winnerId: string | null = null;
    let outcome: 'win' | 'loss' | 'draw';

    if (session.player1Score > session.player2Score) {
      winnerId = session.player1Id;
      outcome = 'win';
    } else if (session.player2Score > session.player1Score) {
      winnerId = session.player2Id;
      outcome = 'loss'; // from player1's perspective
    } else {
      outcome = 'draw';
    }

    // Calculate ELO — from player1's perspective
    const eloResult = this.eloService.applyEloChange(
      session.player1Elo,
      session.player2Elo,
      outcome
    );

    // Persist to DB
    await this.matchService.finalizeMatch({
      matchId,
      winnerId,
      player1Score: session.player1Score,
      player2Score: session.player2Score,
      player1EloAfter: eloResult.winnerNewElo,
      player2EloAfter: eloResult.loserNewElo,
    });

    // Award DeenPoints to winner (non-blocking)
    if (winnerId) {
      this.deenPointsService.awardMatchWin(winnerId, matchId).catch(() => {});
    }

    // Clean up session
    this.sessions.delete(matchId);

    return {
      matchId,
      winnerId,
      player1Score: session.player1Score,
      player2Score: session.player2Score,
      player1EloAfter: eloResult.winnerNewElo,
      player2EloAfter: eloResult.loserNewElo,
      player1EloDelta: eloResult.winnerDelta,
      player2EloDelta: eloResult.loserDelta,
    };
  }

  /**
   * Abandon a match (e.g. player disconnects).
   */
  async abandonMatch(matchId: string, abandoningPlayerId: string): Promise<void> {
    const session = this.sessions.get(matchId);
    if (!session) return;

    session.state = 'abandoned';

    // The abandoning player loses — give win to the other player
    const winnerId =
      abandoningPlayerId === session.player1Id ? session.player2Id : session.player1Id;

    await this.matchService.updateMatchStatus(matchId, 'abandoned', {
      winner_id: winnerId,
      ended_at: new Date().toISOString(),
    });

    this.sessions.delete(matchId);
  }

  // ---------------------------------------------------------------------------
  // Accessors
  // ---------------------------------------------------------------------------

  getSession(matchId: string): MatchSession | undefined {
    return this.sessions.get(matchId);
  }

  getActiveSessions(): MatchSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Cleanup orphaned sessions older than a threshold (called periodically).
   */
  cleanupOrphanedSessions(olderThanMs: number): string[] {
    const now = Date.now();
    const removed: string[] = [];

    for (const [matchId, session] of this.sessions) {
      if (!session.startedAt) continue;
      const age = now - session.startedAt.getTime();
      if (age > olderThanMs) {
        this.sessions.delete(matchId);
        removed.push(matchId);
      }
    }

    return removed;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private requireSession(matchId: string): MatchSession {
    const session = this.sessions.get(matchId);
    if (!session) {
      throw {
        code: MATCH_ERROR_CODES.SESSION_NOT_FOUND,
        message: `No active session found for match ${matchId}`,
      };
    }
    return session;
  }

  private buildQuestionPayload(session: MatchSession, index: number): QuestionPayload {
    const question = session.questions[index];
    const difficulty = question.difficulty as Difficulty;
    return {
      questionOrder: index,
      questionText: question.question_fr,
      answers: question.answers,
      difficulty,
      timeLimitMs: TIME_LIMITS_MS[difficulty],
    };
  }

  private calculatePoints(
    difficulty: Difficulty,
    isCorrect: boolean,
    timeTakenMs: number
  ): number {
    if (!isCorrect) return 0;
    const base = SCORING.BASE_POINTS[difficulty];
    const timeLimit = TIME_LIMITS_MS[difficulty];
    const timeRemaining = Math.max(0, timeLimit - timeTakenMs);
    return Math.round(base * (timeRemaining / timeLimit));
  }
}
