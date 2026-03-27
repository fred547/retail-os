-- Store type: retail or warehouse
-- Warehouse stores have layout zones, shelf browser, picking/put-away workflows
-- Retail stores have POS, customer-facing features

ALTER TABLE store ADD COLUMN IF NOT EXISTS store_type TEXT NOT NULL DEFAULT 'retail'
    CHECK (store_type IN ('retail', 'warehouse'));

NOTIFY pgrst, 'reload schema';
