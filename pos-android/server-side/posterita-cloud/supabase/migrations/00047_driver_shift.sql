-- ============================================================
-- Migration 00047: Driver Shifts — cash float, reconciliation
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_shift (
  id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL REFERENCES account(account_id),
  driver_id INTEGER NOT NULL,
  driver_name TEXT,

  -- Float (like a mobile till)
  opening_float REAL NOT NULL DEFAULT 0,
  closing_float REAL,

  -- COD summary (auto-computed from deliveries)
  total_cod_expected REAL NOT NULL DEFAULT 0,
  total_cod_collected REAL NOT NULL DEFAULT 0,
  total_deliveries INTEGER NOT NULL DEFAULT 0,
  total_delivered INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,

  -- Cash reconciliation
  cash_returned REAL,       -- amount driver hands back
  variance REAL,            -- cash_returned - (opening_float + total_cod_collected)
  reconciled_by INTEGER,    -- supervisor who reconciled
  reconciliation_notes TEXT,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'ended', 'reconciled')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE driver_shift ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_driver_shift_account ON driver_shift(account_id);
CREATE INDEX idx_driver_shift_driver ON driver_shift(account_id, driver_id, status);

-- Link deliveries to driver shifts
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS driver_shift_id INTEGER;

-- Customer tracking token (public, no auth needed)
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS tracking_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_tracking ON delivery(tracking_token) WHERE tracking_token IS NOT NULL;

NOTIFY pgrst, 'reload schema';
