-- Migration 011: Extend profiles table with gamification columns
-- Depends on: 001_create_profiles.sql

-- Add aggregate stats columns to profiles
-- Using IF NOT EXISTS for idempotency
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_matches            INTEGER NOT NULL DEFAULT 0 CHECK (total_matches >= 0);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_wins               INTEGER NOT NULL DEFAULT 0 CHECK (total_wins >= 0);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS losses                   INTEGER NOT NULL DEFAULT 0 CHECK (losses >= 0);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS draws                    INTEGER NOT NULL DEFAULT 0 CHECK (draws >= 0);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS win_streak               INTEGER NOT NULL DEFAULT 0 CHECK (win_streak >= 0);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS best_win_streak          INTEGER NOT NULL DEFAULT 0 CHECK (best_win_streak >= 0);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS placement_matches_played INTEGER NOT NULL DEFAULT 0 CHECK (placement_matches_played BETWEEN 0 AND 2);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_placed                BOOLEAN NOT NULL DEFAULT false;

-- Leaderboard indexes
-- idx_profiles_elo already exists from 001
CREATE INDEX IF NOT EXISTS idx_profiles_wins        ON profiles(total_wins DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_deen_points ON profiles(deen_points DESC);

-- Composite index for ELO + total_matches (placement match detection)
CREATE INDEX IF NOT EXISTS idx_profiles_elo_matches ON profiles(elo DESC, total_matches ASC);
