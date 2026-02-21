-- Migration 006: Create match_answers table
-- Depends on: 004_create_matches.sql, 005_create_match_questions.sql, 001_create_profiles.sql

CREATE TABLE IF NOT EXISTS match_answers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id              UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  match_question_id     UUID NOT NULL REFERENCES match_questions(id) ON DELETE CASCADE,
  player_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- NULL = timeout (player did not answer in time)
  selected_answer_index INTEGER
                          CHECK (selected_answer_index IS NULL OR selected_answer_index BETWEEN 0 AND 3),
  is_correct            BOOLEAN NOT NULL DEFAULT false,
  time_taken_ms         INTEGER NOT NULL
                          CHECK (time_taken_ms >= 0),
  points_earned         INTEGER NOT NULL DEFAULT 0
                          CHECK (points_earned >= 0),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Each player answers each question exactly once
  UNIQUE (match_question_id, player_id)
);

-- Indexes
CREATE INDEX idx_match_answers_match ON match_answers(match_id, player_id);
CREATE INDEX idx_match_answers_question ON match_answers(match_question_id);

-- Row Level Security
ALTER TABLE match_answers ENABLE ROW LEVEL SECURITY;

-- Both participants can see all answers in their match
-- (needed for post-match review — plan-review Gap 2 fix)
CREATE POLICY "match_answers_select_participant"
  ON match_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_answers.match_id
        AND (m.player1_id = auth.uid() OR m.player2_id = auth.uid())
    )
  );

-- Players can insert their own answers during a match
CREATE POLICY "match_answers_insert_own"
  ON match_answers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = player_id);
