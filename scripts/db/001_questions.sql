-- Migration: 001_questions.sql
-- Description: Creates questions, question_sources, and question_reports tables
-- with RLS policies, indexes, and an updated_at trigger.
-- Idempotent: safe to run multiple times.

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: updated_at trigger function (create once, reuse)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: questions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text            text NOT NULL CHECK (char_length(text) >= 10),
  theme           text NOT NULL CHECK (theme IN (
                    'quran', 'jurisprudence', 'prophets', 'prophet_muhammad',
                    'islamic_history', 'companions', 'islamic_texts', 'general_culture'
                  )),
  difficulty      text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'advanced')),
  type            text NOT NULL CHECK (type IN ('qcm', 'true_false')),
  options         jsonb NOT NULL DEFAULT '[]',
  explanation     text NOT NULL CHECK (char_length(explanation) >= 20),
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'pending_review', 'approved', 'rejected')),
  language        text NOT NULL DEFAULT 'fr',
  created_by      uuid NOT NULL REFERENCES auth.users(id),
  reviewed_by     uuid REFERENCES auth.users(id),
  reviewed_at     timestamptz,
  reviewer_notes  text,
  created_at      timestamptz NOT NULL DEFAULT NOW(),
  updated_at      timestamptz NOT NULL DEFAULT NOW()
);

-- updated_at auto-trigger for questions
DROP TRIGGER IF EXISTS questions_updated_at ON questions;
CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: question_sources
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question_sources (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('quran', 'hadith', 'fiqh')),
  reference   text NOT NULL,
  detail      text,
  created_at  timestamptz NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: question_reports
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS question_reports (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  reported_by  uuid NOT NULL REFERENCES auth.users(id),
  reason       text NOT NULL CHECK (reason IN (
                 'inaccurate', 'offensive', 'duplicate', 'wrong_source', 'other'
               )),
  description  text,
  resolved     boolean NOT NULL DEFAULT false,
  resolved_by  uuid REFERENCES auth.users(id),
  resolved_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_questions_theme       ON questions(theme);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty  ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_status      ON questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_created_by  ON questions(created_by);
CREATE INDEX IF NOT EXISTS idx_questions_language    ON questions(language);

CREATE INDEX IF NOT EXISTS idx_question_sources_question_id ON question_sources(question_id);

CREATE INDEX IF NOT EXISTS idx_question_reports_question_id ON question_reports(question_id);
CREATE INDEX IF NOT EXISTS idx_question_reports_resolved    ON question_reports(resolved);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE questions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_reports ENABLE ROW LEVEL SECURITY;

-- Helper: check role from JWT app_metadata (admin or moderator)
-- Usage: (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')

-- ── questions ──────────────────────────────────────────────────────────────

-- Public: read approved questions
DROP POLICY IF EXISTS questions_select_approved ON questions;
CREATE POLICY questions_select_approved ON questions
  FOR SELECT
  USING (
    status = 'approved'
    OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

-- Admin/moderator: insert questions
DROP POLICY IF EXISTS questions_insert_staff ON questions;
CREATE POLICY questions_insert_staff ON questions
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

-- Admin/moderator: update questions
DROP POLICY IF EXISTS questions_update_staff ON questions;
CREATE POLICY questions_update_staff ON questions
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

-- Admin only: delete questions
DROP POLICY IF EXISTS questions_delete_admin ON questions;
CREATE POLICY questions_delete_admin ON questions
  FOR DELETE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- ── question_sources ───────────────────────────────────────────────────────

-- Sources inherit question visibility
DROP POLICY IF EXISTS question_sources_select ON question_sources;
CREATE POLICY question_sources_select ON question_sources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM questions q
      WHERE q.id = question_sources.question_id
        AND (
          q.status = 'approved'
          OR (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
        )
    )
  );

DROP POLICY IF EXISTS question_sources_insert_staff ON question_sources;
CREATE POLICY question_sources_insert_staff ON question_sources
  FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS question_sources_update_staff ON question_sources;
CREATE POLICY question_sources_update_staff ON question_sources
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS question_sources_delete_staff ON question_sources;
CREATE POLICY question_sources_delete_staff ON question_sources
  FOR DELETE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

-- ── question_reports ───────────────────────────────────────────────────────

-- Any authenticated user can report a question
DROP POLICY IF EXISTS question_reports_insert_auth ON question_reports;
CREATE POLICY question_reports_insert_auth ON question_reports
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admin/moderator can read and update reports
DROP POLICY IF EXISTS question_reports_select_staff ON question_reports;
CREATE POLICY question_reports_select_staff ON question_reports
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );

DROP POLICY IF EXISTS question_reports_update_staff ON question_reports;
CREATE POLICY question_reports_update_staff ON question_reports
  FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('admin', 'moderator')
  );
