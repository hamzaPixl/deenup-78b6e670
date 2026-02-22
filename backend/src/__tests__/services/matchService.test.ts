// backend/src/__tests__/services/matchService.test.ts
import { MatchService } from '../../services/matchService';

// ---------------------------------------------------------------------------
// Supabase mock setup
// ---------------------------------------------------------------------------
const mockFrom = jest.fn();

const mockSupabase = { from: mockFrom };

// Helper: build a fluent chain that resolves to `result`
function makeChain(result: unknown) {
  const chain: Record<string, jest.Mock> = {};
  const self = () => chain;
  chain['select'] = jest.fn().mockImplementation(self);
  chain['insert'] = jest.fn().mockImplementation(self);
  chain['update'] = jest.fn().mockImplementation(self);
  chain['eq'] = jest.fn().mockImplementation(self);
  chain['in'] = jest.fn().mockImplementation(self);
  chain['order'] = jest.fn().mockImplementation(self);
  chain['limit'] = jest.fn().mockImplementation(self);
  chain['range'] = jest.fn().mockImplementation(self);
  chain['single'] = jest.fn().mockResolvedValue(result);
  // Make the chain itself awaitable (for cases without .single())
  Object.assign(chain, Promise.resolve(result));
  return chain;
}

const mockMatch = {
  id: 'match-uuid-1',
  player1_id: 'player-1',
  player2_id: 'player-2',
  match_type: 'ranked',
  status: 'waiting',
  winner_id: null,
  player1_score: 0,
  player2_score: 0,
  player1_elo_before: 1000,
  player2_elo_before: 1000,
  player1_elo_after: null,
  player2_elo_after: null,
  theme_id: 'theme-uuid-1',
  started_at: null,
  ended_at: null,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('MatchService', () => {
  let service: MatchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new MatchService(mockSupabase as any);
  });

  describe('createMatch', () => {
    it('should create a match and return it', async () => {
      mockFrom.mockReturnValue(makeChain({ data: mockMatch, error: null }));

      const match = await service.createMatch({
        player1Id: 'player-1',
        player2Id: 'player-2',
        matchType: 'ranked',
        themeId: 'theme-uuid-1',
        player1EloBefore: 1000,
        player2EloBefore: 1000,
      });

      expect(match.id).toBe('match-uuid-1');
      expect(match.status).toBe('waiting');
    });

    it('should throw INTERNAL_ERROR on database error', async () => {
      const failChain = makeChain({ data: null, error: { message: 'DB error' } });
      mockFrom.mockReturnValue(failChain);

      await expect(
        service.createMatch({
          player1Id: 'player-1',
          player2Id: 'player-2',
          matchType: 'ranked',
          themeId: 'theme-uuid-1',
          player1EloBefore: 1000,
          player2EloBefore: 1000,
        })
      ).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
    });
  });

  describe('getMatchById', () => {
    it('should return a match by id', async () => {
      mockFrom.mockReturnValue(makeChain({ data: mockMatch, error: null }));

      const match = await service.getMatchById('match-uuid-1');
      expect(match.id).toBe('match-uuid-1');
    });

    it('should throw MATCH_NOT_FOUND when match does not exist', async () => {
      mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'Not found' } }));

      await expect(service.getMatchById('nonexistent')).rejects.toMatchObject({
        code: 'MATCH_NOT_FOUND',
      });
    });
  });

  describe('updateMatchStatus', () => {
    it('should update match status to in_progress', async () => {
      const updatedMatch = { ...mockMatch, status: 'in_progress', started_at: '2026-01-01' };
      mockFrom.mockReturnValue(makeChain({ data: updatedMatch, error: null }));

      const match = await service.updateMatchStatus('match-uuid-1', 'in_progress');
      expect(match.status).toBe('in_progress');
    });
  });

  describe('finalizeMatch', () => {
    it('should update match with final scores and ELO', async () => {
      const finalMatch = {
        ...mockMatch,
        status: 'completed',
        winner_id: 'player-1',
        player1_score: 1500,
        player2_score: 800,
        player1_elo_after: 1016,
        player2_elo_after: 984,
        ended_at: '2026-01-01',
      };
      mockFrom.mockReturnValue(makeChain({ data: finalMatch, error: null }));

      const match = await service.finalizeMatch({
        matchId: 'match-uuid-1',
        winnerId: 'player-1',
        player1Score: 1500,
        player2Score: 800,
        player1EloAfter: 1016,
        player2EloAfter: 984,
      });

      expect(match.status).toBe('completed');
      expect(match.winner_id).toBe('player-1');
    });
  });

  describe('saveMatchQuestions', () => {
    it('should insert match questions and return IDs', async () => {
      const insertChain: Record<string, jest.Mock> = {};
      insertChain['insert'] = jest.fn().mockReturnThis();
      insertChain['select'] = jest.fn().mockResolvedValue({
        data: [
          { id: 'mq-uuid-0', question_order: 0 },
          { id: 'mq-uuid-1', question_order: 1 },
        ],
        error: null,
      });
      mockFrom.mockReturnValue(insertChain);

      const ids = await service.saveMatchQuestions('match-uuid-1', ['q-1', 'q-2']);
      expect(ids).toEqual(['mq-uuid-0', 'mq-uuid-1']);
    });
  });

  describe('saveAnswer', () => {
    it('should insert a player answer record', async () => {
      const insertChain: Record<string, jest.Mock> = {};
      insertChain['insert'] = jest.fn().mockReturnThis();
      insertChain['select'] = jest.fn().mockReturnThis();
      insertChain['single'] = jest.fn().mockResolvedValue({
        data: {
          id: 'answer-uuid-1',
          match_id: 'match-uuid-1',
          match_question_id: 'mq-uuid-1',
          player_id: 'player-1',
          selected_answer_index: 0,
          is_correct: true,
          time_taken_ms: 5000,
          points_earned: 75,
          created_at: '2026-01-01',
        },
        error: null,
      });
      mockFrom.mockReturnValue(insertChain);

      const answer = await service.saveAnswer({
        matchId: 'match-uuid-1',
        matchQuestionId: 'mq-uuid-1',
        playerId: 'player-1',
        selectedAnswerIndex: 0,
        isCorrect: true,
        timeTakenMs: 5000,
        pointsEarned: 75,
      });

      expect(answer.is_correct).toBe(true);
      expect(answer.points_earned).toBe(75);
    });
  });

  describe('getMatchHistory', () => {
    it('should return paginated match history for a player', async () => {
      const historyChain: Record<string, jest.Mock> = {};
      historyChain['select'] = jest.fn().mockReturnThis();
      historyChain['or'] = jest.fn().mockReturnThis();
      historyChain['eq'] = jest.fn().mockReturnThis();
      historyChain['order'] = jest.fn().mockReturnThis();
      historyChain['range'] = jest.fn().mockResolvedValue({
        data: [mockMatch],
        error: null,
        count: 1,
      });
      mockFrom.mockReturnValue(historyChain);

      const result = await service.getMatchHistory('player-1', { page: 1, pageSize: 10 });
      expect(result.matches).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
