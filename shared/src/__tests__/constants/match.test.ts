// shared/src/__tests__/constants/match.test.ts
import {
  ELO,
  MATCHMAKING,
  GAME_SESSION,
  QUESTION_DISTRIBUTION,
  FAST_ANSWER,
} from '../../constants/match';

describe('Match Constants', () => {
  describe('ELO', () => {
    it('should have K_FACTOR of 32', () => {
      expect(ELO.K_FACTOR).toBe(32);
    });

    it('should have MIN_RATING of 0', () => {
      expect(ELO.MIN_RATING).toBe(0);
    });

    it('should have INITIAL_RATING of 1000', () => {
      expect(ELO.INITIAL_RATING).toBe(1000);
    });

    it('should have matchmaking window constants', () => {
      expect(ELO.MATCHMAKING_WINDOW_INITIAL).toBeGreaterThan(0);
      expect(ELO.MATCHMAKING_WINDOW_MAX).toBeGreaterThan(ELO.MATCHMAKING_WINDOW_INITIAL);
    });
  });

  describe('MATCHMAKING', () => {
    it('should have QUEUE_TIMEOUT_SECONDS of 120', () => {
      expect(MATCHMAKING.QUEUE_TIMEOUT_SECONDS).toBe(120);
    });

    it('should have a positive LOOP_INTERVAL_MS', () => {
      expect(MATCHMAKING.LOOP_INTERVAL_MS).toBeGreaterThan(0);
    });
  });

  describe('GAME_SESSION', () => {
    it('should have a positive ANSWER_REVEAL_DELAY_MS', () => {
      expect(GAME_SESSION.ANSWER_REVEAL_DELAY_MS).toBeGreaterThan(0);
    });

    it('should have CLEANUP_INTERVAL_MS of 5 minutes', () => {
      expect(GAME_SESSION.CLEANUP_INTERVAL_MS).toBe(5 * 60 * 1000);
    });

    it('should have ORPHAN_THRESHOLD_MS of 1 hour', () => {
      expect(GAME_SESSION.ORPHAN_THRESHOLD_MS).toBe(60 * 60 * 1000);
    });
  });

  describe('QUESTION_DISTRIBUTION', () => {
    it('should sum to 15 questions per match', () => {
      const total =
        QUESTION_DISTRIBUTION.easy +
        QUESTION_DISTRIBUTION.medium +
        QUESTION_DISTRIBUTION.advanced;
      expect(total).toBe(15);
    });

    it('should have 5 easy questions', () => {
      expect(QUESTION_DISTRIBUTION.easy).toBe(5);
    });

    it('should have 5 medium questions', () => {
      expect(QUESTION_DISTRIBUTION.medium).toBe(5);
    });

    it('should have 5 advanced questions', () => {
      expect(QUESTION_DISTRIBUTION.advanced).toBe(5);
    });
  });

  describe('FAST_ANSWER', () => {
    it('should have a threshold between 0 and 1', () => {
      expect(FAST_ANSWER.THRESHOLD_PERCENT).toBeGreaterThan(0);
      expect(FAST_ANSWER.THRESHOLD_PERCENT).toBeLessThan(1);
    });
  });
});
