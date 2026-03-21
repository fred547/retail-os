-- Product Intake Pipeline: intake_batch + intake_item tables
-- Products from any source (website, catalogue, PO, invoice) land here
-- for owner review before being committed to the product table.

-- ════════════════════════════════════════════════════════
-- intake_batch — one import action
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS intake_batch (
  batch_id SERIAL PRIMARY KEY,
  account_id INT NOT NULL,
  source TEXT NOT NULL CHECK (source IN (
    'website', 'catalogue', 'purchase_order', 'invoice', 'ai_search', 'supplier_feed'
  )),
  source_ref TEXT,              -- URL, filename, PO#, invoice#
  source_file_url TEXT,         -- Cloudinary URL of uploaded document
  status TEXT DEFAULT 'processing' CHECK (status IN (
    'processing', 'ready', 'in_review', 'committed', 'failed'
  )),
  item_count INT DEFAULT 0,
  approved_count INT DEFAULT 0,
  rejected_count INT DEFAULT 0,
  supplier_name TEXT,
  created_by INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by INT,
  reviewed_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_intake_batch_account ON intake_batch(account_id);
CREATE INDEX idx_intake_batch_status ON intake_batch(status) WHERE status != 'committed';

-- ════════════════════════════════════════════════════════
-- intake_item — one candidate product within a batch
-- ════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS intake_item (
  item_id SERIAL PRIMARY KEY,
  batch_id INT NOT NULL REFERENCES intake_batch(batch_id) ON DELETE CASCADE,
  account_id INT NOT NULL,

  -- Extracted data (raw from source)
  name TEXT NOT NULL,
  description TEXT,
  selling_price NUMERIC(12,2),
  cost_price NUMERIC(12,2),
  image_url TEXT,               -- original source URL
  image_cdn_url TEXT,           -- after Cloudinary upload
  barcode TEXT,
  category_name TEXT,           -- raw text, not FK yet
  unit TEXT,                    -- "kg", "piece", "bottle"
  supplier_sku TEXT,
  quantity NUMERIC(12,2),       -- for POs/invoices

  -- AI matching
  match_product_id INT,         -- FK to existing product if matched
  match_confidence NUMERIC(3,2),-- 0.00–1.00
  match_type TEXT CHECK (match_type IN ('exact', 'fuzzy', 'new', 'manual')),

  -- Review state
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'approved', 'rejected', 'merged'
  )),

  -- Owner overrides (filled during review)
  override_name TEXT,
  override_price NUMERIC(12,2),
  override_category_id INT,

  -- After commit
  committed_product_id INT,     -- product created/updated

  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_intake_item_batch ON intake_item(batch_id);
CREATE INDEX idx_intake_item_status ON intake_item(status) WHERE status = 'pending';

-- RLS policies (service role bypasses, but good practice)
ALTER TABLE intake_batch ENABLE ROW LEVEL SECURITY;
ALTER TABLE intake_item ENABLE ROW LEVEL SECURITY;

CREATE POLICY intake_batch_account ON intake_batch
  FOR ALL USING (true);

CREATE POLICY intake_item_account ON intake_item
  FOR ALL USING (true);
