-- ── Admin panel support columns ─────────────────────────────────────────────

-- Users: role, ban flag, phone
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin', 'astrologer'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Astrologers: approval status, rejection reason
ALTER TABLE astrologers ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected'));
ALTER TABLE astrologers ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Back-fill existing verified astrologers
UPDATE astrologers SET status = 'approved' WHERE is_verified = true;

-- Push tokens (if not already created)
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_astrologers_status ON astrologers(status);

-- (The default admin seed that used to be here created admin@astrovaak.com with
-- the password "password". Removed for security — create admins with
-- `ADMIN_EMAIL=… ADMIN_PASSWORD=… node scripts/create-admin.js`.)
