-- Stock deduction on sale: add quantity tracking to products + audit journal
-- Phase 3 priority #2

-- Product: stock tracking columns
ALTER TABLE product ADD COLUMN IF NOT EXISTS quantity_on_hand DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE product ADD COLUMN IF NOT EXISTS reorder_point DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE product ADD COLUMN IF NOT EXISTS track_stock BOOLEAN NOT NULL DEFAULT true;

-- Indexes for stock queries
CREATE INDEX IF NOT EXISTS idx_product_stock ON product (account_id, track_stock, quantity_on_hand);

-- Stock journal: audit trail for every qty change
CREATE TABLE IF NOT EXISTS stock_journal (
    id BIGSERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    store_id INTEGER NOT NULL DEFAULT 0,
    quantity_change DOUBLE PRECISION NOT NULL,
    quantity_after DOUBLE PRECISION NOT NULL,
    reason TEXT NOT NULL,  -- sale, receive, adjustment, count_reconcile, return, transfer
    reference_type TEXT,   -- order, intake_batch, inventory_session, manual
    reference_id TEXT,     -- UUID or ID of source document
    user_id INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE stock_journal ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_journal_account_product ON stock_journal (account_id, product_id);
CREATE INDEX IF NOT EXISTS idx_stock_journal_account_date ON stock_journal (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_journal_reference ON stock_journal (reference_type, reference_id);
