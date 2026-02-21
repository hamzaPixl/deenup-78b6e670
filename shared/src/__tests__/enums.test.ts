// shared/src/__tests__/enums.test.ts
import {
  ENUM_VALUES,
} from '../index';

describe('Enums', () => {
  describe('Difficulty', () => {
    it('should have exactly the correct values', () => {
      expect(ENUM_VALUES.Difficulty).toEqual(['easy', 'medium', 'advanced']);
    });

    it('should contain easy', () => {
      expect(ENUM_VALUES.Difficulty).toContain('easy');
    });

    it('should contain medium', () => {
      expect(ENUM_VALUES.Difficulty).toContain('medium');
    });

    it('should contain advanced', () => {
      expect(ENUM_VALUES.Difficulty).toContain('advanced');
    });
  });

  describe('QuestionStatus', () => {
    it('should have exactly the correct values', () => {
      expect(ENUM_VALUES.QuestionStatus).toEqual(['draft', 'in_review', 'approved', 'rejected']);
    });
  });

  describe('MatchStatus', () => {
    it('should have exactly the correct values', () => {
      expect(ENUM_VALUES.MatchStatus).toEqual(['waiting', 'in_progress', 'completed', 'abandoned']);
    });
  });

  describe('MatchType', () => {
    it('should have exactly the correct values', () => {
      expect(ENUM_VALUES.MatchType).toEqual(['ranked', 'unranked']);
    });
  });

  describe('SourceType', () => {
    it('should have exactly the correct values', () => {
      expect(ENUM_VALUES.SourceType).toEqual(['quran', 'hadith', 'jurisprudence', 'scholarly']);
    });
  });

  describe('PointsTransactionType', () => {
    it('should have exactly the correct values', () => {
      expect(ENUM_VALUES.PointsTransactionType).toEqual([
        'daily_play',
        'fast_answer',
        'match_win',
        'bonus_time',
        'double_points',
        'hint',
      ]);
    });
  });

  describe('ModerationStatus', () => {
    it('should have exactly the correct values', () => {
      expect(ENUM_VALUES.ModerationStatus).toEqual(['visible', 'flagged', 'hidden', 'deleted']);
    });
  });
});
