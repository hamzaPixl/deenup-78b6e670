-- Migration 007: Create elo_history table
-- Depends on: 001_create_profiles.sql, 004_create_matches.sql

CREATE TABLE IF NOT EXISTS elo_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  match_id    UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  elo_before  INTEGER NOT NULL CHECK (elo_before >= 0),
  elo_after   INTEGER NOT NULL CHECK (elo_after >= 0),
  delta       INTEGER NOT NULL,  -- elo_after - elo_before (can be negative)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_elo_history_player ON elo_history(player_id, created_at DESC);
CREATE INDEX idx_elo_history_match ON elo_history(match_id);

-- Row Level Security
ALTER TABLE elo_history ENABLE ROW LEVEL SECURITY;

-- Players can see their own ELO history
CREATE POLICY "elo_history_select_own"
  ON elo_history FOR SELECT
  TO authenticated
  USING (auth.uid() = player_id);

-- ELO history is written by the backend service role after match completion
-- No INSERT policy for authenticated users (service role bypasses RLS)
