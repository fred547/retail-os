-- ============================================================
-- Row Level Security (RLS) — Multi-tenant isolation
-- Each user can only see data belonging to their account
-- ============================================================

-- Helper: get current user's account_id from JWT or pos_user table
CREATE OR REPLACE FUNCTION public.get_account_id()
RETURNS TEXT AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claims', true)::json->>'account_id',
        (SELECT account_id FROM pos_user WHERE auth_uid = auth.uid() LIMIT 1)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claims', true)::json->>'role',
        (SELECT role FROM pos_user WHERE auth_uid = auth.uid() LIMIT 1)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- Enable RLS on all tenant-scoped tables
-- ============================================================
ALTER TABLE account ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE store ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminal ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax ENABLE ROW LEVEL SECURITY;
ALTER TABLE productcategory ENABLE ROW LEVEL SECURITY;
ALTER TABLE discountcode ENABLE ROW LEVEL SECURITY;
ALTER TABLE product ENABLE ROW LEVEL SECURITY;
ALTER TABLE modifier ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE till ENABLE ROW LEVEL SECURITY;
ALTER TABLE till_adjustment ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orderline ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE hold_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE preference ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_loyalty_award ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_consent_update ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_import_job ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES: account-scoped read/write
-- ============================================================

-- Account: users can only see their own account
CREATE POLICY "Users see own account" ON account
    FOR ALL USING (account_id = public.get_account_id());

-- POS Users: see users in same account
CREATE POLICY "Users see same account users" ON pos_user
    FOR SELECT USING (account_id = public.get_account_id());

-- Only owners/admins can manage users
CREATE POLICY "Admins manage users" ON pos_user
    FOR ALL USING (
        account_id = public.get_account_id()
        AND public.get_user_role() IN ('OWNER', 'ADMIN')
    );

-- Generic account-scoped policies for data tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN VALUES
        ('store'), ('terminal'), ('tax'), ('productcategory'),
        ('discountcode'), ('product'), ('modifier'), ('customer'),
        ('till'), ('orders'), ('hold_order'), ('preference'),
        ('integration'), ('printer'), ('sync_log'), ('ai_import_job'),
        ('loyalty_cache'), ('pending_loyalty_award'), ('pending_consent_update')
    LOOP
        -- Read: all authenticated users in same account
        EXECUTE format(
            'CREATE POLICY "Account read %1$s" ON %1$I FOR SELECT USING (account_id = public.get_account_id())',
            t
        );
        -- Write: all authenticated users in same account
        EXECUTE format(
            'CREATE POLICY "Account write %1$s" ON %1$I FOR INSERT WITH CHECK (account_id = public.get_account_id())',
            t
        );
        -- Update: all authenticated users in same account
        EXECUTE format(
            'CREATE POLICY "Account update %1$s" ON %1$I FOR UPDATE USING (account_id = public.get_account_id())',
            t
        );
        -- Delete: only owners/admins
        EXECUTE format(
            'CREATE POLICY "Admin delete %1$s" ON %1$I FOR DELETE USING (account_id = public.get_account_id() AND public.get_user_role() IN (''OWNER'', ''ADMIN''))',
            t
        );
    END LOOP;
END;
$$;

-- Tables without direct account_id (joined through parent)
-- till_adjustment: via till
CREATE POLICY "Account read till_adjustment" ON till_adjustment
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM till WHERE till.till_id = till_adjustment.till_id AND till.account_id = public.get_account_id())
    );
CREATE POLICY "Account write till_adjustment" ON till_adjustment
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM till WHERE till.till_id = till_adjustment.till_id AND till.account_id = public.get_account_id())
    );

-- orderline: via order
CREATE POLICY "Account read orderline" ON orderline
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM orders WHERE orders.order_id = orderline.order_id AND orders.account_id = public.get_account_id())
    );
CREATE POLICY "Account write orderline" ON orderline
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM orders WHERE orders.order_id = orderline.order_id AND orders.account_id = public.get_account_id())
    );

-- payment: via order
CREATE POLICY "Account read payment" ON payment
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM orders WHERE orders.order_id = payment.order_id AND orders.account_id = public.get_account_id())
    );
CREATE POLICY "Account write payment" ON payment
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM orders WHERE orders.order_id = payment.order_id AND orders.account_id = public.get_account_id())
    );

-- restaurant_table: via store
CREATE POLICY "Account read restaurant_table" ON restaurant_table
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM store WHERE store.store_id = restaurant_table.store_id AND store.account_id = public.get_account_id())
    );
CREATE POLICY "Account write restaurant_table" ON restaurant_table
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM store WHERE store.store_id = restaurant_table.store_id AND store.account_id = public.get_account_id())
    );

-- sequence: via terminal
CREATE POLICY "Account read sequence" ON sequence
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM terminal WHERE terminal.terminal_id = sequence.terminal_id AND terminal.account_id = public.get_account_id())
    );
CREATE POLICY "Account write sequence" ON sequence
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM terminal WHERE terminal.terminal_id = sequence.terminal_id AND terminal.account_id = public.get_account_id())
    );

-- ============================================================
-- SERVICE ROLE bypass (for Edge Functions / server-side ops)
-- The service_role key bypasses RLS automatically in Supabase
-- ============================================================
