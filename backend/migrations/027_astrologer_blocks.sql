-- An astrologer can block a user; blocked users cannot reach that astrologer by any channel
CREATE TABLE IF NOT EXISTS astrologer_blocked_users (
  id BIGSERIAL PRIMARY KEY,
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (astrologer_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_astro_blocks_user ON astrologer_blocked_users(user_id);
