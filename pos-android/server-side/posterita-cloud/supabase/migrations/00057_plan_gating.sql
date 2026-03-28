-- 00057_plan_gating.sql
-- Plan gating: trial columns on account + configurable plan_constraint table

-- 1. Add trial columns to account
ALTER TABLE account ADD COLUMN IF NOT EXISTS trial_plan TEXT;
ALTER TABLE account ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
ALTER TABLE account ADD COLUMN IF NOT EXISTS trial_granted_by TEXT;

-- 2. Create plan_constraint table
CREATE TABLE IF NOT EXISTS plan_constraint (
  id BIGSERIAL PRIMARY KEY,
  plan TEXT NOT NULL,
  constraint_key TEXT NOT NULL,
  constraint_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan, constraint_key)
);

ALTER TABLE plan_constraint ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON plan_constraint FOR ALL USING (true) WITH CHECK (true);

-- 3. Seed constraint data
INSERT INTO plan_constraint (plan, constraint_key, constraint_value, description) VALUES
  -- Volume limits
  ('free', 'max_users', '2', 'Max users per store'),
  ('starter', 'max_users', '5', 'Max users per store'),
  ('growth', 'max_users', '15', 'Max users per store'),
  ('business', 'max_users', '50', 'Max users per store'),

  ('free', 'max_terminals', '2', 'Max terminals per store'),
  ('starter', 'max_terminals', '3', 'Max terminals per store'),
  ('growth', 'max_terminals', '10', 'Max terminals per store'),
  ('business', 'max_terminals', '30', 'Max terminals per store'),

  -- Retention
  ('free', 'retention_days', '90', 'Report data retention in days'),
  ('starter', 'retention_days', '365', 'Report data retention in days'),
  ('growth', 'retention_days', '1095', 'Report data retention in days (3 years)'),
  ('business', 'retention_days', '1825', 'Report data retention in days (5 years)'),

  -- Feature flags
  ('free', 'feature_multi_user', 'false', 'Multiple users per store'),
  ('starter', 'feature_multi_user', 'true', 'Multiple users per store'),
  ('growth', 'feature_multi_user', 'true', 'Multiple users per store'),
  ('business', 'feature_multi_user', 'true', 'Multiple users per store'),

  ('free', 'feature_customer_management', 'false', 'Customer database and CRM'),
  ('starter', 'feature_customer_management', 'true', 'Customer database and CRM'),
  ('growth', 'feature_customer_management', 'true', 'Customer database and CRM'),
  ('business', 'feature_customer_management', 'true', 'Customer database and CRM'),

  ('free', 'feature_inventory_tracking', 'false', 'Stock quantity tracking'),
  ('starter', 'feature_inventory_tracking', 'true', 'Stock quantity tracking'),
  ('growth', 'feature_inventory_tracking', 'true', 'Stock quantity tracking'),
  ('business', 'feature_inventory_tracking', 'true', 'Stock quantity tracking'),

  ('free', 'feature_kitchen_printing', 'true', 'Kitchen order printing'),
  ('starter', 'feature_kitchen_printing', 'true', 'Kitchen order printing'),
  ('growth', 'feature_kitchen_printing', 'true', 'Kitchen order printing'),
  ('business', 'feature_kitchen_printing', 'true', 'Kitchen order printing'),

  ('free', 'feature_modifiers', 'false', 'Product modifiers'),
  ('starter', 'feature_modifiers', 'true', 'Product modifiers'),
  ('growth', 'feature_modifiers', 'true', 'Product modifiers'),
  ('business', 'feature_modifiers', 'true', 'Product modifiers'),

  ('free', 'feature_shifts', 'false', 'Shift clock in/out'),
  ('starter', 'feature_shifts', 'true', 'Shift clock in/out'),
  ('growth', 'feature_shifts', 'true', 'Shift clock in/out'),
  ('business', 'feature_shifts', 'true', 'Shift clock in/out'),

  ('free', 'feature_csv_export', 'false', 'CSV data export'),
  ('starter', 'feature_csv_export', 'true', 'CSV data export'),
  ('growth', 'feature_csv_export', 'true', 'CSV data export'),
  ('business', 'feature_csv_export', 'true', 'CSV data export'),

  ('free', 'feature_loyalty', 'false', 'Loyalty points program'),
  ('starter', 'feature_loyalty', 'false', 'Loyalty points program'),
  ('growth', 'feature_loyalty', 'true', 'Loyalty points program'),
  ('business', 'feature_loyalty', 'true', 'Loyalty points program'),

  ('free', 'feature_promotions', 'false', 'Promotions engine'),
  ('starter', 'feature_promotions', 'false', 'Promotions engine'),
  ('growth', 'feature_promotions', 'true', 'Promotions engine'),
  ('business', 'feature_promotions', 'true', 'Promotions engine'),

  ('free', 'feature_restaurant', 'false', 'Restaurant tables and sections'),
  ('starter', 'feature_restaurant', 'false', 'Restaurant tables and sections'),
  ('growth', 'feature_restaurant', 'true', 'Restaurant tables and sections'),
  ('business', 'feature_restaurant', 'true', 'Restaurant tables and sections'),

  ('free', 'feature_ai_import', 'false', 'AI-powered product import'),
  ('starter', 'feature_ai_import', 'false', 'AI-powered product import'),
  ('growth', 'feature_ai_import', 'true', 'AI-powered product import'),
  ('business', 'feature_ai_import', 'true', 'AI-powered product import'),

  ('free', 'feature_suppliers', 'false', 'Supplier and purchase order management'),
  ('starter', 'feature_suppliers', 'false', 'Supplier and purchase order management'),
  ('growth', 'feature_suppliers', 'true', 'Supplier and purchase order management'),
  ('business', 'feature_suppliers', 'true', 'Supplier and purchase order management'),

  ('free', 'feature_quotations', 'false', 'Quotation creation and PDF generation'),
  ('starter', 'feature_quotations', 'false', 'Quotation creation and PDF generation'),
  ('growth', 'feature_quotations', 'true', 'Quotation creation and PDF generation'),
  ('business', 'feature_quotations', 'true', 'Quotation creation and PDF generation'),

  ('free', 'feature_tags', 'false', 'Product/customer/order tagging'),
  ('starter', 'feature_tags', 'false', 'Product/customer/order tagging'),
  ('growth', 'feature_tags', 'true', 'Product/customer/order tagging'),
  ('business', 'feature_tags', 'true', 'Product/customer/order tagging'),

  ('free', 'feature_analytics', 'false', 'Advanced analytics and reports'),
  ('starter', 'feature_analytics', 'false', 'Advanced analytics and reports'),
  ('growth', 'feature_analytics', 'true', 'Advanced analytics and reports'),
  ('business', 'feature_analytics', 'true', 'Advanced analytics and reports'),

  ('free', 'feature_delivery', 'false', 'Delivery tracking and management'),
  ('starter', 'feature_delivery', 'false', 'Delivery tracking and management'),
  ('growth', 'feature_delivery', 'true', 'Delivery tracking and management'),
  ('business', 'feature_delivery', 'true', 'Delivery tracking and management'),

  ('free', 'feature_inventory_counts', 'false', 'Inventory count sessions'),
  ('starter', 'feature_inventory_counts', 'false', 'Inventory count sessions'),
  ('growth', 'feature_inventory_counts', 'true', 'Inventory count sessions'),
  ('business', 'feature_inventory_counts', 'true', 'Inventory count sessions'),

  ('free', 'feature_serialized_items', 'false', 'VIN/IMEI/serial number tracking'),
  ('starter', 'feature_serialized_items', 'false', 'VIN/IMEI/serial number tracking'),
  ('growth', 'feature_serialized_items', 'false', 'VIN/IMEI/serial number tracking'),
  ('business', 'feature_serialized_items', 'true', 'VIN/IMEI/serial number tracking'),

  ('free', 'feature_warehouse', 'false', 'Warehouse management'),
  ('starter', 'feature_warehouse', 'false', 'Warehouse management'),
  ('growth', 'feature_warehouse', 'false', 'Warehouse management'),
  ('business', 'feature_warehouse', 'true', 'Warehouse management'),

  ('free', 'feature_xero', 'false', 'Xero accounting integration'),
  ('starter', 'feature_xero', 'false', 'Xero accounting integration'),
  ('growth', 'feature_xero', 'false', 'Xero accounting integration'),
  ('business', 'feature_xero', 'true', 'Xero accounting integration'),

  ('free', 'feature_webhooks', 'false', 'Webhook subscriptions'),
  ('starter', 'feature_webhooks', 'false', 'Webhook subscriptions'),
  ('growth', 'feature_webhooks', 'false', 'Webhook subscriptions'),
  ('business', 'feature_webhooks', 'true', 'Webhook subscriptions'),

  ('free', 'feature_tower_control', 'false', 'Tower control monitoring dashboard'),
  ('starter', 'feature_tower_control', 'false', 'Tower control monitoring dashboard'),
  ('growth', 'feature_tower_control', 'false', 'Tower control monitoring dashboard'),
  ('business', 'feature_tower_control', 'true', 'Tower control monitoring dashboard'),

  ('free', 'feature_staff_scheduling', 'false', 'Staff scheduling, timesheets, and leave'),
  ('starter', 'feature_staff_scheduling', 'false', 'Staff scheduling, timesheets, and leave'),
  ('growth', 'feature_staff_scheduling', 'false', 'Staff scheduling, timesheets, and leave'),
  ('business', 'feature_staff_scheduling', 'true', 'Staff scheduling, timesheets, and leave'),

  ('free', 'feature_qr_actions', 'false', 'QR code scan actions'),
  ('starter', 'feature_qr_actions', 'false', 'QR code scan actions'),
  ('growth', 'feature_qr_actions', 'false', 'QR code scan actions'),
  ('business', 'feature_qr_actions', 'true', 'QR code scan actions')

ON CONFLICT (plan, constraint_key) DO NOTHING;
