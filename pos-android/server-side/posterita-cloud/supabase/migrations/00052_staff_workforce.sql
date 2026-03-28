-- ============================================================
-- Migration 00052: Staff & Workforce Management
-- Schedule, breaks, leave, performance view, permissions
-- ============================================================

-- 1. Staff scheduling
CREATE TABLE IF NOT EXISTS staff_schedule (
  id              SERIAL PRIMARY KEY,
  account_id      TEXT NOT NULL,
  store_id        INT NOT NULL,
  user_id         INT NOT NULL,
  date            DATE NOT NULL,
  start_time      TIME NOT NULL,
  end_time        TIME NOT NULL,
  break_minutes   INT NOT NULL DEFAULT 0,
  role_override   TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'confirmed', 'cancelled')),
  created_by      INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(account_id, user_id, date, start_time)
);

CREATE INDEX IF NOT EXISTS idx_staff_schedule_account ON staff_schedule(account_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_schedule_user ON staff_schedule(account_id, user_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_schedule_store ON staff_schedule(account_id, store_id, date);

ALTER TABLE staff_schedule ENABLE ROW LEVEL SECURITY;

-- 2. Break tracking
CREATE TABLE IF NOT EXISTS staff_break (
  id              SERIAL PRIMARY KEY,
  shift_id        INT,
  account_id      TEXT NOT NULL,
  user_id         INT NOT NULL,
  break_type      TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (break_type IN ('paid', 'unpaid')),
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ,
  duration_minutes INT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_break_account ON staff_break(account_id, user_id);
CREATE INDEX IF NOT EXISTS idx_staff_break_shift ON staff_break(shift_id);

ALTER TABLE staff_break ENABLE ROW LEVEL SECURITY;

-- 3. Extend shift table with schedule linkage
ALTER TABLE shift ADD COLUMN IF NOT EXISTS scheduled_start TIME;
ALTER TABLE shift ADD COLUMN IF NOT EXISTS scheduled_end TIME;
ALTER TABLE shift ADD COLUMN IF NOT EXISTS overtime_minutes INT NOT NULL DEFAULT 0;
ALTER TABLE shift ADD COLUMN IF NOT EXISTS is_late BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE shift ADD COLUMN IF NOT EXISTS late_minutes INT NOT NULL DEFAULT 0;
ALTER TABLE shift ADD COLUMN IF NOT EXISTS total_break_minutes INT NOT NULL DEFAULT 0;

-- 4. Leave management
CREATE TABLE IF NOT EXISTS leave_type (
  id              SERIAL PRIMARY KEY,
  account_id      TEXT NOT NULL,
  name            TEXT NOT NULL,
  paid            BOOLEAN NOT NULL DEFAULT true,
  default_days    INT NOT NULL DEFAULT 0,
  color           TEXT NOT NULL DEFAULT '#1976D2',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_type_account ON leave_type(account_id);
ALTER TABLE leave_type ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS leave_request (
  id              SERIAL PRIMARY KEY,
  account_id      TEXT NOT NULL,
  user_id         INT NOT NULL,
  leave_type_id   INT NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  days            REAL NOT NULL,
  reason          TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  approved_by     INT,
  approved_at     TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leave_request_account ON leave_request(account_id, user_id);
CREATE INDEX IF NOT EXISTS idx_leave_request_status ON leave_request(account_id, status);
CREATE INDEX IF NOT EXISTS idx_leave_request_dates ON leave_request(account_id, start_date, end_date);

ALTER TABLE leave_request ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS leave_balance (
  id              SERIAL PRIMARY KEY,
  account_id      TEXT NOT NULL,
  user_id         INT NOT NULL,
  leave_type_id   INT NOT NULL,
  year            INT NOT NULL,
  total_days      REAL NOT NULL DEFAULT 0,
  used_days       REAL NOT NULL DEFAULT 0,
  UNIQUE(account_id, user_id, leave_type_id, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_balance_account ON leave_balance(account_id, user_id, year);
ALTER TABLE leave_balance ENABLE ROW LEVEL SECURITY;

-- 5. Staff performance view
CREATE OR REPLACE VIEW v_staff_performance AS
SELECT
  p.account_id,
  p.user_id,
  p.firstname || ' ' || COALESCE(p.lastname, '') as staff_name,
  p.role,
  COUNT(DISTINCT o.order_id) as total_orders,
  COALESCE(SUM(o.grand_total), 0) as total_revenue,
  COALESCE(AVG(o.grand_total), 0) as avg_order_value,
  COUNT(DISTINCT DATE(o.date_ordered)) as days_worked,
  COALESCE(SUM(o.grand_total) / NULLIF(COUNT(DISTINCT DATE(o.date_ordered)), 0), 0) as revenue_per_day,
  MAX(o.date_ordered) as last_sale
FROM pos_user p
LEFT JOIN orders o ON o.sales_rep_id = p.user_id
  AND o.account_id = p.account_id
  AND o.is_deleted = false
  AND o.is_paid = true
WHERE p.isactive = 'Y'
GROUP BY p.account_id, p.user_id, p.firstname, p.lastname, p.role;

-- 6. Add tables to data proxy allowlist via comment (reminder for code update)
-- Tables: staff_schedule, staff_break, leave_type, leave_request, leave_balance, v_staff_performance

NOTIFY pgrst, 'reload schema';
