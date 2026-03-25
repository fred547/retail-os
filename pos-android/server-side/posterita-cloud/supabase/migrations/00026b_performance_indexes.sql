-- Performance indexes to reduce disk I/O
-- Every multi-tenant table needs an index on account_id (used in every query)
-- Plus indexes on common filter/sort columns

-- Core data (hit on every sync)
CREATE INDEX IF NOT EXISTS idx_product_account ON product(account_id);
CREATE INDEX IF NOT EXISTS idx_product_account_updated ON product(account_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_productcategory_account ON productcategory(account_id);
CREATE INDEX IF NOT EXISTS idx_tax_account ON tax(account_id);
CREATE INDEX IF NOT EXISTS idx_modifier_account ON modifier(account_id);
CREATE INDEX IF NOT EXISTS idx_customer_account ON customer(account_id);
CREATE INDEX IF NOT EXISTS idx_preference_account ON preference(account_id);
CREATE INDEX IF NOT EXISTS idx_discountcode_account ON discountcode(account_id);

-- Orders (high volume, queried by sync + web console)
CREATE INDEX IF NOT EXISTS idx_orders_account ON orders(account_id);
CREATE INDEX IF NOT EXISTS idx_orders_account_date ON orders(account_id, date_ordered DESC);
CREATE INDEX IF NOT EXISTS idx_orderline_order ON orderline(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_order ON payment(order_id);

-- Store/Terminal/User (queried on every sync + web console page)
CREATE INDEX IF NOT EXISTS idx_store_account ON store(account_id);
CREATE INDEX IF NOT EXISTS idx_terminal_account ON terminal(account_id);
CREATE INDEX IF NOT EXISTS idx_terminal_store ON terminal(store_id);
CREATE INDEX IF NOT EXISTS idx_pos_user_account ON pos_user(account_id);
CREATE INDEX IF NOT EXISTS idx_pos_user_auth ON pos_user(auth_uid);

-- Till (synced frequently)
CREATE INDEX IF NOT EXISTS idx_till_account ON till(account_id);

-- Restaurant (queried by sync filtered on store_id)
CREATE INDEX IF NOT EXISTS idx_restaurant_table_store ON restaurant_table(store_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_table_account ON restaurant_table(account_id);
CREATE INDEX IF NOT EXISTS idx_table_section_account ON table_section(account_id);
CREATE INDEX IF NOT EXISTS idx_preparation_station_account ON preparation_station(account_id);
CREATE INDEX IF NOT EXISTS idx_category_station_mapping_account ON category_station_mapping(account_id);

-- Printer
CREATE INDEX IF NOT EXISTS idx_printer_account ON printer(account_id);

-- Error logs (queried by platform, cron jobs, filtered by severity/status/created_at)
CREATE INDEX IF NOT EXISTS idx_error_logs_account ON error_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_status_severity ON error_logs(status, severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created ON error_logs(created_at DESC);

-- Sync request log (queried by platform monitor, cron cleanup)
CREATE INDEX IF NOT EXISTS idx_sync_request_log_account ON sync_request_log(account_id);
CREATE INDEX IF NOT EXISTS idx_sync_request_log_request_at ON sync_request_log(request_at DESC);

-- Account (queried by platform, lifecycle, type/status filters)
CREATE INDEX IF NOT EXISTS idx_account_owner ON account(owner_id);
CREATE INDEX IF NOT EXISTS idx_account_type_status ON account(type, status);

-- Registered device
CREATE INDEX IF NOT EXISTS idx_registered_device_account ON registered_device(account_id);

-- Inventory
CREATE INDEX IF NOT EXISTS idx_inventory_session_account ON inventory_count_session(account_id);
CREATE INDEX IF NOT EXISTS idx_inventory_entry_session ON inventory_count_entry(session_id);

-- Intake
CREATE INDEX IF NOT EXISTS idx_intake_batch_account ON intake_batch(account_id);
CREATE INDEX IF NOT EXISTS idx_intake_item_batch ON intake_item(batch_id);

-- Lifecycle log
CREATE INDEX IF NOT EXISTS idx_lifecycle_log_account ON account_lifecycle_log(account_id);

NOTIFY pgrst, 'reload schema';
