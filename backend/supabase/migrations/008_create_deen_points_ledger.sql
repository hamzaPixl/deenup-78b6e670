-- Migration 008: Create deen_points_ledger table
-- Depends on: 001_create_profiles.sql, 004_create_matches.sql

CREATE TABLE IF NOT EXISTS deen_points_ledger (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  transaction_type  TEXT NOT NULL
                      CHECK (transaction_type IN (
                        'daily_play',
                        'fast_answer',
                        'match_win',
                        'bonus_time',
                        'double_points',
                        'hint'
                      )),
  amount            INTEGER NOT NULL,  -- positive = credit, negative = debit
  balance_after     INTEGER NOT NULL
                      CHECK (balance_after >= 0),
  match_id          UUID REFERENCES matches(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_deen_points_player ON deen_points_ledger(player_id, created_at DESC);
CREATE INDEX idx_deen_points_match ON deen_points_ledger(match_id);

-- Row Level Security
ALTER TABLE deen_points_ledger ENABLE ROW LEVEL SECURITY;

-- Players can see their own transaction history
CREATE POLICY "deen_points_select_own"
  ON deen_points_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = player_id);

-- Players can insert their own powerup usage (spending transactions)
-- Earning transactions are handled by the backend service role
CREATE POLICY "deen_points_insert_own"
  ON deen_points_ledger FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = player_id
    AND amount < 0  -- Only spending (negative amounts) from client
    AND transaction_type IN ('bonus_time', 'double_points', 'hint')
  );
