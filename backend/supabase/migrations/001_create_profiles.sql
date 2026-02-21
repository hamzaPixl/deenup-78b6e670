-- Migration 001: Create profiles table
-- Depends on: auth.users (Supabase built-in)

-- Reusable updated_at trigger function (created once, used by all tables)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profiles table (extends auth.users with game data)
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  avatar_url    TEXT,
  elo           INTEGER NOT NULL DEFAULT 1000
                  CHECK (elo >= 0),
  deen_points   INTEGER NOT NULL DEFAULT 50
                  CHECK (deen_points >= 0),
  preferred_language TEXT NOT NULL DEFAULT 'fr',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-update updated_at
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Any authenticated user can read any profile (public leaderboard)
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role can insert profiles (backend creates profiles on signup)
CREATE POLICY "Service role can insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- Index: leaderboard queries by ELO
CREATE INDEX idx_profiles_elo ON public.profiles(elo DESC);
