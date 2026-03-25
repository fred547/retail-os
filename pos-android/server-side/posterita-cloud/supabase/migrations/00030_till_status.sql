-- 00030: Till status column — open/closed tracking
-- Tills now sync at open (header only) and again at close (full amounts)
-- Enables cloud visibility into active terminals

ALTER TABLE till ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'closed';
CREATE INDEX IF NOT EXISTS idx_till_status ON till(account_id, status);

-- Backfill: existing tills with date_closed are 'closed', without are 'open'
UPDATE till SET status = 'open' WHERE date_closed IS NULL AND status = 'closed';
