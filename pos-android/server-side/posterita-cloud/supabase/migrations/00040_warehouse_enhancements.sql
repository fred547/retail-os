-- Warehouse enhancements: variance tracking + staff assignment
-- Migration 00040

-- Add staff assignment to sessions
ALTER TABLE inventory_count_session ADD COLUMN IF NOT EXISTS assigned_to INTEGER;
ALTER TABLE inventory_count_session ADD COLUMN IF NOT EXISTS variance_count INTEGER NOT NULL DEFAULT 0;

-- Add system qty snapshot + variance to entries
ALTER TABLE inventory_count_entry ADD COLUMN IF NOT EXISTS system_qty REAL NOT NULL DEFAULT 0;
ALTER TABLE inventory_count_entry ADD COLUMN IF NOT EXISTS variance REAL NOT NULL DEFAULT 0;

-- Enable RLS
ALTER TABLE inventory_count_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_entry ENABLE ROW LEVEL SECURITY;

-- Index for fast session lookups
CREATE INDEX IF NOT EXISTS idx_inventory_session_account_status
  ON inventory_count_session(account_id, status);

CREATE INDEX IF NOT EXISTS idx_inventory_entry_session
  ON inventory_count_entry(session_id, product_id);

-- Product: shelf location, batch tracking, expiry dates
ALTER TABLE product ADD COLUMN IF NOT EXISTS shelf_location TEXT;
ALTER TABLE product ADD COLUMN IF NOT EXISTS batch_number TEXT;
ALTER TABLE product ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;

-- Index for expiry tracking
CREATE INDEX IF NOT EXISTS idx_product_expiry
  ON product(account_id, expiry_date)
  WHERE expiry_date IS NOT NULL AND is_deleted = false;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
