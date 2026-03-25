-- 00031: Serialized inventory — VIN/IMEI/serial number tracking
-- Products with is_serialized='Y' require individual item tracking.
-- Each physical unit (bike, phone, etc.) has a unique serial_item record.

-- 1. Serial item table
CREATE TABLE IF NOT EXISTS serial_item (
  serial_item_id    SERIAL PRIMARY KEY,
  account_id        TEXT NOT NULL,
  product_id        INT NOT NULL,
  store_id          INT NOT NULL,
  serial_number     TEXT NOT NULL,
  serial_type       TEXT NOT NULL DEFAULT 'serial', -- 'vin', 'imei', 'serial', 'certificate'
  status            TEXT NOT NULL DEFAULT 'in_stock', -- 'received', 'in_stock', 'reserved', 'sold', 'delivered', 'returned', 'in_service'

  -- Receiving
  supplier_name     TEXT,
  purchase_date     TIMESTAMPTZ,
  cost_price        DOUBLE PRECISION DEFAULT 0,

  -- Sale
  order_id          INT,
  orderline_id      INT,
  customer_id       INT,
  sold_date         TIMESTAMPTZ,
  selling_price     DOUBLE PRECISION,

  -- Delivery & Warranty (warranty starts at delivery, not sale)
  delivered_date    TIMESTAMPTZ,
  warranty_months   INT DEFAULT 0,
  warranty_expiry   TIMESTAMPTZ, -- computed: delivered_date + warranty_months

  -- Vehicle-specific (nullable for non-vehicle items)
  color             TEXT,
  year              INT,
  engine_number     TEXT,

  -- Metadata
  notes             TEXT,
  is_deleted        BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at        TIMESTAMPTZ,
  is_sync           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique serial per account (can't have two items with same serial in one brand)
CREATE UNIQUE INDEX IF NOT EXISTS idx_serial_item_account_serial
  ON serial_item(account_id, serial_number) WHERE NOT is_deleted;

-- Fast lookup by product + status (stock queries)
CREATE INDEX IF NOT EXISTS idx_serial_item_product_status
  ON serial_item(account_id, product_id, status) WHERE NOT is_deleted;

-- Fast barcode scan lookup
CREATE INDEX IF NOT EXISTS idx_serial_item_serial_lookup
  ON serial_item(account_id, serial_number);

-- Customer ownership queries
CREATE INDEX IF NOT EXISTS idx_serial_item_customer
  ON serial_item(account_id, customer_id) WHERE customer_id IS NOT NULL;

-- Available stock per store
CREATE INDEX IF NOT EXISTS idx_serial_item_store_stock
  ON serial_item(account_id, store_id, status) WHERE status = 'in_stock' AND NOT is_deleted;

-- Sync pull (updated since last sync)
CREATE INDEX IF NOT EXISTS idx_serial_item_updated
  ON serial_item(account_id, updated_at);

-- RLS
ALTER TABLE serial_item ENABLE ROW LEVEL SECURITY;

-- 2. Product: add serialized flag
ALTER TABLE product ADD COLUMN IF NOT EXISTS is_serialized TEXT DEFAULT 'N';

-- 3. OrderLine: link to specific serial item sold
ALTER TABLE orderline ADD COLUMN IF NOT EXISTS serial_item_id INT;

-- 4. Inventory count entry: track scanned serials
ALTER TABLE inventory_count_entry ADD COLUMN IF NOT EXISTS serial_item_id INT;
ALTER TABLE inventory_count_entry ADD COLUMN IF NOT EXISTS serial_number TEXT;

-- 5. Auto-compute warranty_expiry on delivery
CREATE OR REPLACE FUNCTION compute_warranty_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.delivered_date IS NOT NULL AND NEW.warranty_months > 0 THEN
    NEW.warranty_expiry := NEW.delivered_date + (NEW.warranty_months || ' months')::INTERVAL;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_serial_item_warranty
  BEFORE INSERT OR UPDATE ON serial_item
  FOR EACH ROW
  EXECUTE FUNCTION compute_warranty_expiry();

-- Reload PostgREST cache
NOTIFY pgrst, 'reload schema';
