-- Pool of demo accounts for public demo
-- Visitors get a full read+write demo account from a round-robin pool, tracked by cookie.

CREATE TABLE IF NOT EXISTS demo_pool (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'available',  -- available, claimed, resetting
    claimed_at TIMESTAMPTZ,
    claimed_by_ip TEXT,
    session_token TEXT UNIQUE,                 -- cookie value for the visitor
    expires_at TIMESTAMPTZ,
    last_reset_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT demo_pool_status_check CHECK (status IN ('available', 'claimed', 'resetting'))
);

ALTER TABLE demo_pool ENABLE ROW LEVEL SECURITY;

-- No public access — only service role key (API routes) can read/write
CREATE POLICY "Service role full access on demo_pool"
    ON demo_pool FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_demo_pool_status ON demo_pool (status);
CREATE INDEX IF NOT EXISTS idx_demo_pool_session ON demo_pool (session_token);
CREATE INDEX IF NOT EXISTS idx_demo_pool_expires ON demo_pool (expires_at) WHERE status = 'claimed';
