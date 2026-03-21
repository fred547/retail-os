-- Product lifecycle: draft → review → live
-- AI-imported products land as 'review' so the owner can approve before they appear on POS.

ALTER TABLE product ADD COLUMN IF NOT EXISTS product_status TEXT DEFAULT 'live'
  CHECK (product_status IN ('draft', 'review', 'live'));

ALTER TABLE product ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
  CHECK (source IN ('manual', 'ai_import', 'quotation', 'supplier_catalog'));

-- Partial index: only index non-live products (the minority)
CREATE INDEX IF NOT EXISTS idx_product_status ON product(product_status) WHERE product_status != 'live';
