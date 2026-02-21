-- Migration 002: Create themes table
-- Depends on: 001_create_profiles.sql (handle_updated_at function)

CREATE TABLE IF NOT EXISTS themes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name_fr     TEXT NOT NULL,
  is_mvp      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-update updated_at
CREATE TRIGGER trg_themes_updated_at
  BEFORE UPDATE ON themes
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Row Level Security
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

-- Themes are public reference data — anyone can read
CREATE POLICY "themes_select_public"
  ON themes FOR SELECT
  USING (true);

-- Only service role can insert/update/delete themes
-- (no INSERT/UPDATE/DELETE policies for anon/authenticated)

-- Seed: 8 themes with hardcoded UUIDs (synchronized with shared/src/constants/game.ts)
INSERT INTO themes (id, slug, name_fr, is_mvp) VALUES
  ('a1b2c3d4-0001-0001-0001-000000000001', 'quran',          'Coran',                      true),
  ('a1b2c3d4-0001-0001-0001-000000000002', 'jurisprudence',  'Jurisprudence',               false),
  ('a1b2c3d4-0001-0001-0001-000000000003', 'prophets',       'Prophètes',                   true),
  ('a1b2c3d4-0001-0001-0001-000000000004', 'muhammad',       'Prophète Muhammad ﷺ',         true),
  ('a1b2c3d4-0001-0001-0001-000000000005', 'history',        'Histoire islamique',           false),
  ('a1b2c3d4-0001-0001-0001-000000000006', 'companions',     'Compagnons du Prophète',       false),
  ('a1b2c3d4-0001-0001-0001-000000000007', 'texts',          'Textes islamiques',            false),
  ('a1b2c3d4-0001-0001-0001-000000000008', 'general',        'Culture générale islamique',   false)
ON CONFLICT (id) DO NOTHING;
