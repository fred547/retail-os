-- Webhook integration platform
-- Allows merchants to subscribe to events (order.created, product.updated, etc.)
-- and receive HTTP POST callbacks with HMAC-signed payloads.

CREATE TABLE IF NOT EXISTS webhook_subscription (
  id              SERIAL PRIMARY KEY,
  account_id      TEXT NOT NULL,
  url             TEXT NOT NULL,
  events          TEXT[] NOT NULL DEFAULT '{}',
  secret          TEXT NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_triggered  TIMESTAMPTZ,
  failure_count   INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_webhook_sub_account ON webhook_subscription(account_id);
CREATE INDEX IF NOT EXISTS idx_webhook_sub_active ON webhook_subscription(account_id, is_active) WHERE is_active = true;

ALTER TABLE webhook_subscription ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_sub_policy ON webhook_subscription
  USING (account_id = current_setting('request.jwt.claim.account_id', true))
  WITH CHECK (account_id = current_setting('request.jwt.claim.account_id', true));

CREATE TABLE IF NOT EXISTS webhook_log (
  id              SERIAL PRIMARY KEY,
  subscription_id INT REFERENCES webhook_subscription(id) ON DELETE CASCADE,
  account_id      TEXT NOT NULL,
  event           TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  status          TEXT NOT NULL DEFAULT 'pending',
  status_code     INT,
  response_body   TEXT,
  attempts        INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_webhook_log_sub ON webhook_log(subscription_id);
CREATE INDEX IF NOT EXISTS idx_webhook_log_account ON webhook_log(account_id, created_at DESC);

ALTER TABLE webhook_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY webhook_log_policy ON webhook_log
  USING (account_id = current_setting('request.jwt.claim.account_id', true))
  WITH CHECK (account_id = current_setting('request.jwt.claim.account_id', true));

-- Notify PostgREST to pick up new tables
NOTIFY pgrst, 'reload schema';
