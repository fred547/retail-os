-- Store Layout: configurable shelf zones per store
-- Each zone defines a shelf number range and which height labels exist
-- Example: zone "Main Floor" = shelves 1-20 with heights A,B,C,D,E,F
--          zone "Back Room"  = shelves 30-35 with heights A,B,C
-- Location format: "15-C" = Shelf 15, Height C

CREATE TABLE IF NOT EXISTS store_layout_zone (
    zone_id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(account_id),
    store_id INTEGER NOT NULL,
    name TEXT,                                -- label: "Main Floor", "Back Room", "Cold Storage"
    shelf_start INTEGER NOT NULL,             -- e.g., 1
    shelf_end INTEGER NOT NULL,               -- e.g., 20
    height_labels JSONB NOT NULL DEFAULT '["A","B","C","D","E","F","G"]',  -- vertical positions per shelf
    position INTEGER NOT NULL DEFAULT 0,      -- display order
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE store_layout_zone ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_store_layout_zone_account ON store_layout_zone(account_id, store_id);

NOTIFY pgrst, 'reload schema';
