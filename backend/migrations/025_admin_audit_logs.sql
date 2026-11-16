-- Detailed audit trail of every state-changing admin panel action
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID,
  admin_type VARCHAR(20),            -- 'superadmin' | 'subadmin'
  admin_name VARCHAR(255),
  admin_email VARCHAR(255),
  action VARCHAR(100) NOT NULL,      -- e.g. 'astrologer.ban'
  entity_type VARCHAR(50),           -- e.g. 'astrologer'
  entity_id VARCHAR(100),
  summary TEXT,
  method VARCHAR(10),
  path TEXT,
  request_body JSONB,                -- sanitised (secrets removed)
  changes JSONB,                     -- { field: { from, to } } where known
  status_code INTEGER,
  success BOOLEAN,
  ip_address VARCHAR(64),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON admin_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_logs(action);
