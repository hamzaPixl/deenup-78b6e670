// backend/src/middleware/validate.ts
// Validates CreateQuestionRequest and UpdateQuestionRequest bodies.

import { Request, Response, NextFunction } from 'express';
import {
  THEMES,
  DIFFICULTIES,
  QUESTION_TYPES,
  SOURCE_TYPES,
  QUESTION_DEFAULTS,
  QUESTION_ERROR_CODES,
} from '@deenup/shared';
import { QuestionOption, CreateSourceInput } from '@deenup/shared';

interface ValidationError {
  code: string;
  message: string;
}

function fail(res: Response, error: ValidationError): void {
  res.status(400).json({ error });
}

function validateOptions(
  type: string,
  options: QuestionOption[],
): ValidationError | null {
  const expectedCount =
    type === 'qcm'
      ? QUESTION_DEFAULTS.QCM_OPTION_COUNT
      : QUESTION_DEFAULTS.TRUE_FALSE_OPTION_COUNT;

  if (options.length !== expectedCount) {
    return {
      code: QUESTION_ERROR_CODES.INVALID_OPTION_COUNT,
      message: `${type} questions must have exactly ${expectedCount} options, got ${options.length}`,
    };
  }

  for (const opt of options) {
    if (!opt.text || opt.text.trim() === '') {
      return { code: 'VALIDATION_ERROR', message: 'Each option must have non-empty text' };
    }
  }

  const correctCount = options.filter(o => o.isCorrect).length;
  if (correctCount !== 1) {
    return {
      code: QUESTION_ERROR_CODES.INVALID_CORRECT_COUNT,
      message: `Exactly 1 correct answer is required, got ${correctCount}`,
    };
  }

  return null;
}

function validateSources(sources: CreateSourceInput[]): ValidationError | null {
  if (!sources || sources.length === 0) {
    return {
      code: QUESTION_ERROR_CODES.SOURCE_REQUIRED,
      message: 'At least one source citation is required',
    };
  }

  for (const src of sources) {
    if (!(SOURCE_TYPES as readonly string[]).includes(src.type)) {
      return {
        code: 'VALIDATION_ERROR',
        message: `Invalid source type "${src.type}". Must be one of: ${SOURCE_TYPES.join(', ')}`,
      };
    }
    if (!src.reference || src.reference.trim() === '') {
      return { code: 'VALIDATION_ERROR', message: 'Source reference must not be empty' };
    }
  }

  return null;
}

function validateQuestionFields(
  body: Record<string, unknown>,
  partial: boolean,
  res: Response,
): boolean {
  const { text, theme, difficulty, type, options, explanation, sources } = body as {
    text?: string;
    theme?: string;
    difficulty?: string;
    type?: string;
    options?: QuestionOption[];
    explanation?: string;
    sources?: CreateSourceInput[];
  };

  // text
  if (!partial || text !== undefined) {
    if (!text) {
      fail(res, { code: 'VALIDATION_ERROR', message: 'text is required' });
      return false;
    }
    if (text.length < QUESTION_DEFAULTS.MIN_TEXT_LENGTH) {
      fail(res, {
        code: 'VALIDATION_ERROR',
        message: `text must be at least ${QUESTION_DEFAULTS.MIN_TEXT_LENGTH} characters`,
      });
      return false;
    }
    if (text.length > QUESTION_DEFAULTS.MAX_TEXT_LENGTH) {
      fail(res, {
        code: 'VALIDATION_ERROR',
        message: `text must be at most ${QUESTION_DEFAULTS.MAX_TEXT_LENGTH} characters`,
      });
      return false;
    }
  }

  // theme
  if (!partial || theme !== undefined) {
    if (!theme || !(THEMES as readonly string[]).includes(theme)) {
      fail(res, {
        code: 'VALIDATION_ERROR',
        message: `Invalid theme "${theme}". Must be one of: ${THEMES.join(', ')}`,
      });
      return false;
    }
  }

  // difficulty
  if (!partial || difficulty !== undefined) {
    if (!difficulty || !(DIFFICULTIES as readonly string[]).includes(difficulty)) {
      fail(res, {
        code: 'VALIDATION_ERROR',
        message: `Invalid difficulty "${difficulty}". Must be one of: ${DIFFICULTIES.join(', ')}`,
      });
      return false;
    }
  }

  // type
  if (!partial || type !== undefined) {
    if (!type || !(QUESTION_TYPES as readonly string[]).includes(type)) {
      fail(res, {
        code: 'VALIDATION_ERROR',
        message: `Invalid type "${type}". Must be one of: ${QUESTION_TYPES.join(', ')}`,
      });
      return false;
    }
  }

  // options (validate when type and options are both present)
  if (type !== undefined && options !== undefined) {
    const optError = validateOptions(type, options);
    if (optError) {
      fail(res, optError);
      return false;
    }
  } else if (!partial && options !== undefined) {
    // type must have been provided and passed validation already
    const resolvedType = (type as string) ?? '';
    const optError = validateOptions(resolvedType, options);
    if (optError) {
      fail(res, optError);
      return false;
    }
  }

  // explanation
  if (!partial || explanation !== undefined) {
    if (!explanation) {
      fail(res, { code: 'VALIDATION_ERROR', message: 'explanation is required' });
      return false;
    }
    if (explanation.length < QUESTION_DEFAULTS.MIN_EXPLANATION_LENGTH) {
      fail(res, {
        code: 'VALIDATION_ERROR',
        message: `explanation must be at least ${QUESTION_DEFAULTS.MIN_EXPLANATION_LENGTH} characters`,
      });
      return false;
    }
    if (explanation.length > QUESTION_DEFAULTS.MAX_EXPLANATION_LENGTH) {
      fail(res, {
        code: 'VALIDATION_ERROR',
        message: `explanation must be at most ${QUESTION_DEFAULTS.MAX_EXPLANATION_LENGTH} characters`,
      });
      return false;
    }
  }

  // sources
  if (!partial || sources !== undefined) {
    const srcError = validateSources((sources ?? []) as CreateSourceInput[]);
    if (srcError) {
      fail(res, srcError);
      return false;
    }
  }

  return true;
}

/**
 * Validates the full CreateQuestionRequest body. Returns 400 on failure.
 */
export function validateCreateQuestion(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (validateQuestionFields(req.body as Record<string, unknown>, false, res)) {
    next();
  }
}

/**
 * Validates a partial UpdateQuestionRequest body. Only validates fields present
 * in the body. Returns 400 on failure.
 */
export function validateUpdateQuestion(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (validateQuestionFields(req.body as Record<string, unknown>, true, res)) {
    next();
  }
}
