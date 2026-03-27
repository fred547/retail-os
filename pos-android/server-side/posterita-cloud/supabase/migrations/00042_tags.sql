-- Tags: flexible cross-cutting product/customer/order classification for reporting
-- Tag groups (Season, Margin, Dietary) contain tags (Summer, High, Vegan)
-- Many-to-many junctions for products, customers, and orders

-- Tag Groups
CREATE TABLE IF NOT EXISTS tag_group (
    tag_group_id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(account_id),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#6B7280',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(account_id, name)
);

-- Tags
CREATE TABLE IF NOT EXISTS tag (
    tag_id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(account_id),
    tag_group_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    color TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(account_id, tag_group_id, name)
);

-- Junction: product <-> tag
CREATE TABLE IF NOT EXISTS product_tag (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    product_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(product_id, tag_id)
);

-- Junction: customer <-> tag
CREATE TABLE IF NOT EXISTS customer_tag (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    customer_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(customer_id, tag_id)
);

-- Junction: order <-> tag
CREATE TABLE IF NOT EXISTS order_tag (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    order_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(order_id, tag_id)
);

-- RLS
ALTER TABLE tag_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_tag ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_tag_group_account ON tag_group(account_id);
CREATE INDEX idx_tag_group_active ON tag_group(account_id, is_active) WHERE is_deleted = false;
CREATE INDEX idx_tag_account ON tag(account_id);
CREATE INDEX idx_tag_group_ref ON tag(tag_group_id);
CREATE INDEX idx_tag_active ON tag(account_id, is_active) WHERE is_deleted = false;
CREATE INDEX idx_product_tag_product ON product_tag(product_id);
CREATE INDEX idx_product_tag_tag ON product_tag(tag_id);
CREATE INDEX idx_product_tag_account ON product_tag(account_id);
CREATE INDEX idx_customer_tag_customer ON customer_tag(customer_id);
CREATE INDEX idx_customer_tag_tag ON customer_tag(tag_id);
CREATE INDEX idx_order_tag_order ON order_tag(order_id);
CREATE INDEX idx_order_tag_tag ON order_tag(tag_id);

NOTIFY pgrst, 'reload schema';
