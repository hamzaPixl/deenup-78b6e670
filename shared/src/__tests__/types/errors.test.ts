// shared/src/__tests__/types/errors.test.ts
import { MATCH_ERROR_CODES } from '../../types/errors';

describe('MATCH_ERROR_CODES', () => {
  it('should define ALREADY_IN_QUEUE', () => {
    expect(MATCH_ERROR_CODES.ALREADY_IN_QUEUE).toBe('ALREADY_IN_QUEUE');
  });

  it('should define MATCH_NOT_FOUND', () => {
    expect(MATCH_ERROR_CODES.MATCH_NOT_FOUND).toBe('MATCH_NOT_FOUND');
  });

  it('should define SOCKET_UNAUTHORIZED', () => {
    expect(MATCH_ERROR_CODES.SOCKET_UNAUTHORIZED).toBe('SOCKET_UNAUTHORIZED');
  });

  it('should define ANSWER_ALREADY_SUBMITTED', () => {
    expect(MATCH_ERROR_CODES.ANSWER_ALREADY_SUBMITTED).toBe('ANSWER_ALREADY_SUBMITTED');
  });

  it('should define all expected error codes', () => {
    const requiredCodes = [
      'ALREADY_IN_QUEUE',
      'NOT_IN_QUEUE',
      'MATCHMAKING_TIMEOUT',
      'MATCH_NOT_FOUND',
      'MATCH_NOT_IN_PROGRESS',
      'NOT_MATCH_PARTICIPANT',
      'QUESTION_NOT_FOUND',
      'ANSWER_ALREADY_SUBMITTED',
      'INVALID_ANSWER_INDEX',
      'QUESTION_TIMED_OUT',
      'SESSION_NOT_FOUND',
      'SOCKET_UNAUTHORIZED',
      'INTERNAL_ERROR',
      'VALIDATION_ERROR',
    ];
    for (const code of requiredCodes) {
      expect(Object.values(MATCH_ERROR_CODES)).toContain(code);
    }
  });
});
