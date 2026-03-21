-- Error logs table for remote debugging
-- Receives error/crash reports from Android terminals via cloud sync
CREATE TABLE IF NOT EXISTS error_logs (
    id BIGSERIAL PRIMARY KEY,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL DEFAULT 0,
    severity TEXT NOT NULL DEFAULT 'ERROR',  -- FATAL, ERROR, WARN, INFO
    tag TEXT NOT NULL,                        -- Source class (e.g. "SplashActivity")
    message TEXT NOT NULL,                    -- Human-readable summary
    stacktrace TEXT,                          -- Full exception trace
    screen TEXT,                              -- Activity/Fragment name
    user_id INTEGER DEFAULT 0,
    user_name TEXT,
    store_id INTEGER DEFAULT 0,
    terminal_id INTEGER DEFAULT 0,
    device_id TEXT,
    app_version TEXT,
    os_version TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for querying by account and recency
CREATE INDEX idx_error_logs_account_id ON error_logs(account_id);
CREATE INDEX idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_severity ON error_logs(severity);

-- RLS: only the owning account can read its own error logs
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account owners can read their error logs"
    ON error_logs FOR SELECT
    USING (account_id = auth.uid());

-- Service role can insert (from API sync endpoint)
CREATE POLICY "Service role can insert error logs"
    ON error_logs FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Service role can delete error logs"
    ON error_logs FOR DELETE
    USING (true);
