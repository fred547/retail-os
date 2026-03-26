-- Customer Loyalty System
-- Points earned on purchase, redeemed at POS, configurable per account

-- Loyalty configuration per account
CREATE TABLE IF NOT EXISTS loyalty_config (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(account_id),
    points_per_currency REAL NOT NULL DEFAULT 1,        -- points earned per 1 currency unit spent
    redemption_rate REAL NOT NULL DEFAULT 0.01,          -- currency value of 1 point (100 pts = 1 currency)
    min_redeem_points INTEGER NOT NULL DEFAULT 100,      -- minimum points to redeem
    is_active BOOLEAN NOT NULL DEFAULT true,
    welcome_bonus INTEGER NOT NULL DEFAULT 0,            -- points awarded on first purchase
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(account_id)
);

-- Loyalty transaction log (every earn/redeem/adjust)
CREATE TABLE IF NOT EXISTS loyalty_transaction (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(account_id),
    customer_id INTEGER NOT NULL,
    order_id INTEGER,                                    -- NULL for manual adjustments
    type TEXT NOT NULL CHECK (type IN ('earn', 'redeem', 'adjust', 'welcome', 'expire')),
    points INTEGER NOT NULL,                             -- positive for earn, negative for redeem
    balance_after INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_by INTEGER,                                  -- user_id who triggered
    store_id INTEGER,
    terminal_id INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE loyalty_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transaction ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_loyalty_config_account ON loyalty_config(account_id);
CREATE INDEX idx_loyalty_tx_account ON loyalty_transaction(account_id);
CREATE INDEX idx_loyalty_tx_customer ON loyalty_transaction(account_id, customer_id);
CREATE INDEX idx_loyalty_tx_order ON loyalty_transaction(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_loyalty_tx_created ON loyalty_transaction(created_at DESC);
