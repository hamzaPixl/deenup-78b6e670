// shared/src/__tests__/review-constants.test.ts
import { REVIEW_ERROR_CODES } from '../index';

describe('REVIEW_ERROR_CODES', () => {
  it('should define MATCH_NOT_FOUND error code', () => {
    expect(REVIEW_ERROR_CODES.MATCH_NOT_FOUND).toBe('MATCH_NOT_FOUND');
  });

  it('should define MATCH_NOT_REVIEWABLE error code', () => {
    expect(REVIEW_ERROR_CODES.MATCH_NOT_REVIEWABLE).toBe('MATCH_NOT_REVIEWABLE');
  });

  it('should define NOT_PARTICIPANT error code', () => {
    expect(REVIEW_ERROR_CODES.NOT_PARTICIPANT).toBe('NOT_PARTICIPANT');
  });

  it('should have exactly 3 error codes', () => {
    expect(Object.keys(REVIEW_ERROR_CODES).length).toBe(3);
  });
});
