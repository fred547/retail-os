-- Auto-tag rules: automatically assign tags to products based on rules.
-- No manual tagging needed — rules run on product create/update/sync.

CREATE TABLE IF NOT EXISTS auto_tag_rule (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    name TEXT NOT NULL,                     -- "Beverages → Drinks tag"
    rule_type TEXT NOT NULL DEFAULT 'category',  -- category, price_range, keyword, ai
    -- Condition fields (which products match)
    category_ids JSONB DEFAULT '[]',        -- if product.productcategory_id in this list
    min_price DOUBLE PRECISION,             -- if sellingprice >= this
    max_price DOUBLE PRECISION,             -- if sellingprice <= this
    keyword TEXT,                           -- if product name/description contains this
    -- Action: which tags to apply
    tag_ids JSONB NOT NULL DEFAULT '[]',    -- tag IDs to assign when rule matches
    -- Config
    is_active BOOLEAN NOT NULL DEFAULT true,
    priority INT NOT NULL DEFAULT 0,        -- higher = runs first
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE auto_tag_rule ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_auto_tag_rule_account ON auto_tag_rule (account_id, is_active, is_deleted);

NOTIFY pgrst, 'reload schema';
