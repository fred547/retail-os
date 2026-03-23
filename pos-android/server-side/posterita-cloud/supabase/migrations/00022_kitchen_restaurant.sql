-- ============================================================
-- Kitchen & Restaurant: table sections, preparation stations, category routing
-- ============================================================

-- 1. TABLE SECTIONS / ZONES
CREATE TABLE table_section (
    section_id    SERIAL PRIMARY KEY,
    account_id    TEXT NOT NULL REFERENCES account(account_id),
    store_id      INT NOT NULL,
    name          TEXT NOT NULL,
    display_order INT DEFAULT 0,
    color         TEXT DEFAULT '#6B7280',
    is_active     BOOLEAN DEFAULT TRUE,
    is_takeaway   BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_table_section_account ON table_section(account_id);
CREATE INDEX idx_table_section_store ON table_section(store_id);

-- 2. PREPARATION STATIONS
CREATE TABLE preparation_station (
    station_id    SERIAL PRIMARY KEY,
    account_id    TEXT NOT NULL REFERENCES account(account_id),
    store_id      INT NOT NULL,
    name          TEXT NOT NULL,
    station_type  TEXT NOT NULL DEFAULT 'kitchen',
    printer_id    INT DEFAULT NULL,
    color         TEXT DEFAULT '#3B82F6',
    display_order INT DEFAULT 0,
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prep_station_account ON preparation_station(account_id);
CREATE INDEX idx_prep_station_store ON preparation_station(store_id);

-- 3. CATEGORY → STATION MAPPING
CREATE TABLE category_station_mapping (
    id            SERIAL PRIMARY KEY,
    account_id    TEXT NOT NULL REFERENCES account(account_id),
    category_id   INT NOT NULL,
    station_id    INT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(account_id, category_id)
);

CREATE INDEX idx_cat_station_account ON category_station_mapping(account_id);

-- 4. ALTER EXISTING TABLES

-- restaurant_table: link to section
ALTER TABLE restaurant_table ADD COLUMN IF NOT EXISTS section_id INT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_table_section ON restaurant_table(section_id);

-- product: per-product station override
ALTER TABLE product ADD COLUMN IF NOT EXISTS station_override_id INT DEFAULT NULL;

-- printer: link to preparation station
ALTER TABLE printer ADD COLUMN IF NOT EXISTS station_id INT DEFAULT NULL;

-- 5. ROW LEVEL SECURITY
ALTER TABLE table_section ENABLE ROW LEVEL SECURITY;
ALTER TABLE preparation_station ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_station_mapping ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account access table_section" ON table_section
    FOR ALL USING (account_id = public.get_effective_account_id() OR public.is_super_admin());

CREATE POLICY "Account access preparation_station" ON preparation_station
    FOR ALL USING (account_id = public.get_effective_account_id() OR public.is_super_admin());

CREATE POLICY "Account access category_station_mapping" ON category_station_mapping
    FOR ALL USING (account_id = public.get_effective_account_id() OR public.is_super_admin());

-- 6. REALTIME
ALTER PUBLICATION supabase_realtime ADD TABLE table_section;
ALTER PUBLICATION supabase_realtime ADD TABLE preparation_station;
ALTER PUBLICATION supabase_realtime ADD TABLE category_station_mapping;

NOTIFY pgrst, 'reload schema';
