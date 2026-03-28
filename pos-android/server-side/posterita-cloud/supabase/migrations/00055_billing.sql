-- 00055_billing.sql
-- Paddle billing integration: plan columns on account + billing event log

-- Add billing columns to account table
ALTER TABLE account ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free'
  CHECK (plan IN ('free', 'starter', 'growth', 'business'));

ALTER TABLE account ADD COLUMN IF NOT EXISTS billing_region TEXT DEFAULT 'developing'
  CHECK (billing_region IN ('developing', 'emerging', 'developed'));

ALTER TABLE account ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT;

ALTER TABLE account ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT;

ALTER TABLE account ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'none'
  CHECK (subscription_status IN ('none', 'trialing', 'active', 'past_due', 'paused', 'canceled'));

ALTER TABLE account ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Billing event log for webhook audit trail
CREATE TABLE IF NOT EXISTS billing_event (
  id BIGSERIAL PRIMARY KEY,
  account_id TEXT REFERENCES account(account_id),
  event_type TEXT NOT NULL,
  paddle_event_id TEXT UNIQUE,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_event_account_created
  ON billing_event (account_id, created_at DESC);

-- Enable RLS
ALTER TABLE billing_event ENABLE ROW LEVEL SECURITY;
