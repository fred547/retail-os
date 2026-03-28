-- Full Stock Count: planned multi-staff shelf-by-shelf inventory count
-- Phase 1: plan + assignments + scans

-- Count Plan — the master session
CREATE TABLE IF NOT EXISTS count_plan (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    store_id INTEGER NOT NULL,
    name TEXT NOT NULL,                    -- "Q1 2026 Full Count"
    status TEXT NOT NULL DEFAULT 'draft',  -- draft, active, completed, cancelled
    notes TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by INTEGER NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT count_plan_status_check CHECK (status IN ('draft', 'active', 'completed', 'cancelled'))
);

ALTER TABLE count_plan ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_count_plan_account ON count_plan (account_id, status, is_deleted);

-- Zone Assignment — which staff counts which shelves
CREATE TABLE IF NOT EXISTS count_zone_assignment (
    id SERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES count_plan(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,             -- pos_user.user_id
    user_name TEXT,                        -- denormalized for display
    shelf_start INTEGER NOT NULL,          -- e.g., 1
    shelf_end INTEGER NOT NULL,            -- e.g., 10
    height_labels TEXT[] DEFAULT '{}',     -- e.g., {"A","B","C","D","E","F","G"}
    status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE count_zone_assignment ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_count_zone_plan ON count_zone_assignment (plan_id);

-- Count Scan — every individual scan or manual +1
-- Last scan per staff per location wins (grouped by MAX scanned_at)
CREATE TABLE IF NOT EXISTS count_scan (
    id BIGSERIAL PRIMARY KEY,
    plan_id INTEGER NOT NULL REFERENCES count_plan(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    user_name TEXT,
    shelf INTEGER NOT NULL,                -- shelf number (e.g., 15)
    height TEXT NOT NULL,                  -- height label (e.g., "C")
    product_id INTEGER,                    -- null if unknown item
    barcode TEXT,                          -- null if manual +1
    product_name TEXT,                     -- denormalized
    quantity INTEGER NOT NULL DEFAULT 1,
    is_unknown BOOLEAN NOT NULL DEFAULT false,  -- true = no barcode, needs identification
    notes TEXT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE count_scan ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_count_scan_plan ON count_scan (plan_id, shelf, height);
CREATE INDEX IF NOT EXISTS idx_count_scan_user ON count_scan (plan_id, user_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_count_scan_location ON count_scan (plan_id, shelf, height, user_id, scanned_at DESC);

NOTIFY pgrst, 'reload schema';
