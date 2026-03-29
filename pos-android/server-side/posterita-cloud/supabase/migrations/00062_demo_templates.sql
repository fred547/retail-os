-- Demo pool templates — seed profiles per industry
CREATE TABLE IF NOT EXISTS demo_pool_template (
    id SERIAL PRIMARY KEY,
    industry TEXT NOT NULL,           -- restaurant, retail_fashion, cafe, grocery, electronics, warehouse
    display_name TEXT NOT NULL,       -- "Restaurant & QSR", "Fashion Retail", etc.
    icon TEXT,                        -- emoji for UI
    description TEXT,
    default_currency TEXT DEFAULT 'MUR',
    default_tax_rate REAL DEFAULT 15.0,
    products JSONB NOT NULL,          -- [{name, category, price, cost, image_url, barcode}]
    categories JSONB NOT NULL,        -- [{name, position}]
    modifiers JSONB NOT NULL,         -- [{name, options: [{name, price}]}]
    sample_customers JSONB,           -- [{name, email, phone, city, loyaltypoints}]
    promotions JSONB,                 -- [{name, type, value, code, min_order}]
    store_name_template TEXT,         -- "Demo {industry} Store"
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add template_id to demo_pool
ALTER TABLE demo_pool ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES demo_pool_template(id);
ALTER TABLE demo_pool ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE demo_pool ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'MU';
ALTER TABLE demo_pool ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'MUR';
ALTER TABLE demo_pool ADD COLUMN IF NOT EXISTS heartbeat_at TIMESTAMPTZ;

-- Update expires_at to 2 hours
UPDATE demo_pool SET expires_at = claimed_at + interval '2 hours' WHERE status = 'claimed' AND expires_at IS NOT NULL;
