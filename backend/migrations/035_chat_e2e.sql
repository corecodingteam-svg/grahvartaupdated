-- End-to-end encrypted chat.
-- Each account has one X25519 key pair. The private key is stored only in
-- encrypted form, locked with a key derived from the owner's chat PIN
-- (Argon2id on the device); the server never sees the PIN or the private key.
CREATE TABLE IF NOT EXISTS chat_keys (
  user_id         UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  public_key      TEXT NOT NULL,   -- base64, 32 bytes
  enc_private_key TEXT NOT NULL,   -- base64, NaCl secretbox(private key) = 48 bytes
  salt            TEXT NOT NULL,   -- base64, 16 bytes (Argon2id salt)
  nonce           TEXT NOT NULL,   -- base64, 24 bytes (secretbox nonce)
  kdf             JSONB NOT NULL,  -- {"alg":"argon2id","m":65536,"t":3,"p":1}
  key_version     INT NOT NULL DEFAULT 1,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- Encrypted messages are stored with message_type 'e2e'; content holds the
-- encrypted envelope, never the text.
ALTER TABLE consultation_messages DROP CONSTRAINT IF EXISTS consultation_messages_message_type_check;
ALTER TABLE consultation_messages ADD CONSTRAINT consultation_messages_message_type_check
  CHECK (message_type IN ('text', 'image', 'audio', 'system', 'e2e'));
