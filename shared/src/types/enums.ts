// shared/src/types/enums.ts

export type Difficulty = 'easy' | 'medium' | 'advanced';

export type QuestionStatus = 'draft' | 'in_review' | 'approved' | 'rejected';

export type MatchStatus = 'waiting' | 'in_progress' | 'completed' | 'abandoned';

export type MatchType = 'ranked' | 'unranked';

export type SourceType = 'quran' | 'hadith' | 'jurisprudence' | 'scholarly';

export type PointsTransactionType =
  | 'daily_play'
  | 'fast_answer'
  | 'match_win'
  | 'bonus_time'
  | 'double_points'
  | 'hint';

export type ModerationStatus = 'visible' | 'flagged' | 'hidden' | 'deleted';

export const ENUM_VALUES = {
  Difficulty: ['easy', 'medium', 'advanced'] as Difficulty[],
  QuestionStatus: ['draft', 'in_review', 'approved', 'rejected'] as QuestionStatus[],
  MatchStatus: ['waiting', 'in_progress', 'completed', 'abandoned'] as MatchStatus[],
  MatchType: ['ranked', 'unranked'] as MatchType[],
  SourceType: ['quran', 'hadith', 'jurisprudence', 'scholarly'] as SourceType[],
  PointsTransactionType: [
    'daily_play',
    'fast_answer',
    'match_win',
    'bonus_time',
    'double_points',
    'hint',
  ] as PointsTransactionType[],
  ModerationStatus: ['visible', 'flagged', 'hidden', 'deleted'] as ModerationStatus[],
} as const;
