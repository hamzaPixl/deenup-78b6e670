// backend/src/validators/match.ts
import { MATCH_FORMAT, GAME_SESSION } from '@deenup/shared';

// Maximum allowed timeTakenMs: the hardest difficulty (advanced = 30s) + grace period
const MAX_TIME_TAKEN_MS = 30_000 + GAME_SESSION.ANSWER_TIMEOUT_GRACE_MS;

interface ValidationResult {
  success: boolean;
  errors: Array<{ field: string; message: string }>;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MATCH_TYPES = ['ranked', 'unranked'] as const;

function isValidUuid(value: unknown): boolean {
  return typeof value === 'string' && UUID_REGEX.test(value);
}

export function validateJoinQueue(input: unknown): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const body = input as Record<string, unknown>;

  if (!body || !MATCH_TYPES.includes(body['matchType'] as any)) {
    errors.push({
      field: 'matchType',
      message: `matchType must be one of: ${MATCH_TYPES.join(', ')}`,
    });
  }

  if (body['themeId'] !== undefined && !isValidUuid(body['themeId'])) {
    errors.push({ field: 'themeId', message: 'themeId must be a valid UUID' });
  }

  return { success: errors.length === 0, errors };
}

export function validateSubmitAnswer(input: unknown): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const body = input as Record<string, unknown>;

  if (!body) {
    errors.push({ field: 'body', message: 'Request body is required' });
    return { success: false, errors };
  }

  if (!isValidUuid(body['matchId'])) {
    errors.push({ field: 'matchId', message: 'matchId must be a valid UUID' });
  }

  const qOrder = body['questionOrder'];
  if (typeof qOrder !== 'number' || !Number.isInteger(qOrder) || qOrder < 0) {
    errors.push({ field: 'questionOrder', message: 'questionOrder must be a non-negative integer' });
  } else if (qOrder >= MATCH_FORMAT.QUESTIONS_PER_MATCH) {
    errors.push({
      field: 'questionOrder',
      message: `questionOrder must be less than ${MATCH_FORMAT.QUESTIONS_PER_MATCH}`,
    });
  }

  const answerIdx = body['selectedAnswerIndex'];
  if (answerIdx !== null) {
    if (typeof answerIdx !== 'number' || !Number.isInteger(answerIdx) || answerIdx < 0 || answerIdx > 3) {
      errors.push({ field: 'selectedAnswerIndex', message: 'selectedAnswerIndex must be 0-3 or null' });
    }
  }

  const timeTaken = body['timeTakenMs'];
  if (typeof timeTaken !== 'number' || timeTaken < 0) {
    errors.push({ field: 'timeTakenMs', message: 'timeTakenMs must be a non-negative number' });
  } else if (timeTaken > MAX_TIME_TAKEN_MS) {
    errors.push({
      field: 'timeTakenMs',
      message: `timeTakenMs must not exceed ${MAX_TIME_TAKEN_MS}ms (max difficulty time limit + grace period)`,
    });
  }

  return { success: errors.length === 0, errors };
}

export function validateMatchId(matchId: unknown): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  if (!isValidUuid(matchId)) {
    errors.push({ field: 'matchId', message: 'matchId must be a valid UUID' });
  }
  return { success: errors.length === 0, errors };
}

export function validateHistoryQuery(input: unknown): ValidationResult {
  const errors: ValidationResult['errors'] = [];
  const query = input as Record<string, unknown>;

  const page = parseInt(String(query['page'] ?? '1'), 10);
  if (isNaN(page) || page < 1) {
    errors.push({ field: 'page', message: 'page must be a positive integer' });
  }

  const pageSize = parseInt(String(query['pageSize'] ?? '10'), 10);
  if (isNaN(pageSize) || pageSize < 1 || pageSize > 100) {
    errors.push({ field: 'pageSize', message: 'pageSize must be between 1 and 100' });
  }

  return { success: errors.length === 0, errors };
}
