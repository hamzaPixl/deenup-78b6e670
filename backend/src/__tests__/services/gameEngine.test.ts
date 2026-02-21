// backend/src/__tests__/services/gameEngine.test.ts
import { GameEngine } from '../../services/gameEngine';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------
const mockQuestionService = {
  getQuestionsForMatch: jest.fn(),
  getQuestionById: jest.fn(),
};

const mockMatchService = {
  createMatch: jest.fn(),
  updateMatchStatus: jest.fn(),
  finalizeMatch: jest.fn(),
  saveMatchQuestions: jest.fn(),
  saveAnswer: jest.fn(),
  getMatchAnswers: jest.fn(),
};

const mockEloService = {
  applyEloChange: jest.fn(),
};

const mockDeenPointsService = {
  awardMatchWin: jest.fn(),
  awardFastAnswer: jest.fn(),
};

const mockQuestions = Array.from({ length: 15 }, (_, i) => ({
  id: `q-${i + 1}`,
  theme_id: 'theme-uuid-1',
  difficulty: i < 5 ? 'easy' : i < 10 ? 'medium' : 'advanced',
  question_fr: `Question ${i + 1}`,
  answers: ['A', 'B', 'C', 'D'],
  correct_answer_index: 0,
  explanation_fr: `Explanation ${i + 1}`,
  status: 'approved',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
}));

