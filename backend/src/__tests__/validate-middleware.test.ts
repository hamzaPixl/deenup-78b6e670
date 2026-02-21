// backend/src/__tests__/validate-middleware.test.ts
import { Request, Response, NextFunction } from 'express';
import { validateCreateQuestion, validateUpdateQuestion } from '../middleware/validate';
import { QUESTION_ERROR_CODES } from '@deenup/shared';

const next = jest.fn() as NextFunction;

function makeReqRes(body: unknown): { req: Request; res: Response; statusMock: jest.Mock; jsonMock: jest.Mock } {
  const req = { body } as Request;
  const jsonMock = jest.fn();
  const statusMock = jest.fn().mockReturnValue({ json: jsonMock });
  const res = { status: statusMock, json: jsonMock } as unknown as Response;
  return { req, res, statusMock, jsonMock };
}

const validQCM = {
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
  explanation: 'Al-Fatiha is the opening chapter of the Quran, recited in every prayer.',
  sources: [{ type: 'quran', reference: 'Al-Fatiha:1-7' }],
};

const validTrueFalse = {
  text: 'The Quran has 114 surahs.',
  theme: 'quran',
  difficulty: 'easy',
  type: 'true_false',
  options: [
    { text: 'Vrai', isCorrect: true },
    { text: 'Faux', isCorrect: false },
  ],
  explanation: 'The Quran contains exactly 114 surahs organized by length.',
  sources: [{ type: 'quran', reference: 'General knowledge' }],
};

beforeEach(() => jest.clearAllMocks());

describe('validateCreateQuestion', () => {
  it('should pass a valid QCM request', () => {
    const { req, res } = makeReqRes(validQCM);
    validateCreateQuestion(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should pass a valid True/False request', () => {
    const { req, res } = makeReqRes(validTrueFalse);
    validateCreateQuestion(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject when text is missing', () => {
    const { text: _t, ...body } = validQCM;
    const { req, res, statusMock } = makeReqRes(body);
    validateCreateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('should reject when text is too short', () => {
    const { req, res, statusMock } = makeReqRes({ ...validQCM, text: 'Short' });
    validateCreateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it('should reject when text is too long', () => {
    const { req, res, statusMock } = makeReqRes({ ...validQCM, text: 'x'.repeat(2001) });
    validateCreateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it('should reject invalid theme', () => {
    const { req, res, statusMock } = makeReqRes({ ...validQCM, theme: 'invalid_theme' });
    validateCreateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it('should reject invalid difficulty', () => {
    const { req, res, statusMock } = makeReqRes({ ...validQCM, difficulty: 'extreme' });
    validateCreateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it('should reject invalid type', () => {
    const { req, res, statusMock } = makeReqRes({ ...validQCM, type: 'multiple_choice' });
    validateCreateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it('should reject QCM with 3 options (INVALID_OPTION_COUNT)', () => {
    const { req, res, statusMock, jsonMock } = makeReqRes({
      ...validQCM,
      options: validQCM.options.slice(0, 3),
    });
    validateCreateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: QUESTION_ERROR_CODES.INVALID_OPTION_COUNT }) }),
    );
  });

  it('should reject QCM with 5 options', () => {
    const { req, res, statusMock } = makeReqRes({
      ...validQCM,
      options: [...validQCM.options, { text: 'Extra', isCorrect: false }],
    });
    validateCreateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it('should reject QCM with 0 correct answers (INVALID_CORRECT_COUNT)', () => {
    const { req, res, statusMock, jsonMock } = makeReqRes({
      ...validQCM,
      options: validQCM.options.map(o => ({ ...o, isCorrect: false })),
    });
    validateCreateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: QUESTION_ERROR_CODES.INVALID_CORRECT_COUNT }) }),
    );
  });

  it('should reject QCM with 2 correct answers', () => {
    const { req, res, statusMock } = makeReqRes({
      ...validQCM,
      options: validQCM.options.map((o, i) => ({ ...o, isCorrect: i < 2 })),
    });
    validateCreateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it('should reject True/False with 4 options', () => {
    const { req, res, statusMock } = makeReqRes({
      ...validTrueFalse,
      options: validQCM.options,
    });
    validateCreateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it('should reject empty sources array (SOURCE_REQUIRED)', () => {
    const { req, res, statusMock, jsonMock } = makeReqRes({ ...validQCM, sources: [] });
    validateCreateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: QUESTION_ERROR_CODES.SOURCE_REQUIRED }) }),
    );
  });

  it('should reject source with invalid type', () => {
    const { req, res, statusMock } = makeReqRes({
      ...validQCM,
      sources: [{ type: 'bible', reference: 'Matthew:1' }],
    });
    validateCreateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it('should reject explanation too short', () => {
    const { req, res, statusMock } = makeReqRes({
      ...validQCM,
      explanation: 'Too short.',
    });
    validateCreateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it('should reject explanation too long', () => {
    const { req, res, statusMock } = makeReqRes({
      ...validQCM,
      explanation: 'x'.repeat(5001),
    });
    validateCreateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
  });

  it('should reject option with empty text', () => {
    const { req, res, statusMock } = makeReqRes({
      ...validQCM,
      options: [
        { text: '', isCorrect: true },
        { text: 'B', isCorrect: false },
        { text: 'C', isCorrect: false },
        { text: 'D', isCorrect: false },
      ],
    });
    validateCreateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
  });
});

describe('validateUpdateQuestion', () => {
  it('should pass with only partial fields', () => {
    const { req, res } = makeReqRes({ text: 'Updated question text here' });
    validateUpdateQuestion(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('should reject invalid theme when theme is present', () => {
    const { req, res, statusMock } = makeReqRes({ theme: 'bad_theme' });
    validateUpdateQuestion(req, res, next);
    expect(statusMock).toHaveBeenCalledWith(400);
  });
});
