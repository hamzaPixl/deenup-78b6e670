// shared/src/__tests__/question-types.test.ts
import {
  QuestionOption,
  QuestionSource,
  Question,
  CreateQuestionRequest,
  QuestionReport,
  QuestionStatus,
  SourceType,
} from '../index';

import {
  THEMES,
  DIFFICULTIES,
  QUESTION_TYPES,
  QUESTION_STATUSES,
  SOURCE_TYPES,
  REPORT_REASONS,
  QUESTION_DEFAULTS,
  QUESTION_RATE_LIMITS,
  QUESTION_ERROR_CODES,
  REPORT_AUTO_FLAG_THRESHOLD,
} from '../index';

describe('Question Types', () => {
  it('should create a valid QuestionOption', () => {
    const option: QuestionOption = {
      text: 'Answer text',
      isCorrect: true,
    };
    expect(option.text).toBe('Answer text');
    expect(option.isCorrect).toBe(true);
  });

  it('should create a valid QuestionSource', () => {
    const source: QuestionSource = {
      id: 'uuid-src-1',
      questionId: 'uuid-q-1',
      type: 'quran',
      reference: 'Al-Baqarah:255',
      detail: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(source.type).toBe('quran');
    expect(source.reference).toBe('Al-Baqarah:255');
    expect(source.detail).toBeNull();
  });

  it('should create a valid Question', () => {
    const question: Question = {
      id: 'uuid-q-1',
      text: 'What is the first surah of the Quran?',
      theme: 'quran',
      difficulty: 'easy',
      type: 'qcm',
      options: [
        { text: 'Al-Fatiha', isCorrect: true },
        { text: 'Al-Baqarah', isCorrect: false },
        { text: 'Al-Ikhlas', isCorrect: false },
        { text: 'Al-Nas', isCorrect: false },
      ],
      explanation: 'Al-Fatiha is the opening chapter of the Quran and is recited in every prayer.',
      status: 'draft',
      language: 'fr',
      createdBy: 'uuid-user-1',
      reviewedBy: null,
      reviewedAt: null,
      reviewerNotes: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    expect(question.status).toBe('draft');
    expect(question.options).toHaveLength(4);
    expect(question.reviewedBy).toBeNull();
  });

  it('should create a valid CreateQuestionRequest', () => {
    const req: CreateQuestionRequest = {
      text: 'What is the first pillar of Islam?',
      theme: 'quran',
      difficulty: 'easy',
      type: 'qcm',
      options: [
        { text: 'Shahada', isCorrect: true },
        { text: 'Salat', isCorrect: false },
        { text: 'Zakat', isCorrect: false },
        { text: 'Hajj', isCorrect: false },
      ],
      explanation: 'The Shahada is the declaration of faith and the first pillar of Islam.',
      sources: [
        { type: 'quran', reference: 'Al-Baqarah:255' },
      ],
      language: 'fr',
    };
    expect(req.text).toBe('What is the first pillar of Islam?');
    expect(req.sources).toHaveLength(1);
    expect(req.language).toBe('fr');
  });

  it('should create a valid QuestionReport', () => {
    const report: QuestionReport = {
      id: 'uuid-report-1',
      questionId: 'uuid-q-1',
      reportedBy: 'uuid-user-1',
      reason: 'inaccurate',
      description: null,
      resolved: false,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: '2026-01-01T00:00:00Z',
    };
    expect(report.reason).toBe('inaccurate');
    expect(report.resolved).toBe(false);
    expect(report.resolvedBy).toBeNull();
  });

  it('should accept all valid Question statuses', () => {
    const statuses: QuestionStatus[] = ['draft', 'pending_review', 'approved', 'rejected'];
    statuses.forEach(status => {
      const q: Question = {
        id: 'uuid-q-1',
        text: 'Test question text here',
        theme: 'quran',
        difficulty: 'easy',
        type: 'qcm',
        options: [],
        explanation: 'Explanation text that is long enough',
        status,
        language: 'fr',
        createdBy: 'uuid-user-1',
        reviewedBy: null,
        reviewedAt: null,
        reviewerNotes: null,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      };
      expect(q.status).toBe(status);
    });
  });

  it('should accept all valid QuestionSource types', () => {
    const types: SourceType[] = ['quran', 'hadith', 'fiqh'];
    types.forEach(type => {
      const source: QuestionSource = {
        id: 'uuid-src-1',
        questionId: 'uuid-q-1',
        type,
        reference: 'some:reference',
        detail: null,
        createdAt: '2026-01-01T00:00:00Z',
      };
      expect(source.type).toBe(type);
    });
  });
});

describe('Question Constants', () => {
  it('should contain all 8 themes', () => {
    expect(THEMES).toContain('quran');
    expect(THEMES).toContain('jurisprudence');
    expect(THEMES).toContain('prophets');
    expect(THEMES).toContain('prophet_muhammad');
    expect(THEMES).toContain('islamic_history');
    expect(THEMES).toContain('companions');
    expect(THEMES).toContain('islamic_texts');
    expect(THEMES).toContain('general_culture');
    expect(THEMES).toHaveLength(8);
  });

  it('should contain all difficulties', () => {
    expect(DIFFICULTIES).toEqual(['easy', 'medium', 'advanced']);
  });

  it('should contain all question types', () => {
    expect(QUESTION_TYPES).toEqual(['qcm', 'true_false']);
  });

  it('should contain all question statuses', () => {
    expect(QUESTION_STATUSES).toEqual(['draft', 'pending_review', 'approved', 'rejected']);
  });

  it('should contain all source types', () => {
    expect(SOURCE_TYPES).toEqual(['quran', 'hadith', 'fiqh']);
  });

  it('should contain all report reasons', () => {
    expect(REPORT_REASONS).toContain('inaccurate');
    expect(REPORT_REASONS).toContain('offensive');
    expect(REPORT_REASONS).toContain('duplicate');
    expect(REPORT_REASONS).toContain('wrong_source');
    expect(REPORT_REASONS).toContain('other');
  });

  it('should have correct QUESTION_DEFAULTS', () => {
    expect(QUESTION_DEFAULTS.MIN_TEXT_LENGTH).toBe(10);
    expect(QUESTION_DEFAULTS.MAX_TEXT_LENGTH).toBe(2000);
    expect(QUESTION_DEFAULTS.MIN_EXPLANATION_LENGTH).toBe(20);
    expect(QUESTION_DEFAULTS.MAX_EXPLANATION_LENGTH).toBe(5000);
    expect(QUESTION_DEFAULTS.QCM_OPTION_COUNT).toBe(4);
    expect(QUESTION_DEFAULTS.TRUE_FALSE_OPTION_COUNT).toBe(2);
    expect(QUESTION_DEFAULTS.DEFAULT_LANGUAGE).toBe('fr');
    expect(QUESTION_DEFAULTS.DEFAULT_PAGE_LIMIT).toBe(20);
    expect(QUESTION_DEFAULTS.MAX_PAGE_LIMIT).toBe(100);
  });

  it('should have correct QUESTION_RATE_LIMITS', () => {
    expect(QUESTION_RATE_LIMITS.CREATE.maxRequests).toBe(30);
    expect(QUESTION_RATE_LIMITS.CREATE.windowMs).toBe(3_600_000);
  });

  it('should have all QUESTION_ERROR_CODES', () => {
    expect(QUESTION_ERROR_CODES).toHaveProperty('SOURCE_REQUIRED');
    expect(QUESTION_ERROR_CODES).toHaveProperty('INVALID_OPTION_COUNT');
    expect(QUESTION_ERROR_CODES).toHaveProperty('INVALID_CORRECT_COUNT');
    expect(QUESTION_ERROR_CODES).toHaveProperty('SELF_REVIEW_FORBIDDEN');
    expect(QUESTION_ERROR_CODES).toHaveProperty('INVALID_STATUS_TRANSITION');
    expect(QUESTION_ERROR_CODES).toHaveProperty('QUESTION_NOT_FOUND');
    expect(QUESTION_ERROR_CODES).toHaveProperty('REPORT_THRESHOLD_REACHED');
  });

  it('should have correct REPORT_AUTO_FLAG_THRESHOLD', () => {
    expect(REPORT_AUTO_FLAG_THRESHOLD).toBe(3);
  });
});
