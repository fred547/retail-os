-- ============================================================
-- Terminal types: per-terminal role instead of global businessType
-- ============================================================

-- Terminal type determines UI, features, and startup behavior
-- pos_retail (default), pos_restaurant, kds, mobile_staff, customer_display, self_service
ALTER TABLE terminal ADD COLUMN IF NOT EXISTS terminal_type TEXT NOT NULL DEFAULT 'pos_retail';
ALTER TABLE terminal ADD COLUMN IF NOT EXISTS zone TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_terminal_type ON terminal(terminal_type);

NOTIFY pgrst, 'reload schema';
