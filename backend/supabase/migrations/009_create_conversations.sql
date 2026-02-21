-- Migration 009: Create conversations and messages tables
-- Depends on: 001_create_profiles.sql

-- Conversations table (1v1 private chat)
CREATE TABLE IF NOT EXISTS conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player1_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player2_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_message_at  TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Players must be different people
  CONSTRAINT chk_conversation_different_players CHECK (player1_id != player2_id)
);

-- Trigger: auto-update updated_at
CREATE TRIGGER trg_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Unique conversation pair regardless of order (LEAST/GREATEST trick)
-- This prevents both (A,B) and (B,A) conversations from existing
CREATE UNIQUE INDEX idx_conversations_unique_pair
  ON conversations (LEAST(player1_id::text, player2_id::text), GREATEST(player1_id::text, player2_id::text));

-- Index: find conversations for a player
CREATE INDEX idx_conversations_player1 ON conversations(player1_id, last_message_at DESC);
CREATE INDEX idx_conversations_player2 ON conversations(player2_id, last_message_at DESC);

-- Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Users can see conversations they are in
CREATE POLICY "conversations_select_participant"
  ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Creator is always player1 to prevent impersonation (Issue 8 fix):
-- user A cannot create a conversation listing user B as player1_id.
CREATE POLICY "conversations_insert_creator"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = player1_id);

-- Participants can update conversation (e.g. last_message_at)
CREATE POLICY "conversations_update_participant"
  ON conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- -----------------------------------------------------------------------------

-- Messages table (1v1 private messages)
CREATE TABLE IF NOT EXISTS messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content          TEXT NOT NULL
                     CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  -- Islamic-themed reactions or null
  reaction         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index: paginated messages by conversation
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);

-- Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Users can see messages in their conversations
CREATE POLICY "messages_select_participant"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.player1_id = auth.uid() OR c.player2_id = auth.uid())
    )
  );

-- Users can insert messages in their conversations
CREATE POLICY "messages_insert_participant"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = messages.conversation_id
        AND (c.player1_id = auth.uid() OR c.player2_id = auth.uid())
    )
  );