const mockMatch = {
  id: 'match-uuid-1',
  player1_id: 'player-1',
  player2_id: 'player-2',
  match_type: 'ranked',
  status: 'waiting',
  player1_elo_before: 1000,
  player2_elo_before: 1000,
  player1_score: 0,
  player2_score: 0,
  theme_id: 'theme-uuid-1',
};

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new GameEngine(
      mockQuestionService as any,
      mockMatchService as any,
      mockEloService as any,
      mockDeenPointsService as any
    );

    // Default mocks
    mockQuestionService.getQuestionsForMatch.mockResolvedValue(mockQuestions);
    mockMatchService.createMatch.mockResolvedValue(mockMatch);
    mockMatchService.updateMatchStatus.mockResolvedValue({ ...mockMatch, status: 'in_progress' });
    mockMatchService.finalizeMatch.mockResolvedValue({ ...mockMatch, status: 'completed' });
    mockMatchService.saveMatchQuestions.mockResolvedValue(undefined);
    mockMatchService.saveAnswer.mockResolvedValue({
      id: 'answer-1',
      match_id: 'match-uuid-1',
      match_question_id: 'mq-1',
      player_id: 'player-1',
      selected_answer_index: 0,
      is_correct: true,
      time_taken_ms: 5000,
      points_earned: 75,
      created_at: '2026-01-01',
    });
    mockMatchService.getMatchAnswers.mockResolvedValue([]);
    mockEloService.applyEloChange.mockReturnValue({
      winnerNewElo: 1016,
      loserNewElo: 984,
      winnerDelta: 16,
      loserDelta: -16,
    });
    mockDeenPointsService.awardMatchWin.mockResolvedValue(120);
    mockDeenPointsService.awardFastAnswer.mockResolvedValue(105);
  });

  describe('createSession', () => {
    it('should create a match session with questions', async () => {
      const session = await engine.createSession({
        player1Id: 'player-1',
        player2Id: 'player-2',
        player1Elo: 1000,
        player2Elo: 1000,
        matchType: 'ranked',
        themeId: 'theme-uuid-1',
      });

      expect(session.matchId).toBe('match-uuid-1');
      expect(session.questions).toHaveLength(15);
      expect(mockMatchService.createMatch).toHaveBeenCalledTimes(1);
      expect(mockMatchService.saveMatchQuestions).toHaveBeenCalledTimes(1);
    });

    it('should set session state to awaiting_start', async () => {
      const session = await engine.createSession({
        player1Id: 'player-1',
        player2Id: 'player-2',
        player1Elo: 1000,
        player2Elo: 1000,
        matchType: 'ranked',
        themeId: 'theme-uuid-1',
      });

      expect(session.state).toBe('awaiting_start');
    });
  });

  describe('startSession', () => {
    it('should start a session and return the first question', async () => {
      const session = await engine.createSession({
        player1Id: 'player-1',
        player2Id: 'player-2',
        player1Elo: 1000,
        player2Elo: 1000,
        matchType: 'ranked',
        themeId: 'theme-uuid-1',
      });

      const firstQuestion = await engine.startSession(session.matchId);
      expect(firstQuestion).not.toBeNull();
      expect(firstQuestion?.questionOrder).toBe(0);
      expect(firstQuestion?.questionText).toBe('Question 1');
    });
  });

  describe('submitAnswer', () => {
    it('should accept a valid answer and return scoring info', async () => {
      const session = await engine.createSession({
        player1Id: 'player-1',
        player2Id: 'player-2',
        player1Elo: 1000,
        player2Elo: 1000,
        matchType: 'ranked',
        themeId: 'theme-uuid-1',
      });
      await engine.startSession(session.matchId);

      const result = await engine.submitAnswer(session.matchId, {
        playerId: 'player-1',
        questionOrder: 0,
        selectedAnswerIndex: 0, // correct answer
        timeTakenMs: 5000,
      });

      expect(result.isCorrect).toBe(true);
      expect(result.pointsEarned).toBeGreaterThan(0);
    });

    it('should throw ANSWER_ALREADY_SUBMITTED if player answers twice', async () => {
      const session = await engine.createSession({
        player1Id: 'player-1',
        player2Id: 'player-2',
        player1Elo: 1000,
        player2Elo: 1000,
        matchType: 'ranked',
        themeId: 'theme-uuid-1',
      });
      await engine.startSession(session.matchId);

      await engine.submitAnswer(session.matchId, {
        playerId: 'player-1',
        questionOrder: 0,
        selectedAnswerIndex: 0,
        timeTakenMs: 5000,
      });

      await expect(
        engine.submitAnswer(session.matchId, {
          playerId: 'player-1',
          questionOrder: 0,
          selectedAnswerIndex: 1,
          timeTakenMs: 6000,
        })
      ).rejects.toMatchObject({ code: 'ANSWER_ALREADY_SUBMITTED' });
    });

    it('should return both answered after both players submit', async () => {
      const session = await engine.createSession({
        player1Id: 'player-1',
        player2Id: 'player-2',
        player1Elo: 1000,
        player2Elo: 1000,
        matchType: 'ranked',
        themeId: 'theme-uuid-1',
      });
      await engine.startSession(session.matchId);

      await engine.submitAnswer(session.matchId, {
        playerId: 'player-1',
        questionOrder: 0,
        selectedAnswerIndex: 0,
        timeTakenMs: 5000,
      });

      const result = await engine.submitAnswer(session.matchId, {
        playerId: 'player-2',
        questionOrder: 0,
        selectedAnswerIndex: 1,
        timeTakenMs: 8000,
      });

      expect(result.bothAnswered).toBe(true);
    });
  });

  describe('finalizeMatch', () => {
    it('should finalize a match and return result', async () => {
      const session = await engine.createSession({
        player1Id: 'player-1',
        player2Id: 'player-2',
        player1Elo: 1000,
        player2Elo: 1000,
        matchType: 'ranked',
        themeId: 'theme-uuid-1',
      });

      const result = await engine.finalizeMatch(session.matchId);
      expect(result.matchId).toBe('match-uuid-1');
      expect(mockMatchService.finalizeMatch).toHaveBeenCalledTimes(1);
      expect(mockEloService.applyEloChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('getSession', () => {
    it('should return session by matchId', async () => {
      const session = await engine.createSession({
        player1Id: 'player-1',
        player2Id: 'player-2',
        player1Elo: 1000,
        player2Elo: 1000,
        matchType: 'ranked',
        themeId: 'theme-uuid-1',
      });

      const retrieved = engine.getSession(session.matchId);
      expect(retrieved?.matchId).toBe('match-uuid-1');
    });

    it('should return undefined for non-existent session', () => {
      const session = engine.getSession('nonexistent');
      expect(session).toBeUndefined();
    });
  });
});
