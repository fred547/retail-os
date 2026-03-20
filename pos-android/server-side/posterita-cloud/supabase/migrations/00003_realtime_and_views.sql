-- ============================================================
-- Enable Realtime for tables that terminals need to sync
-- ============================================================

-- Products, categories, taxes — push updates to all terminals
ALTER PUBLICATION supabase_realtime ADD TABLE product;
ALTER PUBLICATION supabase_realtime ADD TABLE productcategory;
ALTER PUBLICATION supabase_realtime ADD TABLE tax;
ALTER PUBLICATION supabase_realtime ADD TABLE modifier;
ALTER PUBLICATION supabase_realtime ADD TABLE customer;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE restaurant_table;
ALTER PUBLICATION supabase_realtime ADD TABLE preference;

-- ============================================================
-- DASHBOARD VIEWS (for the admin frontend)
-- ============================================================

-- Daily sales summary
CREATE OR REPLACE VIEW v_daily_sales AS
SELECT
    o.account_id,
    o.store_id,
    s.name AS store_name,
    DATE(o.date_ordered) AS sale_date,
    COUNT(o.order_id) AS total_orders,
    SUM(o.grand_total) AS total_revenue,
    SUM(o.tax_total) AS total_tax,
    SUM(o.qty_total) AS total_items,
    SUM(o.tips) AS total_tips,
    AVG(o.grand_total) AS avg_order_value
FROM orders o
JOIN store s ON s.store_id = o.store_id
WHERE o.is_paid = TRUE
GROUP BY o.account_id, o.store_id, s.name, DATE(o.date_ordered);

-- Top selling products
CREATE OR REPLACE VIEW v_top_products AS
SELECT
    o.account_id,
    ol.product_id,
    ol.productname,
    SUM(ol.qtyentered) AS total_qty,
    SUM(ol.lineamt) AS total_revenue,
    COUNT(DISTINCT o.order_id) AS order_count
FROM orderline ol
JOIN orders o ON o.order_id = ol.order_id
WHERE o.is_paid = TRUE
GROUP BY o.account_id, ol.product_id, ol.productname;

-- Hourly sales heatmap
CREATE OR REPLACE VIEW v_hourly_sales AS
SELECT
    o.account_id,
    o.store_id,
    EXTRACT(DOW FROM o.date_ordered) AS day_of_week,
    EXTRACT(HOUR FROM o.date_ordered) AS hour_of_day,
    COUNT(o.order_id) AS order_count,
    SUM(o.grand_total) AS total_revenue
FROM orders o
WHERE o.is_paid = TRUE
GROUP BY o.account_id, o.store_id,
    EXTRACT(DOW FROM o.date_ordered),
    EXTRACT(HOUR FROM o.date_ordered);

-- Payment method breakdown
CREATE OR REPLACE VIEW v_payment_methods AS
SELECT
    o.account_id,
    o.store_id,
    DATE(p.date_paid) AS payment_date,
    p.payment_type,
    COUNT(p.payment_id) AS payment_count,
    SUM(p.amount) AS total_amount
FROM payment p
JOIN orders o ON o.order_id = p.order_id
GROUP BY o.account_id, o.store_id, DATE(p.date_paid), p.payment_type;

-- Products needing price review (for owner dashboard)
CREATE OR REPLACE VIEW v_price_review AS
SELECT
    p.product_id,
    p.account_id,
    p.name AS product_name,
    p.sellingprice,
    p.image,
    p.price_set_by,
    u.firstname || ' ' || u.lastname AS set_by_name,
    p.updated_at AS price_set_at,
    pc.name AS category_name
FROM product p
LEFT JOIN pos_user u ON u.user_id = p.price_set_by
LEFT JOIN productcategory pc ON pc.productcategory_id = p.productcategory_id
WHERE p.needs_price_review = 'Y'
AND p.isactive = 'Y';

-- Terminal status overview
CREATE OR REPLACE VIEW v_terminal_status AS
SELECT
    t.terminal_id,
    t.account_id,
    t.store_id,
    s.name AS store_name,
    t.name AS terminal_name,
    t.isactive,
    tl.till_id AS current_till_id,
    tl.date_opened AS till_opened,
    tl.grand_total AS till_total,
    (SELECT COUNT(*) FROM orders o
     WHERE o.terminal_id = t.terminal_id
     AND o.is_sync = FALSE) AS unsynced_orders
FROM terminal t
JOIN store s ON s.store_id = t.store_id
LEFT JOIN LATERAL (
    SELECT * FROM till
    WHERE till.terminal_id = t.terminal_id
    AND till.date_closed IS NULL
    ORDER BY till.date_opened DESC
    LIMIT 1
) tl ON TRUE;

-- ============================================================
-- FUNCTIONS for dashboard aggregation
-- ============================================================

-- Get sales summary for a date range
CREATE OR REPLACE FUNCTION get_sales_summary(
    p_account_id TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_store_id INT DEFAULT NULL
)
RETURNS TABLE (
    total_orders BIGINT,
    total_revenue DOUBLE PRECISION,
    total_tax DOUBLE PRECISION,
    total_tips DOUBLE PRECISION,
    avg_order_value DOUBLE PRECISION,
    total_items DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(o.order_id),
        COALESCE(SUM(o.grand_total), 0),
        COALESCE(SUM(o.tax_total), 0),
        COALESCE(SUM(o.tips), 0),
        COALESCE(AVG(o.grand_total), 0),
        COALESCE(SUM(o.qty_total), 0)
    FROM orders o
    WHERE o.account_id = p_account_id
    AND o.is_paid = TRUE
    AND DATE(o.date_ordered) BETWEEN p_start_date AND p_end_date
    AND (p_store_id IS NULL OR o.store_id = p_store_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
