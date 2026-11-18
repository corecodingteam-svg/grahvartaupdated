-- Online time tracking for the performance scorecard ("Online time hrs/day").
-- One row per stretch an astrologer was online; ended_at is NULL while online.
CREATE TABLE IF NOT EXISTS astrologer_online_sessions (
  id            BIGSERIAL PRIMARY KEY,
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  started_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_online_sessions_astro ON astrologer_online_sessions(astrologer_id, started_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_online_sessions_open ON astrologer_online_sessions(astrologer_id) WHERE ended_at IS NULL;
