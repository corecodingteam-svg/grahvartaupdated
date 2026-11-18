-- Consultations billed only the ₹1 minimum charge credited the astrologer's
-- wallet with their 80% share but left astrologer_earning / platform_fee at 0,
-- so dashboard earnings and the weekly chart showed ₹0. Record the same split.
UPDATE consultations
SET astrologer_earning = ROUND(total_amount * 0.80, 2),
    platform_fee       = ROUND(total_amount * 0.20, 2)
WHERE status = 'completed'
  AND total_amount > 0
  AND COALESCE(astrologer_earning, 0) = 0
  AND COALESCE(platform_fee, 0) = 0;
