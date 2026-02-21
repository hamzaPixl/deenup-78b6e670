-- Migration 004: Create matches table
-- Depends on: 001_create_profiles.sql, 002_create_themes.sql

CREATE TABLE IF NOT EXISTS matches (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  match_type          TEXT NOT NULL
                        CHECK (match_type IN ('ranked', 'unranked')),
  status              TEXT NOT NULL DEFAULT 'waiting'
                        CHECK (status IN ('waiting', 'in_progress', 'completed', 'abandoned')),
  winner_id           UUID REFERENCES profiles(id) ON DELETE SET NULL,
  player1_score       INTEGER NOT NULL DEFAULT 0
                        CHECK (player1_score >= 0),
  player2_score       INTEGER NOT NULL DEFAULT 0
                        CHECK (player2_score >= 0),
  player1_elo_before  INTEGER NOT NULL
                        CHECK (player1_elo_before >= 0),
  player2_elo_before  INTEGER
                        CHECK (player2_elo_before IS NULL OR player2_elo_before >= 0),
  player1_elo_after   INTEGER,
  player2_elo_after   INTEGER,
  theme_id            UUID REFERENCES themes(id) ON DELETE SET NULL,
  started_at          TIMESTAMPTZ,
  ended_at            TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Players must be different people
  CONSTRAINT chk_different_players CHECK (player1_id != player2_id)
);

-- Trigger: auto-update updated_at
CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Indexes
CREATE INDEX idx_matches_player1 ON matches(player1_id, created_at DESC);
CREATE INDEX idx_matches_player2 ON matches(player2_id, created_at DESC);
CREATE INDEX idx_matches_status ON matches(status);

-- Row Level Security
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Players can see their own matches
CREATE POLICY "matches_select_own"
  ON matches FOR SELECT
  TO authenticated
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Players can create matches (as player1)
CREATE POLICY "matches_insert_own"
  ON matches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = player1_id);

-- Player2 can join a waiting match (only allowed to set player2_id to themselves).
-- Score, ELO, winner, and status updates are handled by the backend service role
-- which bypasses RLS. Authenticated clients can only update matches in 'waiting'
-- status to prevent interfering with in-progress or completed matches.
CREATE POLICY "matches_update_join"
  ON matches FOR UPDATE
  TO authenticated
  USING (status = 'waiting' AND auth.uid() = player2_id)
  WITH CHECK (auth.uid() = player2_id);
