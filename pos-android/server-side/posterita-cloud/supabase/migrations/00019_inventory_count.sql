-- Inventory Count: session + entry tables for spot check MVP
-- Phase 2 feature: staff scan barcodes and record product quantities

CREATE TABLE inventory_count_session (
  session_id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL,
  store_id INT NOT NULL,
  type TEXT NOT NULL DEFAULT 'spot_check' CHECK (type IN ('full_count', 'spot_check')),
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'active', 'completed', 'cancelled')),
  name TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE inventory_count_entry (
  entry_id SERIAL PRIMARY KEY,
  session_id INT NOT NULL REFERENCES inventory_count_session(session_id),
  account_id TEXT NOT NULL,
  product_id INT NOT NULL,
  product_name TEXT,
  upc TEXT,
  quantity INT NOT NULL DEFAULT 1,
  scanned_by INT NOT NULL DEFAULT 0,
  terminal_id INT NOT NULL DEFAULT 0,
  scanned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_inv_session_account ON inventory_count_session(account_id);
CREATE INDEX idx_inv_session_store ON inventory_count_session(account_id, store_id);
CREATE INDEX idx_inv_entry_session ON inventory_count_entry(session_id);
CREATE INDEX idx_inv_entry_product ON inventory_count_entry(session_id, product_id);

-- Enable RLS
ALTER TABLE inventory_count_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_entry ENABLE ROW LEVEL SECURITY;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
