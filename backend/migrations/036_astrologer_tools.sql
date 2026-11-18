-- Astrologer tools: welcome message, saved remedies, sound preferences,
-- and why/by whom each consultation ended (for the performance dashboard).

ALTER TABLE astrologers ADD COLUMN IF NOT EXISTS welcome_message TEXT;
ALTER TABLE astrologers ADD COLUMN IF NOT EXISTS welcome_enabled BOOLEAN NOT NULL DEFAULT FALSE;
-- {"chat_request":{"sound":"temple_bell","vibrate":true},"call_request":{...},"message":{...}}
ALTER TABLE astrologers ADD COLUMN IF NOT EXISTS notification_prefs JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS astrologer_remedies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  astrologer_id UUID NOT NULL REFERENCES astrologers(id) ON DELETE CASCADE,
  title         VARCHAR(80) NOT NULL,
  body          TEXT NOT NULL,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_astrologer_remedies ON astrologer_remedies(astrologer_id, sort_order);

-- end_reason: declined | cancelled | superseded | blocked | ended | inactivity |
--             insufficient_balance | astrologer_disconnected | user_disconnected | missed
-- ended_by:   user | astrologer | system
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS end_reason VARCHAR(40);
ALTER TABLE consultations ADD COLUMN IF NOT EXISTS ended_by VARCHAR(20);
CREATE INDEX IF NOT EXISTS idx_consultations_astro_created ON consultations(astrologer_id, created_at DESC);
