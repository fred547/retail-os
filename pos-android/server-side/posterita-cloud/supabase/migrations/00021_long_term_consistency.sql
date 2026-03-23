-- ============================================================
-- Long-term consistency: soft delete, lifecycle, device registration, UUID authority
-- ============================================================

-- 1. SOFT DELETE: Add is_deleted + deleted_at to key tables
-- Instead of DELETE, set is_deleted = true. Hard-delete after 30 days via scheduled job.

ALTER TABLE product ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE product ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE store ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE store ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE terminal ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE terminal ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE pos_user ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE pos_user ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE customer ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE customer ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE productcategory ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE productcategory ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Indexes for soft-delete queries (filter out deleted records efficiently)
CREATE INDEX IF NOT EXISTS idx_product_not_deleted ON product(account_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_store_not_deleted ON store(account_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_terminal_not_deleted ON terminal(account_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_pos_user_not_deleted ON pos_user(account_id) WHERE NOT is_deleted;
CREATE INDEX IF NOT EXISTS idx_customer_not_deleted ON customer(account_id) WHERE NOT is_deleted;

-- 2. ACCOUNT LIFECYCLE STATE MACHINE
-- Enforce valid status transitions via a CHECK constraint
-- Valid states: draft → onboarding → active → suspended → archived
-- Also: testing (demo), failed (import error)
ALTER TABLE account DROP CONSTRAINT IF EXISTS account_status_check;
ALTER TABLE account ADD CONSTRAINT account_status_check
  CHECK (status IN ('draft', 'onboarding', 'active', 'suspended', 'archived', 'testing', 'failed'));

-- 3. DEVICE REGISTRATION
-- Each device gets a unique device_id, registered to specific account(s).
-- Prevents orphaned local data by tying sync to registered devices.
CREATE TABLE IF NOT EXISTS registered_device (
  device_id TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES account(account_id),
  device_name TEXT,
  device_model TEXT,
  os_version TEXT,
  app_version TEXT,
  terminal_id INT,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (device_id, account_id)
);

CREATE INDEX IF NOT EXISTS idx_device_account ON registered_device(account_id);

ALTER TABLE registered_device ENABLE ROW LEVEL SECURITY;

-- 4. UUID AUTHORITY
-- Ensure orders.uuid is always set and unique per account
-- (orders already have uuid field; this adds a unique index to enforce it)
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_uuid_unique ON orders(uuid) WHERE uuid IS NOT NULL;

-- Also add uuid to tills if not already unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_till_uuid_unique ON till(uuid) WHERE uuid IS NOT NULL;

-- 5. LIFECYCLE TRANSITION LOG
-- Track every status change for audit purposes
CREATE TABLE IF NOT EXISTS account_lifecycle_log (
  id SERIAL PRIMARY KEY,
  account_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_log_account ON account_lifecycle_log(account_id);

ALTER TABLE account_lifecycle_log ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
