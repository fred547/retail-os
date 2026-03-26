-- Menu Scheduling
-- Time-based menus: breakfast, lunch, dinner — filter product categories by time of day

CREATE TABLE IF NOT EXISTS menu_schedule (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(account_id),
    store_id INTEGER NOT NULL DEFAULT 0,        -- 0 = all stores
    name TEXT NOT NULL,                          -- e.g., "Breakfast Menu", "Happy Hour"
    description TEXT,
    category_ids JSONB NOT NULL DEFAULT '[]',    -- array of productcategory IDs to show
    start_time TIME NOT NULL,                    -- e.g., 06:00
    end_time TIME NOT NULL,                      -- e.g., 11:00
    days_of_week JSONB NOT NULL DEFAULT '[1,2,3,4,5,6,7]',  -- 1=Mon..7=Sun (ISO)
    priority INTEGER NOT NULL DEFAULT 0,         -- higher = takes precedence if overlapping
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE menu_schedule ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_menu_schedule_account ON menu_schedule(account_id);
CREATE INDEX idx_menu_schedule_active ON menu_schedule(account_id, is_active) WHERE is_active = true;
CREATE INDEX idx_menu_schedule_store ON menu_schedule(account_id, store_id);
