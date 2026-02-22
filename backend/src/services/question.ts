// backend/src/services/question.ts
// Business logic for question CRUD, review workflow, and reporting.

import { supabaseAdmin } from '../db/supabase';
import {
  Question,
  QuestionSource,
  QuestionFilters,
  QuestionListResponse,
  CreateQuestionRequest,
  UpdateQuestionRequest,
  QuestionReport,
  QUESTION_DEFAULTS,
  REPORT_AUTO_FLAG_THRESHOLD,
} from '@deenup/shared';

// ── DB row types ────────────────────────────────────────────────────────────

interface DbOption {
  text: string;
  is_correct: boolean;
}

interface DbSource {
  id: string;
  question_id: string;
  type: string;
  reference: string;
  detail: string | null;
  created_at: string;
}

interface DbQuestion {
  id: string;
  text: string;
  theme: string;
  difficulty: string;
  type: string;
  options: DbOption[];
  explanation: string;
  status: string;
  language: string;
  created_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
  question_sources: DbSource[];
}

interface DbReport {
  id: string;
  question_id: string;
  reported_by: string;
  reason: string;
  description: string | null;
  resolved: boolean;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

// ── Mapper helpers ──────────────────────────────────────────────────────────

function mapDbSource(src: DbSource): QuestionSource {
  return {
    id: src.id,
    questionId: src.question_id,
    type: src.type as QuestionSource['type'],
    reference: src.reference,
    detail: src.detail,
    createdAt: src.created_at,
  };
}

function mapDbQuestion(row: DbQuestion): Question & { sources: QuestionSource[] } {
  return {
    id: row.id,
    text: row.text,
    theme: row.theme as Question['theme'],
    difficulty: row.difficulty as Question['difficulty'],
    type: row.type as Question['type'],
    options: (row.options ?? []).map((o: DbOption) => ({
      text: o.text,
      isCorrect: o.is_correct,
    })),
    explanation: row.explanation,
    status: row.status as Question['status'],
    language: row.language,
    createdBy: row.created_by,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewerNotes: row.reviewer_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sources: (row.question_sources ?? []).map(mapDbSource),
  };
}

function mapDbReport(row: DbReport): QuestionReport {
  return {
    id: row.id,
    questionId: row.question_id,
    reportedBy: row.reported_by,
    reason: row.reason as QuestionReport['reason'],
    description: row.description,
    resolved: row.resolved,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

// ── Question CRUD ───────────────────────────────────────────────────────────

export async function createQuestion(
  data: CreateQuestionRequest,
  userId: string,
): Promise<Question & { sources: QuestionSource[] }> {
  const dbOptions = data.options.map(o => ({ text: o.text, is_correct: o.isCorrect }));

  const { data: inserted, error } = await supabaseAdmin
    .from('questions')
    .insert({
      text: data.text,
      theme: data.theme,
      difficulty: data.difficulty,
      type: data.type,
      options: dbOptions,
      explanation: data.explanation,
      language: data.language ?? QUESTION_DEFAULTS.DEFAULT_LANGUAGE,
      status: 'draft',
      created_by: userId,
    })
    .select('*')
    .single();

  if (error || !inserted) {
    throw new Error(error?.message ?? 'Failed to create question');
  }

  const question = inserted as DbQuestion;

  // Insert sources
  const sourcesPayload = data.sources.map(s => ({
    question_id: question.id,
    type: s.type,
    reference: s.reference,
    detail: s.detail ?? null,
  }));

  const { data: insertedSources, error: srcError } = await supabaseAdmin
    .from('question_sources')
    .insert(sourcesPayload)
    .select('*');

  if (srcError) {
    throw new Error(srcError.message ?? 'Failed to insert question sources');
  }

  question.question_sources = (insertedSources as DbSource[]) ?? [];

  return mapDbQuestion(question);
}

export async function getQuestion(
  id: string,
  includeNonApproved: boolean,
): Promise<(Question & { sources: QuestionSource[] }) | null> {
  let query = supabaseAdmin
    .from('questions')
    .select('*, question_sources(*)')
    .eq('id', id);

  if (!includeNonApproved) {
    query = query.eq('status', 'approved');
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return null;
  }

  return mapDbQuestion(data as DbQuestion);
}

export async function listQuestions(
  filters: QuestionFilters,
  includeAllStatuses: boolean,
): Promise<QuestionListResponse> {
  const limit = Math.min(
    filters.limit ?? QUESTION_DEFAULTS.DEFAULT_PAGE_LIMIT,
    QUESTION_DEFAULTS.MAX_PAGE_LIMIT,
  );

  let query = supabaseAdmin
    .from('questions')
    .select('*, question_sources(*)', { count: 'exact' });

  if (!includeAllStatuses) {
    query = query.eq('status', 'approved');
  } else if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.theme) {
    query = query.eq('theme', filters.theme);
  }

  if (filters.difficulty) {
    query = query.eq('difficulty', filters.difficulty);
  }

  if (filters.language) {
    query = query.eq('language', filters.language);
  }

  if (filters.search) {
    query = query.ilike('text', `%${filters.search}%`);
  }

  // Cursor-based pagination: cursor is base64(JSON { createdAt, id })
  if (filters.cursor) {
    try {
      const decoded = JSON.parse(Buffer.from(filters.cursor, 'base64').toString('utf-8')) as {
        createdAt: string;
        id: string;
      };
      // Return rows after the cursor position
      query = query.lt('created_at', decoded.createdAt);
    } catch {
      // Invalid cursor — ignore and return from beginning
    }
  }

  query = query.order('created_at', { ascending: false }).limit(limit + 1);

  const { data, error, count } = await (query as unknown as Promise<{
    data: DbQuestion[] | null;
    error: { message: string } | null;
    count: number | null;
  }>);

  if (error) {
    throw new Error(error.message ?? 'Failed to list questions');
  }

  const rows = (data ?? []) as DbQuestion[];
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;

  let nextCursor: string | null = null;
  if (hasMore && pageRows.length > 0) {
    const last = pageRows[pageRows.length - 1];
    nextCursor = Buffer.from(
      JSON.stringify({ createdAt: last.created_at, id: last.id }),
    ).toString('base64');
  }

  return {
    data: pageRows.map(mapDbQuestion),
    nextCursor,
    total: count ?? 0,
  };
}

export async function updateQuestion(
  id: string,
  data: UpdateQuestionRequest,
): Promise<Question & { sources: QuestionSource[] }> {
  // First fetch current status
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('questions')
    .select('status')
    .eq('id', id)
    .single();

  if (fetchError || !current) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  const updatePayload: Record<string, unknown> = {};

  if (data.text !== undefined) updatePayload.text = data.text;
  if (data.theme !== undefined) updatePayload.theme = data.theme;
  if (data.difficulty !== undefined) updatePayload.difficulty = data.difficulty;
  if (data.type !== undefined) updatePayload.type = data.type;
  if (data.options !== undefined) {
    updatePayload.options = data.options.map(o => ({ text: o.text, is_correct: o.isCorrect }));
  }
  if (data.explanation !== undefined) updatePayload.explanation = data.explanation;
  if (data.language !== undefined) updatePayload.language = data.language;

  // If was 'approved', reset to 'draft'
  const currentRecord = current as { status: string };
  if (currentRecord.status === 'approved') {
    updatePayload.status = 'draft';
  }

  const { data: updated, error } = await supabaseAdmin
    .from('questions')
    .update(updatePayload)
    .eq('id', id)
    .select('*, question_sources(*)')
    .single();

  if (error || !updated) {
    throw new Error(error?.message ?? 'Failed to update question');
  }

  return mapDbQuestion(updated as DbQuestion);
}

export async function deleteQuestion(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('questions')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message ?? 'Failed to delete question');
  }
}

