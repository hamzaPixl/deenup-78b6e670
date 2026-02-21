// backend/src/__tests__/services/deenPointsService.test.ts
import { DeenPointsService } from '../../services/deenPointsService';
import { DEEN_POINTS } from '@deenup/shared';

const mockFrom = jest.fn();
const mockSupabase = { from: mockFrom };

function makeChain(result: unknown) {
  const chain: Record<string, jest.Mock> = {};
  const self = () => chain;
  chain['select'] = jest.fn().mockImplementation(self);
  chain['insert'] = jest.fn().mockImplementation(self);
  chain['update'] = jest.fn().mockImplementation(self);
  chain['eq'] = jest.fn().mockImplementation(self);
  chain['single'] = jest.fn().mockResolvedValue(result);
  Object.assign(chain, Promise.resolve(result));
  return chain;
}

const mockProfile = {
  id: 'player-1',
  deen_points: 100,
};

describe('DeenPointsService', () => {
  let service: DeenPointsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DeenPointsService(mockSupabase as any);
  });

  describe('awardMatchWin', () => {
    it('should award MATCH_WIN_REWARD points', async () => {
      // First call: fetch current balance
      const fetchChain = makeChain({ data: mockProfile, error: null });
      // Second call: update balance
      const updateChain = makeChain({
        data: { ...mockProfile, deen_points: 100 + DEEN_POINTS.MATCH_WIN_REWARD },
        error: null,
      });
      // Third call: insert transaction record
      const insertChain: Record<string, jest.Mock> = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return fetchChain;
        if (callCount === 2) return updateChain;
        return insertChain;
      });

      const newBalance = await service.awardMatchWin('player-1', 'match-1');
      expect(newBalance).toBe(100 + DEEN_POINTS.MATCH_WIN_REWARD);
    });
  });

  describe('awardFastAnswer', () => {
    it('should award FAST_ANSWER_REWARD points', async () => {
      const fetchChain = makeChain({ data: mockProfile, error: null });
      const updateChain = makeChain({
        data: { ...mockProfile, deen_points: 100 + DEEN_POINTS.FAST_ANSWER_REWARD },
        error: null,
      });
      const insertChain: Record<string, jest.Mock> = {
        insert: jest.fn().mockResolvedValue({ error: null }),
      };

      let callCount = 0;
      mockFrom.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return fetchChain;
        if (callCount === 2) return updateChain;
        return insertChain;
      });

      const newBalance = await service.awardFastAnswer('player-1', 'match-1');
      expect(newBalance).toBe(100 + DEEN_POINTS.FAST_ANSWER_REWARD);
    });
  });

  describe('getBalance', () => {
    it('should return current deen_points balance', async () => {
      mockFrom.mockReturnValue(makeChain({ data: mockProfile, error: null }));
      const balance = await service.getBalance('player-1');
      expect(balance).toBe(100);
    });

    it('should throw INTERNAL_ERROR on database error', async () => {
      mockFrom.mockReturnValue(makeChain({ data: null, error: { message: 'DB error' } }));
      await expect(service.getBalance('player-1')).rejects.toMatchObject({
        code: 'INTERNAL_ERROR',
      });
    });
  });
});
