-- ============================================================
-- Migration 00048: Shift offline sync — UUID for de-duplication
-- ============================================================

ALTER TABLE shift ADD COLUMN IF NOT EXISTS uuid TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_shift_uuid ON shift(uuid) WHERE uuid IS NOT NULL;

NOTIFY pgrst, 'reload schema';
