-- Migration 003: Create questions and question_sources tables
-- Depends on: 001_create_profiles.sql, 002_create_themes.sql

CREATE TABLE IF NOT EXISTS questions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id              UUID NOT NULL REFERENCES themes(id) ON DELETE RESTRICT,
  difficulty            TEXT NOT NULL
                          CHECK (difficulty IN ('easy', 'medium', 'advanced')),
  question_fr           TEXT NOT NULL
                          CHECK (char_length(question_fr) > 0),
  answers               JSONB NOT NULL,  -- Array of exactly 4 strings
  correct_answer_index  INTEGER NOT NULL
                          CHECK (correct_answer_index BETWEEN 0 AND 3),
  explanation_fr        TEXT NOT NULL
                          CHECK (char_length(explanation_fr) > 0),
  status                TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'in_review', 'approved', 'rejected')),
  created_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_by           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-update updated_at
CREATE TRIGGER trg_questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Indexes
CREATE INDEX idx_questions_theme_difficulty ON questions(theme_id, difficulty);
CREATE INDEX idx_questions_status ON questions(status);

-- Row Level Security
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

-- Approved questions are public (used during matches)
CREATE POLICY "questions_select_approved"
  ON questions FOR SELECT
  USING (status = 'approved');

-- Authenticated users can insert questions (for question creation workflow)
CREATE POLICY "questions_insert_authenticated"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Question creators can update their draft/rejected questions
CREATE POLICY "questions_update_own_draft"
  ON questions FOR UPDATE
  TO authenticated
  USING (auth.uid() = created_by AND status IN ('draft', 'rejected'))
  WITH CHECK (auth.uid() = created_by);

-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS question_sources (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id  UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  source_type  TEXT NOT NULL
                 CHECK (source_type IN ('quran', 'hadith', 'jurisprudence', 'scholarly')),
  reference    TEXT NOT NULL
                 CHECK (char_length(reference) > 0),
  text_fr      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: look up sources by question
CREATE INDEX idx_question_sources_question ON question_sources(question_id);

-- Row Level Security
ALTER TABLE question_sources ENABLE ROW LEVEL SECURITY;

-- Sources for approved questions are public (shown in post-match review)
CREATE POLICY "question_sources_select_approved"
  ON question_sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM questions q
      WHERE q.id = question_sources.question_id
        AND q.status = 'approved'
    )
  );

-- Authenticated users can insert sources for their own questions
CREATE POLICY "question_sources_insert_authenticated"
  ON question_sources FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM questions q
      WHERE q.id = question_sources.question_id
        AND q.created_by = auth.uid()
    )
  );
