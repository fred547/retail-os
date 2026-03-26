-- Shift Clock In/Out — Staff Time Tracking
-- Records when staff clock in and out, calculates hours worked

CREATE TABLE IF NOT EXISTS shift (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(account_id),
    store_id INTEGER NOT NULL DEFAULT 0,
    terminal_id INTEGER NOT NULL DEFAULT 0,
    user_id INTEGER NOT NULL,
    user_name TEXT,
    clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
    clock_out TIMESTAMPTZ,
    break_minutes INTEGER NOT NULL DEFAULT 0,
    hours_worked REAL,                           -- computed on clock_out
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE shift ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_shift_account ON shift(account_id);
CREATE INDEX idx_shift_user ON shift(account_id, user_id);
CREATE INDEX idx_shift_date ON shift(account_id, clock_in DESC);
CREATE INDEX idx_shift_active ON shift(account_id, status) WHERE status = 'active';
