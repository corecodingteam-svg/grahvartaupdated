-- Weekly availability timings set by the astrologer, shown to users.
-- {"0":[["14:00","16:00"]],"1":[["16:00","21:00"]]}  (0 = Sunday … 6 = Saturday, IST)
ALTER TABLE astrologers ADD COLUMN IF NOT EXISTS weekly_schedule JSONB NOT NULL DEFAULT '{}'::jsonb;
