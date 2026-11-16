-- Rule violations (e.g. sharing contact details in chat) + hold / lock / warn moderation
CREATE TABLE IF NOT EXISTS rule_violations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,                 -- 'user' | 'astrologer'
  astrologer_id UUID REFERENCES astrologers(id) ON DELETE SET NULL,
  consultation_id UUID REFERENCES consultations(id) ON DELETE SET NULL,
  violation_type VARCHAR(50) NOT NULL,       -- 'contact_sharing' | ...
  detected TEXT[],                           -- e.g. {'phone','email'}
  content TEXT,                              -- the blocked message
  channel VARCHAR(30),                       -- 'consultation_chat' | 'live_chat'
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_violations_user ON rule_violations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_violations_role ON rule_violations(role, created_at DESC);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL,               -- 'warn' | 'hold' | 'release' | 'lock' | 'unlock'
  reason TEXT,
  hold_until TIMESTAMP,
  admin_id UUID,
  admin_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mod_actions_user ON moderation_actions(user_id, created_at DESC);

ALTER TABLE users ADD COLUMN IF NOT EXISTS hold_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS hold_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS lock_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS warning_count INTEGER NOT NULL DEFAULT 0;
