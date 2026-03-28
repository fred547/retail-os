-- Shift Roster: store hours, holidays, labor config, roster templates, staffing, periods, picks

-- 1. Store operating hours — regular open/close by day type
CREATE TABLE IF NOT EXISTS store_operating_hours (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    store_id INTEGER NOT NULL,
    day_type TEXT NOT NULL,
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT store_hours_day_type_check CHECK (day_type IN ('weekday', 'saturday', 'sunday', 'public_holiday')),
    CONSTRAINT store_hours_unique UNIQUE (account_id, store_id, day_type)
);

ALTER TABLE store_operating_hours ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_store_operating_hours_account ON store_operating_hours (account_id, store_id);

-- 2. Store hours override — date-specific exceptions (Christmas, renovation, etc.)
CREATE TABLE IF NOT EXISTS store_hours_override (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    store_id INTEGER NOT NULL,
    date DATE NOT NULL,
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT store_hours_override_unique UNIQUE (account_id, store_id, date)
);

ALTER TABLE store_hours_override ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_store_hours_override_account ON store_hours_override (account_id, store_id, date);

-- 3. Public holiday — per-country holiday calendar
CREATE TABLE IF NOT EXISTS public_holiday (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'MU',
    date DATE NOT NULL,
    name TEXT NOT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT public_holiday_unique UNIQUE (account_id, country_code, date)
);

ALTER TABLE public_holiday ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_public_holiday_account ON public_holiday (account_id, country_code, date);

-- 4. Labor config — country-level labor rules per account
CREATE TABLE IF NOT EXISTS labor_config (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    country_code TEXT NOT NULL DEFAULT 'MU',
    standard_weekly_hours REAL NOT NULL DEFAULT 45,
    standard_daily_hours REAL NOT NULL DEFAULT 9,
    weekday_multiplier REAL NOT NULL DEFAULT 1.0,
    saturday_multiplier REAL NOT NULL DEFAULT 1.0,
    sunday_multiplier REAL NOT NULL DEFAULT 1.5,
    public_holiday_multiplier REAL NOT NULL DEFAULT 2.0,
    overtime_multiplier REAL NOT NULL DEFAULT 1.5,
    min_break_minutes INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT labor_config_unique UNIQUE (account_id, country_code)
);

ALTER TABLE labor_config ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_labor_config_account ON labor_config (account_id);

-- 5. Roster template slot — repeating weekly shift templates per store
CREATE TABLE IF NOT EXISTS roster_template_slot (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    store_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    day_of_week INTEGER NOT NULL,  -- 1=Monday .. 7=Sunday (ISO)
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_minutes INTEGER NOT NULL DEFAULT 30,
    required_role TEXT,
    color TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT roster_slot_dow_check CHECK (day_of_week BETWEEN 1 AND 7)
);

ALTER TABLE roster_template_slot ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_roster_template_slot_account ON roster_template_slot (account_id, store_id, is_deleted);

-- 6. Staffing requirement — min/max staff per role per slot
CREATE TABLE IF NOT EXISTS staffing_requirement (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    slot_id INTEGER NOT NULL REFERENCES roster_template_slot(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    min_count INTEGER NOT NULL DEFAULT 1,
    max_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE staffing_requirement ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_staffing_requirement_slot ON staffing_requirement (slot_id);

-- 7. Roster period — month-long planning period per store
CREATE TABLE IF NOT EXISTS roster_period (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    store_id INTEGER NOT NULL,
    name TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    picking_deadline TIMESTAMPTZ,
    approved_by INTEGER,
    approved_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT roster_period_status_check CHECK (status IN ('open', 'picking', 'review', 'approved', 'locked'))
);

ALTER TABLE roster_period ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_roster_period_account ON roster_period (account_id, store_id, status, is_deleted);

-- 8. Shift pick — staff picks a slot for a specific date
CREATE TABLE IF NOT EXISTS shift_pick (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    roster_period_id INTEGER NOT NULL REFERENCES roster_period(id) ON DELETE CASCADE,
    slot_id INTEGER NOT NULL REFERENCES roster_template_slot(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'picked',
    effective_hours REAL,
    day_type TEXT,
    multiplier REAL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT shift_pick_status_check CHECK (status IN ('picked', 'approved', 'rejected', 'cancelled')),
    CONSTRAINT shift_pick_unique UNIQUE (roster_period_id, slot_id, user_id, date)
);

ALTER TABLE shift_pick ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_shift_pick_period ON shift_pick (roster_period_id, date, status);
CREATE INDEX IF NOT EXISTS idx_shift_pick_user ON shift_pick (account_id, user_id, date);

-- Modify existing tables

-- staff_schedule: add roster columns
ALTER TABLE staff_schedule ADD COLUMN IF NOT EXISTS slot_id INTEGER;
ALTER TABLE staff_schedule ADD COLUMN IF NOT EXISTS roster_period_id INTEGER;
ALTER TABLE staff_schedule ADD COLUMN IF NOT EXISTS pick_id INTEGER;
ALTER TABLE staff_schedule ADD COLUMN IF NOT EXISTS effective_hours REAL;
ALTER TABLE staff_schedule ADD COLUMN IF NOT EXISTS day_type TEXT;
ALTER TABLE staff_schedule ADD COLUMN IF NOT EXISTS multiplier REAL;

-- shift: add effective hours columns
ALTER TABLE shift ADD COLUMN IF NOT EXISTS effective_hours REAL;
ALTER TABLE shift ADD COLUMN IF NOT EXISTS day_type TEXT;
ALTER TABLE shift ADD COLUMN IF NOT EXISTS multiplier REAL;

-- account: add country_code
ALTER TABLE account ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'MU';

NOTIFY pgrst, 'reload schema';
