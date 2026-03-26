-- Promotions Engine
-- Auto-apply, time-based, buy-X-get-Y, promo codes with rules

CREATE TABLE IF NOT EXISTS promotion (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(account_id),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('percentage_off', 'fixed_off', 'buy_x_get_y', 'promo_code')),
    -- Discount values
    discount_value REAL NOT NULL DEFAULT 0,       -- percentage (10 = 10%) or fixed amount
    buy_quantity INTEGER,                          -- for buy_x_get_y: buy this many
    get_quantity INTEGER,                          -- for buy_x_get_y: get this many free
    -- Scope
    applies_to TEXT NOT NULL DEFAULT 'order' CHECK (applies_to IN ('order', 'product', 'category')),
    product_ids JSONB DEFAULT '[]',               -- specific products (empty = all)
    category_ids JSONB DEFAULT '[]',              -- specific categories (empty = all)
    -- Conditions
    min_order_amount REAL,                         -- minimum order total to qualify
    max_discount_amount REAL,                      -- cap on discount (for percentage)
    promo_code TEXT,                               -- NULL = auto-apply, non-NULL = code required
    max_uses INTEGER,                              -- NULL = unlimited
    max_uses_per_customer INTEGER,                 -- NULL = unlimited
    -- Schedule
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    days_of_week JSONB DEFAULT '[1,2,3,4,5,6,7]',
    start_time TIME,                               -- e.g., happy hour 17:00
    end_time TIME,                                 -- e.g., happy hour 19:00
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    store_id INTEGER NOT NULL DEFAULT 0,           -- 0 = all stores
    priority INTEGER NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usage tracking
CREATE TABLE IF NOT EXISTS promotion_usage (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(account_id),
    promotion_id INTEGER NOT NULL,
    order_id INTEGER,
    customer_id INTEGER,
    discount_applied REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE promotion ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_usage ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_promotion_account ON promotion(account_id);
CREATE INDEX idx_promotion_active ON promotion(account_id, is_active) WHERE is_deleted = false;
CREATE INDEX idx_promotion_code ON promotion(account_id, promo_code) WHERE promo_code IS NOT NULL;
CREATE INDEX idx_promo_usage_promo ON promotion_usage(promotion_id);
CREATE INDEX idx_promo_usage_customer ON promotion_usage(account_id, customer_id);
