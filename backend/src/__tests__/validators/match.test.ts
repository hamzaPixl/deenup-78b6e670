// backend/src/__tests__/validators/match.test.ts
import {
  validateJoinQueue,
  validateSubmitAnswer,
  validateMatchId,
  validateHistoryQuery,
} from '../../validators/match';

const VALID_UUID = 'a1b2c3d4-0001-0001-0001-000000000001';

describe('Match Validators', () => {
  describe('validateJoinQueue', () => {
    it('should pass for valid ranked input', () => {
      const result = validateJoinQueue({ matchType: 'ranked' });
      expect(result.success).toBe(true);
    });

    it('should pass for valid unranked input with themeId', () => {
      const result = validateJoinQueue({ matchType: 'unranked', themeId: VALID_UUID });
      expect(result.success).toBe(true);
    });

    it('should fail for invalid matchType', () => {
      const result = validateJoinQueue({ matchType: 'invalid' });
      expect(result.success).toBe(false);
      expect(result.errors[0].field).toBe('matchType');
    });

    it('should fail for invalid themeId UUID', () => {
      const result = validateJoinQueue({ matchType: 'ranked', themeId: 'not-a-uuid' });
      expect(result.success).toBe(false);
      expect(result.errors[0].field).toBe('themeId');
    });
  });

  describe('validateSubmitAnswer', () => {
    const validPayload = {
      matchId: VALID_UUID,
      questionOrder: 0,
      selectedAnswerIndex: 0,
      timeTakenMs: 5000,
    };

    it('should pass for valid answer submission', () => {
      expect(validateSubmitAnswer(validPayload).success).toBe(true);
    });

    it('should pass when selectedAnswerIndex is null (timeout)', () => {
      expect(validateSubmitAnswer({ ...validPayload, selectedAnswerIndex: null }).success).toBe(true);
    });

    it('should fail for invalid matchId', () => {
      const result = validateSubmitAnswer({ ...validPayload, matchId: 'bad' });
      expect(result.success).toBe(false);
      expect(result.errors.some((e) => e.field === 'matchId')).toBe(true);
    });

    it('should fail for answerIndex > 3', () => {
      const result = validateSubmitAnswer({ ...validPayload, selectedAnswerIndex: 4 });
      expect(result.success).toBe(false);
    });

    it('should fail for negative timeTakenMs', () => {
      const result = validateSubmitAnswer({ ...validPayload, timeTakenMs: -1 });
      expect(result.success).toBe(false);
    });

    it('should fail for questionOrder >= 15', () => {
      const result = validateSubmitAnswer({ ...validPayload, questionOrder: 15 });
      expect(result.success).toBe(false);
    });
  });

  describe('validateMatchId', () => {
    it('should pass for valid UUID', () => {
      expect(validateMatchId(VALID_UUID).success).toBe(true);
    });

    it('should fail for non-UUID string', () => {
      expect(validateMatchId('not-a-uuid').success).toBe(false);
    });
  });

  describe('validateHistoryQuery', () => {
    it('should pass for default values', () => {
      expect(validateHistoryQuery({}).success).toBe(true);
    });

    it('should pass for valid page and pageSize', () => {
      expect(validateHistoryQuery({ page: '2', pageSize: '20' }).success).toBe(true);
    });

    it('should fail for page < 1', () => {
      expect(validateHistoryQuery({ page: '0' }).success).toBe(false);
    });

    it('should fail for pageSize > 100', () => {
      expect(validateHistoryQuery({ pageSize: '101' }).success).toBe(false);
    });
  });
});
