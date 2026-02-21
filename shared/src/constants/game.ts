// shared/src/constants/game.ts

export const SCORING = {
  BASE_POINTS: {
    easy: 100,
    medium: 200,
    advanced: 400,
  },
} as const;

// TIME_LIMITS — time allowed per question, in SECONDS.
// Use TIME_LIMITS_MS for calculations involving time_taken_ms (DB column).
export const TIME_LIMITS = {
  easy: 15,     // seconds
  medium: 20,   // seconds
  advanced: 30, // seconds
} as const;

// TIME_LIMITS_MS — same limits expressed in MILLISECONDS for scoring formula:
//   score = BASE_POINTS[difficulty] * (time_remaining_ms / TIME_LIMITS_MS[difficulty])
export const TIME_LIMITS_MS = {
  easy: 15_000,
  medium: 20_000,
  advanced: 30_000,
} as const;

export const MATCH_FORMAT = {
  QUESTIONS_PER_MATCH: 15,
} as const;

export const DEEN_POINTS = {
  STARTING_BALANCE: 50,
  DAILY_PLAY_REWARD: 10,
  FAST_ANSWER_REWARD: 5,
  MATCH_WIN_REWARD: 20,
} as const;

export const POWERUP_COSTS = {
  bonus_time: 10,
  double_points: 10,
  hint: 10,
  bonus_time_seconds: 5,
} as const;

// Hardcoded UUIDs for themes — synchronized with SQL seed data
export const THEMES = {
  QURAN: {
    id: 'a1b2c3d4-0001-0001-0001-000000000001',
    slug: 'quran',
    name_fr: 'Coran',
    is_mvp: true,
  },
  JURISPRUDENCE: {
    id: 'a1b2c3d4-0001-0001-0001-000000000002',
    slug: 'jurisprudence',
    name_fr: 'Jurisprudence',
    is_mvp: false,
  },
  PROPHETS: {
    id: 'a1b2c3d4-0001-0001-0001-000000000003',
    slug: 'prophets',
    name_fr: 'Prophètes',
    is_mvp: true,
  },
  MUHAMMAD: {
    id: 'a1b2c3d4-0001-0001-0001-000000000004',
    slug: 'muhammad',
    name_fr: 'Prophète Muhammad ﷺ',
    is_mvp: true,
  },
  HISTORY: {
    id: 'a1b2c3d4-0001-0001-0001-000000000005',
    slug: 'history',
    name_fr: 'Histoire islamique',
    is_mvp: false,
  },
  COMPANIONS: {
    id: 'a1b2c3d4-0001-0001-0001-000000000006',
    slug: 'companions',
    name_fr: 'Compagnons du Prophète',
    is_mvp: false,
  },
  TEXTS: {
    id: 'a1b2c3d4-0001-0001-0001-000000000007',
    slug: 'texts',
    name_fr: 'Textes islamiques',
    is_mvp: false,
  },
  GENERAL: {
    id: 'a1b2c3d4-0001-0001-0001-000000000008',
    slug: 'general',
    name_fr: 'Culture générale islamique',
    is_mvp: false,
  },
} as const;

// Hardcoded UUIDs for salons — synchronized with SQL seed data
export const SALONS = {
  QURAN: {
    id: 'b2c3d4e5-0002-0002-0002-000000000001',
    slug: 'quran',
    name_fr: 'Coran',
    emoji: '📖',
    description: 'Discussions autour des sourates, de la tafsir et de la récitation.',
  },
  PROPHETS: {
    id: 'b2c3d4e5-0002-0002-0002-000000000002',
    slug: 'prophets',
    name_fr: 'Prophètes',
    emoji: '🕌',
    description: 'Histoires et enseignements des prophètes.',
  },
  GENERAL: {
    id: 'b2c3d4e5-0002-0002-0002-000000000003',
    slug: 'general',
    name_fr: 'Général',
    emoji: '⭐',
    description: 'Discussions ouvertes sur l\'islam et la vie musulmane.',
  },
  COMPETITION: {
    id: 'b2c3d4e5-0002-0002-0002-000000000004',
    slug: 'competition',
    name_fr: 'Compétition',
    emoji: '🏆',
    description: 'Stratégies de jeu, classements et défis.',
  },
} as const;
