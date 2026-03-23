-- Drop cross-tenant FK constraints that cause issues in multi-tenant setup
-- These FKs reference globally-shared auto-increment PKs (store_id, terminal_id, product_id)
-- which collide across accounts (e.g., store_id=1 exists for multiple accounts).
--
-- Keeping: account_id FKs (correctly scoped), order→till FK, orderline→order FK, payment→order FK

-- till → store/terminal (cross-tenant)
ALTER TABLE till DROP CONSTRAINT IF EXISTS till_store_id_fkey;
ALTER TABLE till DROP CONSTRAINT IF EXISTS till_terminal_id_fkey;

-- restaurant_table → store (cross-tenant)
ALTER TABLE restaurant_table DROP CONSTRAINT IF EXISTS restaurant_table_store_id_fkey;

-- sequence → terminal (cross-tenant)
ALTER TABLE sequence DROP CONSTRAINT IF EXISTS sequence_terminal_id_fkey;

-- modifier → product (cross-tenant)
ALTER TABLE modifier DROP CONSTRAINT IF EXISTS modifier_product_id_fkey;

-- orderline → product (cross-tenant)
ALTER TABLE orderline DROP CONSTRAINT IF EXISTS orderline_product_id_fkey;

-- orders → store/terminal (already dropped, ensure clean)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_store_id_fkey;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_terminal_id_fkey;

NOTIFY pgrst, 'reload schema';
