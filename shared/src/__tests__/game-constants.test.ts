// shared/src/__tests__/game-constants.test.ts
import {
  SCORING,
  TIME_LIMITS,
  MATCH_FORMAT,
  DEEN_POINTS,
  POWERUP_COSTS,
  THEMES,
  SALONS,
} from '../index';

describe('Game Constants', () => {
  describe('SCORING', () => {
    it('should define base points for easy questions', () => {
      expect(SCORING.BASE_POINTS.easy).toBe(100);
    });

    it('should define base points for medium questions', () => {
      expect(SCORING.BASE_POINTS.medium).toBe(200);
    });

    it('should define base points for advanced questions', () => {
      expect(SCORING.BASE_POINTS.advanced).toBe(400);
    });
  });

  describe('TIME_LIMITS', () => {
    it('should define 15 seconds for easy questions', () => {
      expect(TIME_LIMITS.easy).toBe(15);
    });

    it('should define 20 seconds for medium questions', () => {
      expect(TIME_LIMITS.medium).toBe(20);
    });

    it('should define 30 seconds for advanced questions', () => {
      expect(TIME_LIMITS.advanced).toBe(30);
    });
  });

  describe('MATCH_FORMAT', () => {
    it('should have 15 questions per match', () => {
      expect(MATCH_FORMAT.QUESTIONS_PER_MATCH).toBe(15);
    });
  });

  describe('DEEN_POINTS', () => {
    it('should define starting balance of 50', () => {
      expect(DEEN_POINTS.STARTING_BALANCE).toBe(50);
    });
  });

  describe('POWERUP_COSTS', () => {
    it('should cost 10 points for bonus time', () => {
      expect(POWERUP_COSTS.bonus_time).toBe(10);
    });

    it('should cost 10 points for double points', () => {
      expect(POWERUP_COSTS.double_points).toBe(10);
    });

    it('should cost 10 points for hint', () => {
      expect(POWERUP_COSTS.hint).toBe(10);
    });

    it('should add 5 seconds for bonus time', () => {
      expect(POWERUP_COSTS.bonus_time_seconds).toBe(5);
    });
  });

  describe('THEMES', () => {
    it('should contain 8 themes', () => {
      expect(Object.keys(THEMES).length).toBe(8);
    });

    it('should have QURAN theme with id, slug, name_fr, and is_mvp', () => {
      expect(THEMES.QURAN).toMatchObject({
        slug: 'quran',
        name_fr: expect.any(String),
        is_mvp: true,
      });
      expect(THEMES.QURAN.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('should have PROPHETS theme marked as MVP', () => {
      expect(THEMES.PROPHETS.is_mvp).toBe(true);
    });

    it('should have MUHAMMAD theme marked as MVP', () => {
      expect(THEMES.MUHAMMAD.is_mvp).toBe(true);
    });

    it('should have non-MVP themes marked correctly', () => {
      expect(THEMES.JURISPRUDENCE.is_mvp).toBe(false);
      expect(THEMES.HISTORY.is_mvp).toBe(false);
      expect(THEMES.COMPANIONS.is_mvp).toBe(false);
      expect(THEMES.TEXTS.is_mvp).toBe(false);
      expect(THEMES.GENERAL.is_mvp).toBe(false);
    });

    it('should have unique IDs for all themes', () => {
      const ids = Object.values(THEMES).map((t) => t.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('SALONS', () => {
    it('should contain 4 salons', () => {
      expect(Object.keys(SALONS).length).toBe(4);
    });

    it('should have QURAN salon with id, slug, name_fr, and emoji', () => {
      expect(SALONS.QURAN).toMatchObject({
        slug: 'quran',
        name_fr: expect.any(String),
        emoji: '📖',
      });
      expect(SALONS.QURAN.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      );
    });

    it('should have PROPHETS, GENERAL, and COMPETITION salons', () => {
      expect(SALONS.PROPHETS).toBeDefined();
      expect(SALONS.GENERAL).toBeDefined();
      expect(SALONS.COMPETITION).toBeDefined();
    });

    it('should have unique IDs for all salons', () => {
      const ids = Object.values(SALONS).map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});
