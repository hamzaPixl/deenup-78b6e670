-- Migration 005: Create match_questions table
-- Depends on: 004_create_matches.sql, 003_create_questions.sql

CREATE TABLE IF NOT EXISTS match_questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  question_order  INTEGER NOT NULL
                    CHECK (question_order BETWEEN 1 AND 15),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each question appears only once per match
  UNIQUE (match_id, question_id),
  -- Each position in a match is unique
  UNIQUE (match_id, question_order)
);

-- Indexes
CREATE INDEX idx_match_questions_match ON match_questions(match_id, question_order);

-- Row Level Security
ALTER TABLE match_questions ENABLE ROW LEVEL SECURITY;

-- Match participants can see questions in their matches
CREATE POLICY "match_questions_select_participant"
  ON match_questions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_questions.match_id
        AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
    )
  );

-- Match questions are managed by the backend service role during match setup
-- No INSERT policy for authenticated users (service role bypasses RLS)
