-- Server-side payment reconciliation (webhook / status check) for wallet top-ups
ALTER TABLE wallet_orders ADD COLUMN IF NOT EXISTS payment_id VARCHAR(100);
ALTER TABLE wallet_orders ADD COLUMN IF NOT EXISTS credited_at TIMESTAMP;
ALTER TABLE wallet_orders ADD COLUMN IF NOT EXISTS method VARCHAR(40);
ALTER TABLE wallet_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_wallet_orders_user_status ON wallet_orders(user_id, status, created_at DESC);
