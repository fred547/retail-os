-- 00029: Till sync fix — UUID-based order-till linking, soft delete, unique constraint
-- Prevents till-order link loss when till sync fails before order sync

-- 1. Add till_uuid to orders (survives till sync failures)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS till_uuid UUID;
CREATE INDEX IF NOT EXISTS idx_orders_till_uuid ON orders(till_uuid);

-- 2. Soft delete for till table
ALTER TABLE till ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE till ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_till_not_deleted ON till(account_id) WHERE NOT is_deleted;

-- 3. Unique constraint on (account_id, uuid) — prevents duplicate tills per account
CREATE UNIQUE INDEX IF NOT EXISTS idx_till_account_uuid ON till(account_id, uuid) WHERE uuid IS NOT NULL;

-- 4. Backfill till_uuid on existing orders from their till_id FK
UPDATE orders SET till_uuid = t.uuid
FROM till t
WHERE orders.till_id = t.till_id
  AND orders.till_uuid IS NULL;

-- 5. Reconciliation function: back-fills till_id on orphaned orders
-- Called after till sync to reconnect orders whose tills arrived late
CREATE OR REPLACE FUNCTION reconcile_till_orders(p_account_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE orders o
  SET till_id = t.till_id
  FROM till t
  WHERE o.till_uuid = t.uuid
    AND o.account_id = t.account_id
    AND o.account_id = p_account_id
    AND o.till_id IS NULL
    AND o.till_uuid IS NOT NULL;
END;
$$ LANGUAGE plpgsql;
