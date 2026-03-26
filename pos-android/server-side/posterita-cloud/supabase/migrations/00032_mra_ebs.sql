-- 00032: MRA EBS e-invoicing + country-specific tax config
-- Tax compliance is country-specific. Each brand can optionally have a
-- tax config row that enables fiscal reporting (MRA for Mauritius, etc.)
-- This keeps the account table clean — non-Mauritian brands see no MRA fields.

-- 1. Country-specific tax configuration (separate from account table)
CREATE TABLE IF NOT EXISTS account_tax_config (
  account_id    TEXT PRIMARY KEY,            -- FK to account
  country       TEXT NOT NULL DEFAULT 'MU',  -- ISO country code
  tax_system    TEXT NOT NULL DEFAULT 'mra_ebs', -- 'mra_ebs', 'sars', etc.
  brn           TEXT,                        -- Business Registration Number
  tan           TEXT,                        -- Tax Account Number
  vat_reg_no    TEXT,                        -- VAT Registration Number
  api_username  TEXT,                        -- Tax authority API username
  api_password  TEXT,                        -- Tax authority API password
  ebs_machine_id TEXT,                       -- Machine/terminal ID
  area_code     TEXT,                        -- Area code
  is_enabled    BOOLEAN NOT NULL DEFAULT FALSE,
  config_json   JSONB,                       -- Extra country-specific config
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Orders: fiscal tracking
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mra_fiscal_id TEXT;        -- Fiscal ID returned by MRA
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mra_status TEXT DEFAULT 'pending'; -- pending/filed/failed/exempt
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mra_invoice_counter INT;   -- Sequential counter per EBS machine
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mra_previous_hash TEXT;    -- SHA-256 hash of previous invoice (chain)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mra_submitted_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS mra_error TEXT;            -- Last error message if failed

-- 3. Index for MRA status tracking
CREATE INDEX IF NOT EXISTS idx_orders_mra_status ON orders(account_id, mra_status) WHERE mra_status IS NOT NULL;

-- 4. MRA invoice counter sequence (per account, auto-increment)
-- Used to generate the mandatory invoiceCounter field
CREATE TABLE IF NOT EXISTS mra_counter (
  account_id TEXT PRIMARY KEY,
  counter INT NOT NULL DEFAULT 0,
  last_hash TEXT,  -- Hash of the last submitted invoice (for chain linking)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

NOTIFY pgrst, 'reload schema';
