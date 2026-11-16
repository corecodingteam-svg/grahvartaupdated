-- Agent onboarding: email OTP verification + one-registration-per-device
CREATE TABLE IF NOT EXISTS hiring_email_otps (
  id SERIAL PRIMARY KEY,
  email VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  device_id VARCHAR(128),
  otp_hash VARCHAR(128) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP NOT NULL,
  verified_at TIMESTAMP,
  verification_token VARCHAR(128),
  consumed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hiring_otps_email ON hiring_email_otps(LOWER(email), created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hiring_otps_token ON hiring_email_otps(verification_token);

ALTER TABLE agent_hirings ADD COLUMN IF NOT EXISTS device_id VARCHAR(128);
ALTER TABLE agent_hirings ADD COLUMN IF NOT EXISTS device_platform VARCHAR(20);
ALTER TABLE agent_hirings ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
ALTER TABLE agent_hirings ADD COLUMN IF NOT EXISTS online_platforms TEXT;
CREATE INDEX IF NOT EXISTS idx_agent_hirings_device ON agent_hirings(device_id);
CREATE INDEX IF NOT EXISTS idx_agent_hirings_email_lower ON agent_hirings(LOWER(email));
