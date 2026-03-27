-- Integration connections: OAuth tokens for external services (Xero, QuickBooks, etc.)
-- One connection per provider per account

CREATE TABLE IF NOT EXISTS integration_connection (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(account_id),
    provider TEXT NOT NULL,                    -- 'xero', 'quickbooks', 'shopify'
    access_token TEXT,                         -- OAuth access token
    refresh_token TEXT,                        -- OAuth refresh token
    token_expires_at TIMESTAMPTZ,              -- when access_token expires
    tenant_id TEXT,                            -- provider-specific org/tenant ID
    org_name TEXT,                             -- display name of connected org
    settings JSONB NOT NULL DEFAULT '{}',      -- sync preferences
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disconnected', 'error')),
    last_sync_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(account_id, provider)
);

-- Integration event log: audit trail of every push/pull to external systems
CREATE TABLE IF NOT EXISTS integration_event_log (
    id BIGSERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    provider TEXT NOT NULL,
    event_type TEXT NOT NULL,                  -- order.paid, refund.created, daily_summary
    reference_id TEXT,                         -- order UUID, till ID, etc.
    external_id TEXT,                          -- Xero invoice ID, etc.
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    request_body JSONB,
    response_body JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE integration_connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_event_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_integration_conn_account ON integration_connection(account_id);
CREATE INDEX idx_integration_conn_provider ON integration_connection(account_id, provider);
CREATE INDEX idx_integration_event_account ON integration_event_log(account_id, provider);
CREATE INDEX idx_integration_event_ref ON integration_event_log(reference_id) WHERE reference_id IS NOT NULL;
CREATE INDEX idx_integration_event_status ON integration_event_log(status) WHERE status = 'pending';

NOTIFY pgrst, 'reload schema';
