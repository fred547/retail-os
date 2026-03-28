-- Add account_id to orderline and payment tables for multi-tenant isolation
-- These tables previously only had order_id FK, making RLS and cascade deletes harder

ALTER TABLE orderline ADD COLUMN IF NOT EXISTS account_id TEXT;
ALTER TABLE payment ADD COLUMN IF NOT EXISTS account_id TEXT;

-- Backfill from existing orders
UPDATE orderline SET account_id = o.account_id
FROM orders o WHERE orderline.order_id = o.order_id AND orderline.account_id IS NULL;

UPDATE payment SET account_id = o.account_id
FROM orders o WHERE payment.order_id = o.order_id AND payment.account_id IS NULL;

-- Indexes for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_orderline_account ON orderline(account_id);
CREATE INDEX IF NOT EXISTS idx_payment_account ON payment(account_id);

-- Enable RLS (was missing)
ALTER TABLE orderline ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
