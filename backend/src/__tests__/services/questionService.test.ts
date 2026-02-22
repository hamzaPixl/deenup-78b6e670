// backend/src/__tests__/services/questionService.test.ts
import { QuestionService } from '../../services/questionService';

// ---------------------------------------------------------------------------
// Supabase mock setup (follows authService.test.ts pattern)
// ---------------------------------------------------------------------------
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockIn = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();

const mockSupabase = {
  from: mockFrom,
};

// Chain builder helper
function buildChain(finalResult: unknown) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(finalResult),
  };
  // Make the chain itself awaitable (for cases without .single())
  Object.assign(chain, Promise.resolve(finalResult));
  return chain;
}

const mockQuestion = {
  id: 'q-uuid-1',
  theme_id: 'theme-uuid-1',
  difficulty: 'easy',
  question_fr: 'Quelle est la première sourate du Coran ?',
  answers: ['Al-Fatiha', 'Al-Baqara', 'Al-Ikhlas', 'Al-Nas'],
  correct_answer_index: 0,
  explanation_fr: 'Al-Fatiha est la première sourate.',
  status: 'approved',
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('QuestionService', () => {
  let service: QuestionService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new QuestionService(mockSupabase as any);
  });

  describe('getQuestionsForMatch', () => {
    it('should return 15 questions (5 easy, 5 medium, 5 advanced) for a theme', async () => {
      // Mock returns 5 questions per difficulty call
      const easyQuestions = Array(5).fill({ ...mockQuestion, difficulty: 'easy' });
      const mediumQuestions = Array(5).fill({ ...mockQuestion, difficulty: 'medium' });
      const advancedQuestions = Array(5).fill({ ...mockQuestion, difficulty: 'advanced' });

      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation((_n: number) => {
          // Return appropriate difficulty questions based on call order
          return Promise.resolve({ data: easyQuestions, error: null });
        }),
      }));

      // We need to make the mock smarter — track call count
      let callCount = 0;
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockImplementation(() => {
          const sets = [easyQuestions, mediumQuestions, advancedQuestions];
          const result = { data: sets[callCount % 3] ?? easyQuestions, error: null };
          callCount++;
          return Promise.resolve(result);
        }),
      }));

      const questions = await service.getQuestionsForMatch('theme-uuid-1');
      expect(questions).toHaveLength(15);
    });

    it('should throw QUESTION_NOT_FOUND if not enough questions exist', async () => {
      // Only 2 questions for each difficulty
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: [mockQuestion, mockQuestion],
          error: null,
        }),
      }));

      await expect(service.getQuestionsForMatch('theme-uuid-1')).rejects.toMatchObject({
        code: 'QUESTION_NOT_FOUND',
      });
    });

    it('should throw INTERNAL_ERROR on database error', async () => {
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'DB connection error' },
        }),
      }));

      await expect(service.getQuestionsForMatch('theme-uuid-1')).rejects.toMatchObject({
        code: 'INTERNAL_ERROR',
      });
    });
  });

  describe('getQuestionById', () => {
    it('should return a question by id', async () => {
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockQuestion, error: null }),
      }));

      const question = await service.getQuestionById('q-uuid-1');
      expect(question.id).toBe('q-uuid-1');
    });

    it('should throw QUESTION_NOT_FOUND when question does not exist', async () => {
      mockFrom.mockImplementation(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      }));

      await expect(service.getQuestionById('nonexistent')).rejects.toMatchObject({
        code: 'QUESTION_NOT_FOUND',
      });
    });
  });
});
