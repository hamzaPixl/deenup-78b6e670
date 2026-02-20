-- Migration 011: Extend profiles table with gamification columns
-- Depends on: 001_create_profiles.sql

-- Add aggregate stats columns to profiles
-- Using IF NOT EXISTS for idempotency
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_matches  INTEGER NOT NULL DEFAULT 0 CHECK (total_matches >= 0);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_wins     INTEGER NOT NULL DEFAULT 0 CHECK (total_wins >= 0);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS win_streak     INTEGER NOT NULL DEFAULT 0 CHECK (win_streak >= 0);

-- Leaderboard index: rank by ELO (already exists from 001) + by win rate
-- Win rate is computed as total_wins / total_matches so we just index the columns
CREATE INDEX IF NOT EXISTS idx_profiles_wins ON profiles(total_wins DESC);

-- Composite leaderboard index for ELO + total_matches (for placement match detection)
CREATE INDEX IF NOT EXISTS idx_profiles_elo_matches ON profiles(elo DESC, total_matches ASC);
