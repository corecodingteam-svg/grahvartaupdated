-- TESTING ONLY: credit ₹1000 once to every existing end-user wallet.
-- New users get the same credit at sign-up (TEST_WALLET_CREDIT env, default 1000; set 0 to stop).
-- Astrologer wallets are excluded on purpose (their balance is withdrawable earnings).
INSERT INTO wallets (user_id)
SELECT u.id FROM users u WHERE u.role = 'user'
ON CONFLICT (user_id) DO NOTHING;

WITH eligible AS (
  SELECT w.id AS wallet_id, w.user_id, COALESCE(w.balance, 0) AS balance
  FROM wallets w
  JOIN users u ON u.id = w.user_id AND u.role = 'user'
  WHERE NOT EXISTS (
    SELECT 1 FROM wallet_transactions t
    WHERE t.user_id = w.user_id AND t.reference_type = 'test_credit'
  )
), tx AS (
  INSERT INTO wallet_transactions (wallet_id, user_id, type, amount, balance_before, balance_after, description, reference_type, status)
  SELECT wallet_id, user_id, 'bonus', 1000, balance, balance + 1000, 'Test wallet credit', 'test_credit', 'success'
  FROM eligible
  RETURNING user_id
)
UPDATE wallets SET balance = COALESCE(balance, 0) + 1000, updated_at = NOW()
WHERE user_id IN (SELECT user_id FROM tx);
