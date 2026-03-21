-- One-Time Tokens for Android WebView authentication
-- Android fetches a token via POST /api/auth/ott, appends it to the WebView URL,
-- and middleware validates it to establish a session cookie.

CREATE TABLE IF NOT EXISTS ott_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  account_id TEXT NOT NULL,
  user_id INTEGER NOT NULL,
  user_role TEXT,
  store_id INTEGER,
  terminal_id INTEGER,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ott_tokens_token ON ott_tokens(token) WHERE used = FALSE;

-- Auto-cleanup: expired tokens can be deleted by the API
