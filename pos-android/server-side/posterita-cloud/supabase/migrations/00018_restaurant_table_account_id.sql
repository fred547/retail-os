-- Add account_id to restaurant_table for direct scoping and RLS
ALTER TABLE restaurant_table ADD COLUMN IF NOT EXISTS account_id TEXT REFERENCES account(account_id);

-- Backfill account_id from store
UPDATE restaurant_table rt
SET account_id = s.account_id
FROM store s
WHERE rt.store_id = s.store_id AND rt.account_id IS NULL;

-- Index for account-scoped queries
CREATE INDEX IF NOT EXISTS idx_restaurant_table_account ON restaurant_table(account_id);
