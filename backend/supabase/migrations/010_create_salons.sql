-- Migration 010: Create salons and salon_messages tables
-- Depends on: 001_create_profiles.sql

-- Salons table (community discussion channels)
CREATE TABLE IF NOT EXISTS salons (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name_fr     TEXT NOT NULL,
  emoji       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-update updated_at
CREATE TRIGGER trg_salons_updated_at
  BEFORE UPDATE ON salons
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Row Level Security
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;

-- Salons are public reference data — anyone can read
CREATE POLICY "salons_select_public"
  ON salons FOR SELECT
  USING (true);

-- Only service role can manage salons (no INSERT/UPDATE/DELETE policies for authenticated)

-- Seed: 4 community salons with hardcoded UUIDs (synchronized with shared/src/constants/game.ts)
INSERT INTO salons (id, slug, name_fr, emoji, description) VALUES
  (
    'b2c3d4e5-0002-0002-0002-000000000001',
    'quran',
    'Coran',
    '📖',
    'Discussions autour des sourates, de la tafsir et de la récitation.'
  ),
  (
    'b2c3d4e5-0002-0002-0002-000000000002',
    'prophets',
    'Prophètes',
    '🕌',
    'Histoires et enseignements des prophètes.'
  ),
  (
    'b2c3d4e5-0002-0002-0002-000000000003',
    'general',
    'Général',
    '⭐',
    'Discussions ouvertes sur l''islam et la vie musulmane.'
  ),
  (
    'b2c3d4e5-0002-0002-0002-000000000004',
    'competition',
    'Compétition',
    '🏆',
    'Stratégies de jeu, classements et défis.'
  )
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------

-- Salon messages table (community discussion messages)
CREATE TABLE IF NOT EXISTS salon_messages (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salon_id           UUID NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  sender_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content            TEXT NOT NULL
                       CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  is_pinned          BOOLEAN NOT NULL DEFAULT false,
  moderation_status  TEXT NOT NULL DEFAULT 'visible'
                       CHECK (moderation_status IN ('visible', 'flagged', 'hidden', 'deleted')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-update updated_at
CREATE TRIGGER trg_salon_messages_updated_at
  BEFORE UPDATE ON salon_messages
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Index: paginated messages by salon (only visible)
CREATE INDEX idx_salon_messages_salon ON salon_messages(salon_id, created_at DESC)
  WHERE moderation_status = 'visible';
CREATE INDEX idx_salon_messages_pinned ON salon_messages(salon_id, is_pinned)
  WHERE is_pinned = true;

-- Row Level Security
ALTER TABLE salon_messages ENABLE ROW LEVEL SECURITY;

-- Visible and pinned messages are readable by anyone (public salons)
CREATE POLICY "salon_messages_select_visible"
  ON salon_messages FOR SELECT
  USING (moderation_status = 'visible');

-- Authenticated users can post to salons
CREATE POLICY "salon_messages_insert_authenticated"
  ON salon_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id AND moderation_status = 'visible');