// ── Review workflow ─────────────────────────────────────────────────────────

export async function submitForReview(
  questionId: string,
  userId: string,
): Promise<Question & { sources: QuestionSource[] }> {
  const { data: question, error: fetchError } = await supabaseAdmin
    .from('questions')
    .select('*, question_sources(*)')
    .eq('id', questionId)
    .single();

  if (fetchError || !question) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  const q = question as DbQuestion;

  if (q.status !== 'draft') {
    throw new Error('INVALID_STATUS_TRANSITION');
  }

  if (q.created_by !== userId) {
    throw new Error('FORBIDDEN');
  }

  const { data: updated, error } = await supabaseAdmin
    .from('questions')
    .update({ status: 'pending_review' })
    .eq('id', questionId)
    .select('*, question_sources(*)')
    .single();

  if (error || !updated) {
    throw new Error(error?.message ?? 'Failed to submit for review');
  }

  return mapDbQuestion(updated as DbQuestion);
}

export async function approveQuestion(
  questionId: string,
  reviewerId: string,
): Promise<Question & { sources: QuestionSource[] }> {
  const { data: question, error: fetchError } = await supabaseAdmin
    .from('questions')
    .select('*, question_sources(*)')
    .eq('id', questionId)
    .single();

  if (fetchError || !question) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  const q = question as DbQuestion;

  if (q.status !== 'pending_review') {
    throw new Error('INVALID_STATUS_TRANSITION');
  }

  // Prevent self-review unless env flag allows it
  const allowSelfReview = process.env.ALLOW_SELF_REVIEW === 'true';
  if (!allowSelfReview && q.created_by === reviewerId) {
    throw new Error('SELF_REVIEW_FORBIDDEN');
  }

  const { data: updated, error } = await supabaseAdmin
    .from('questions')
    .update({
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', questionId)
    .select('*, question_sources(*)')
    .single();

  if (error || !updated) {
    throw new Error(error?.message ?? 'Failed to approve question');
  }

  return mapDbQuestion(updated as DbQuestion);
}

export async function rejectQuestion(
  questionId: string,
  reviewerId: string,
  notes: string,
): Promise<Question & { sources: QuestionSource[] }> {
  if (!notes || notes.trim() === '') {
    throw new Error('NOTES_REQUIRED');
  }

  const { data: question, error: fetchError } = await supabaseAdmin
    .from('questions')
    .select('*, question_sources(*)')
    .eq('id', questionId)
    .single();

  if (fetchError || !question) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  const q = question as DbQuestion;

  if (q.status !== 'pending_review') {
    throw new Error('INVALID_STATUS_TRANSITION');
  }

  const allowSelfReview = process.env.ALLOW_SELF_REVIEW === 'true';
  if (!allowSelfReview && q.created_by === reviewerId) {
    throw new Error('SELF_REVIEW_FORBIDDEN');
  }

  const { data: updated, error } = await supabaseAdmin
    .from('questions')
    .update({
      status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: notes,
    })
    .eq('id', questionId)
    .select('*, question_sources(*)')
    .single();

  if (error || !updated) {
    throw new Error(error?.message ?? 'Failed to reject question');
  }

  return mapDbQuestion(updated as DbQuestion);
}

export async function getReviewQueue(): Promise<(Question & { sources: QuestionSource[] })[]> {
  const { data, error } = await supabaseAdmin
    .from('questions')
    .select('*, question_sources(*)')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message ?? 'Failed to get review queue');
  }

  return ((data as DbQuestion[]) ?? []).map(mapDbQuestion);
}

