-- "Write to Us" messages sent from the agent onboarding app, answered from the admin panel
CREATE TABLE IF NOT EXISTS agent_messages (
  id BIGSERIAL PRIMARY KEY,
  hiring_id UUID REFERENCES agent_hirings(id) ON DELETE CASCADE,
  phone VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open',   -- 'open' | 'replied' | 'closed'
  admin_reply TEXT,
  replied_by VARCHAR(255),
  replied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_messages_status ON agent_messages(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_messages_hiring ON agent_messages(hiring_id, created_at DESC);
