// Question domain type aliases
export type QuestionStatus = 'draft' | 'pending_review' | 'approved' | 'rejected';
export type QuestionDifficulty = 'easy' | 'medium' | 'advanced';
export type QuestionTheme =
  | 'quran'
  | 'jurisprudence'
  | 'prophets'
  | 'prophet_muhammad'
  | 'islamic_history'
  | 'companions'
  | 'islamic_texts'
  | 'general_culture';
export type QuestionType = 'qcm' | 'true_false';
export type SourceType = 'quran' | 'hadith' | 'fiqh';
export type ReportReason = 'inaccurate' | 'offensive' | 'duplicate' | 'wrong_source' | 'other';

// Core question option shape
export interface QuestionOption {
  text: string;
  isCorrect: boolean;
}

// A source citation attached to a question
export interface QuestionSource {
  id: string;
  questionId: string;
  type: SourceType;
  reference: string;
  detail: string | null;
  createdAt: string;
}

// Full question record as stored in the database
export interface Question {
  id: string;
  text: string;
  theme: QuestionTheme;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  options: QuestionOption[];
  explanation: string;
  status: QuestionStatus;
  language: string;
  createdBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewerNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

// Minimal source input used in creation requests
export interface CreateSourceInput {
  type: SourceType;
  reference: string;
  detail?: string;
}

// Request body for creating a new question
export interface CreateQuestionRequest {
  text: string;
  theme: QuestionTheme;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  options: QuestionOption[];
  explanation: string;
  sources: CreateSourceInput[];
  language?: string;
}

// Request body for updating an existing question (all fields optional)
export type UpdateQuestionRequest = Partial<CreateQuestionRequest>;

// Filters for listing questions
export interface QuestionFilters {
  theme?: QuestionTheme;
  difficulty?: QuestionDifficulty;
  status?: QuestionStatus;
  search?: string;
  language?: string;
  limit?: number;
  cursor?: string;
}

// Paginated list response
export interface QuestionListResponse {
  data: Question[];
  nextCursor: string | null;
  total: number;
}

// Payload for approve/reject review actions
export interface ReviewAction {
  action: 'approve' | 'reject';
  notes?: string;
}

// Report on a question
export interface QuestionReport {
  id: string;
  questionId: string;
  reportedBy: string;
  reason: ReportReason;
  description: string | null;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}
