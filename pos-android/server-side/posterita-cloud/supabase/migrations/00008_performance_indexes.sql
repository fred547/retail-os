-- Performance indexes for analytics and sync queries
-- These support the dashboard views (v_daily_sales, v_top_products, v_payment_methods)
-- and common sync/lookup patterns.

-- Orders: date-range queries for daily sales, hourly heatmap, payment methods views
CREATE INDEX IF NOT EXISTS idx_orders_date_ordered ON orders (date_ordered);

-- Orders: till-based lookups (close-till summary, terminal status view)
CREATE INDEX IF NOT EXISTS idx_orders_till_id ON orders (till_id);

-- Orders: sync queries (find unsynced orders)
CREATE INDEX IF NOT EXISTS idx_orders_is_sync ON orders (is_sync) WHERE is_sync = false;

-- OrderLine: product-based aggregations (v_top_products view)
CREATE INDEX IF NOT EXISTS idx_orderline_product_id ON orderline (product_id);

-- Customer: phone-based loyalty lookups
CREATE INDEX IF NOT EXISTS idx_customer_phone1 ON customer (phone1) WHERE phone1 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customer_mobile ON customer (mobile) WHERE mobile IS NOT NULL;

-- Payment: order-based lookups and payment method analytics
CREATE INDEX IF NOT EXISTS idx_payment_order_id ON payment (order_id);
CREATE INDEX IF NOT EXISTS idx_payment_date_paid ON payment (date_paid);
