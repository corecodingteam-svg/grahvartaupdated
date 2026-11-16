-- 013_recharge_offers.sql re-ran on old deploys and its "ON CONFLICT DO NOTHING" had no
-- unique key to conflict on, so the 5 default offers were inserted again every deploy.
-- 1) Remove exact duplicates, keeping the oldest row
DELETE FROM recharge_offers r
USING recharge_offers keep
WHERE r.amount = keep.amount
  AND r.bonus_percent = keep.bonus_percent
  AND COALESCE(r.label, '') = COALESCE(keep.label, '')
  AND r.is_active = keep.is_active
  AND r.id > keep.id;

-- 2) Only one ACTIVE offer per amount (the bonus is looked up by amount at payment time)
UPDATE recharge_offers r SET is_active = FALSE
WHERE r.is_active = TRUE
  AND EXISTS (SELECT 1 FROM recharge_offers o WHERE o.amount = r.amount AND o.is_active = TRUE AND o.id < r.id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_recharge_offers_active_amount
  ON recharge_offers(amount) WHERE is_active = TRUE;