// ── Reports ─────────────────────────────────────────────────────────────────

export async function reportQuestion(
  questionId: string,
  userId: string,
  reason: string,
  description?: string,
): Promise<QuestionReport> {
  // Verify question exists
  const { data: question, error: qError } = await supabaseAdmin
    .from('questions')
    .select('id, status')
    .eq('id', questionId)
    .single();

  if (qError || !question) {
    throw new Error('QUESTION_NOT_FOUND');
  }

  const { data: report, error: rError } = await supabaseAdmin
    .from('question_reports')
    .insert({
      question_id: questionId,
      reported_by: userId,
      reason,
      description: description ?? null,
      resolved: false,
    })
    .select('*')
    .single();

  if (rError || !report) {
    throw new Error(rError?.message ?? 'Failed to create report');
  }

  // Count unresolved reports for this question
  const { count, error: countError } = await supabaseAdmin
    .from('question_reports')
    .select('*', { count: 'exact', head: true })
    .eq('question_id', questionId)
    .eq('resolved', false);

  if (!countError && (count ?? 0) >= REPORT_AUTO_FLAG_THRESHOLD) {
    const q = question as { id: string; status: string };
    if (q.status === 'approved') {
      await supabaseAdmin
        .from('questions')
        .update({ status: 'pending_review' })
        .eq('id', questionId);
    }
  }

  return mapDbReport(report as DbReport);
}

export async function listReports(filters: {
  resolved?: boolean;
  questionId?: string;
}): Promise<QuestionReport[]> {
  let query = supabaseAdmin.from('question_reports').select('*');

  if (filters.resolved !== undefined) {
    query = query.eq('resolved', filters.resolved);
  }

  if (filters.questionId) {
    query = query.eq('question_id', filters.questionId);
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message ?? 'Failed to list reports');
  }

  return ((data as DbReport[]) ?? []).map(mapDbReport);
}

export async function resolveReport(
  reportId: string,
  userId: string,
): Promise<QuestionReport> {
  const { data: report, error: fetchError } = await supabaseAdmin
    .from('question_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (fetchError || !report) {
    throw new Error('REPORT_NOT_FOUND');
  }

  const r = report as DbReport;

  if (r.resolved) {
    throw new Error('ALREADY_RESOLVED');
  }

  const { data: updated, error } = await supabaseAdmin
    .from('question_reports')
    .update({
      resolved: true,
      resolved_by: userId,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', reportId)
    .select('*')
    .single();

  if (error || !updated) {
    throw new Error(error?.message ?? 'Failed to resolve report');
  }

  return mapDbReport(updated as DbReport);
}
