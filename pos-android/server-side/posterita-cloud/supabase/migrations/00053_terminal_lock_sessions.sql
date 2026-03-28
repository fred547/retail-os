-- Terminal lock modes + device sessions
-- exploration: auto-release on terminal switch (owner testing)
-- production: permanent lock, requires explicit unlock (deployed store)

-- Add lock_mode to terminal
ALTER TABLE terminal ADD COLUMN IF NOT EXISTS lock_mode TEXT NOT NULL DEFAULT 'exploration'
    CHECK (lock_mode IN ('exploration', 'production'));

-- Device sessions: tracks who is using what terminal right now
CREATE TABLE IF NOT EXISTS device_session (
    id BIGSERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(account_id),
    device_id TEXT NOT NULL,
    terminal_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    user_name TEXT,
    store_id INTEGER NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    end_reason TEXT,              -- logout, timeout, takeover, switch
    is_active BOOLEAN NOT NULL DEFAULT true,
    till_uuid TEXT
);

ALTER TABLE device_session ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_device_session_active ON device_session(account_id, is_active) WHERE is_active = true;
CREATE INDEX idx_device_session_device ON device_session(device_id, account_id);
CREATE INDEX idx_device_session_terminal ON device_session(terminal_id, account_id);

NOTIFY pgrst, 'reload schema';
