// Question domain constants — follow the same pattern as auth.ts (use `as const`)

export const THEMES = [
  'quran',
  'jurisprudence',
  'prophets',
  'prophet_muhammad',
  'islamic_history',
  'companions',
  'islamic_texts',
  'general_culture',
] as const;

export const DIFFICULTIES = ['easy', 'medium', 'advanced'] as const;

export const QUESTION_TYPES = ['qcm', 'true_false'] as const;

export const QUESTION_STATUSES = [
  'draft',
  'pending_review',
  'approved',
  'rejected',
] as const;

export const SOURCE_TYPES = ['quran', 'hadith', 'fiqh'] as const;

export const REPORT_REASONS = [
  'inaccurate',
  'offensive',
  'duplicate',
  'wrong_source',
  'other',
] as const;

export const QUESTION_DEFAULTS = {
  MIN_TEXT_LENGTH: 10,
  MAX_TEXT_LENGTH: 2000,
  MIN_EXPLANATION_LENGTH: 20,
  MAX_EXPLANATION_LENGTH: 5000,
  QCM_OPTION_COUNT: 4,
  TRUE_FALSE_OPTION_COUNT: 2,
  DEFAULT_LANGUAGE: 'fr',
  DEFAULT_PAGE_LIMIT: 20,
  MAX_PAGE_LIMIT: 100,
} as const;

export const QUESTION_RATE_LIMITS = {
  CREATE: { windowMs: 3_600_000, maxRequests: 30 },
} as const;

export const QUESTION_ERROR_CODES = {
  SOURCE_REQUIRED: 'SOURCE_REQUIRED',
  INVALID_OPTION_COUNT: 'INVALID_OPTION_COUNT',
  INVALID_CORRECT_COUNT: 'INVALID_CORRECT_COUNT',
  SELF_REVIEW_FORBIDDEN: 'SELF_REVIEW_FORBIDDEN',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  QUESTION_NOT_FOUND: 'QUESTION_NOT_FOUND',
  REPORT_THRESHOLD_REACHED: 'REPORT_THRESHOLD_REACHED',
} as const;

export const REPORT_AUTO_FLAG_THRESHOLD = 3;
