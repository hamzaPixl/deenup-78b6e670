// backend/src/__tests__/services/eloService.test.ts
import { EloService } from '../../services/eloService';

describe('EloService', () => {
  let service: EloService;

  beforeEach(() => {
    service = new EloService();
  });

  describe('calculateExpectedScore', () => {
    it('should return ~0.76 when player is 200 points above opponent', () => {
      const expected = service.calculateExpectedScore(1200, 1000);
      expect(expected).toBeCloseTo(0.76, 1);
    });

    it('should return ~0.24 when player is 200 points below opponent', () => {
      const expected = service.calculateExpectedScore(1000, 1200);
      expect(expected).toBeCloseTo(0.24, 1);
    });

    it('should return 0.5 when ratings are equal', () => {
      const expected = service.calculateExpectedScore(1000, 1000);
      expect(expected).toBe(0.5);
    });

    it('should return value between 0 and 1', () => {
      expect(service.calculateExpectedScore(500, 2000)).toBeGreaterThan(0);
      expect(service.calculateExpectedScore(500, 2000)).toBeLessThan(1);
      expect(service.calculateExpectedScore(2000, 500)).toBeGreaterThan(0);
      expect(service.calculateExpectedScore(2000, 500)).toBeLessThan(1);
    });

    it('expected scores of two players should sum to 1', () => {
      const e1 = service.calculateExpectedScore(1200, 1000);
      const e2 = service.calculateExpectedScore(1000, 1200);
      expect(e1 + e2).toBeCloseTo(1, 5);
    });
  });

  describe('calculateEloChange', () => {
    it('should give winner about +8 and loser -8 when favourite wins (200 gap)', () => {
      const result = service.calculateEloChange(1200, 1000, 'win');
      // Favourite wins: small gain
      expect(result.winnerDelta).toBeGreaterThan(0);
      expect(result.winnerDelta).toBeLessThan(15);
      expect(result.loserDelta).toBeLessThan(0);
      expect(result.loserDelta).toBeGreaterThan(-15);
    });

    it('should give winner about +24 and loser -24 when underdog wins (200 gap upset)', () => {
      const result = service.calculateEloChange(1000, 1200, 'win');
      // Underdog wins: large gain
      expect(result.winnerDelta).toBeGreaterThan(15);
      expect(result.loserDelta).toBeLessThan(-15);
    });

    it('should give 0 delta to both players on draw with equal ratings', () => {
      const result = service.calculateEloChange(1000, 1000, 'draw');
      expect(result.winnerDelta).toBe(0);
      expect(result.loserDelta).toBe(0);
    });

    it('should never let ELO go below 0', () => {
      const result = service.calculateEloChange(10, 3000, 'loss');
      // loserNewElo = 10 + loserDelta — should not go below 0
      const loserNewElo = 10 + result.loserDelta;
      expect(loserNewElo).toBeGreaterThanOrEqual(0);
    });
  });

  describe('applyEloChange', () => {
    it('should update winner and loser ELO correctly after a win', () => {
      const result = service.applyEloChange(1200, 1000, 'win');
      expect(result.winnerNewElo).toBeGreaterThan(1200);
      expect(result.loserNewElo).toBeLessThan(1000);
    });

    it('should never produce negative ELO', () => {
      const result = service.applyEloChange(0, 3000, 'loss');
      expect(result.loserNewElo).toBeGreaterThanOrEqual(0);
    });

    it('winner and loser changes should mirror each other on equal ratings draw', () => {
      const result = service.applyEloChange(1000, 1000, 'draw');
      expect(result.winnerNewElo).toBe(1000);
      expect(result.loserNewElo).toBe(1000);
    });
  });
});
