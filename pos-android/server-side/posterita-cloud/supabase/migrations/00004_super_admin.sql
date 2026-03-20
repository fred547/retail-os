-- ============================================================
-- SUPER ADMIN — Platform-level admin (Posterita support team)
-- Can see ALL accounts, impersonate any account
-- ============================================================

-- Super admin table — platform-level users
CREATE TABLE super_admin (
    id           SERIAL PRIMARY KEY,
    auth_uid     UUID REFERENCES auth.users(id) UNIQUE,
    email        TEXT NOT NULL UNIQUE,
    name         TEXT,
    is_active    BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Track which account a super admin is currently impersonating
CREATE TABLE super_admin_session (
    id           SERIAL PRIMARY KEY,
    super_admin_id INT REFERENCES super_admin(id),
    account_id   TEXT REFERENCES account(account_id),
    started_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_super_admin_auth ON super_admin(auth_uid);
CREATE INDEX idx_super_session_admin ON super_admin_session(super_admin_id);

-- Helper: check if the current user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM super_admin
        WHERE auth_uid = auth.uid()
        AND is_active = TRUE
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get the account_id a super admin is impersonating (or their own)
-- Falls back to the normal get_account_id() if not a super admin
CREATE OR REPLACE FUNCTION public.get_effective_account_id()
RETURNS TEXT AS $$
    SELECT COALESCE(
        -- If super admin, check for impersonation session
        (SELECT s.account_id FROM super_admin_session s
         JOIN super_admin sa ON sa.id = s.super_admin_id
         WHERE sa.auth_uid = auth.uid() AND sa.is_active = TRUE
         ORDER BY s.started_at DESC LIMIT 1),
        -- Otherwise fall back to normal account resolution
        public.get_account_id()
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- Update ALL RLS policies to allow super admin access
-- ============================================================

-- Drop and recreate the account policy to include super admin
DROP POLICY IF EXISTS "Users see own account" ON account;
CREATE POLICY "Users see own account" ON account
    FOR ALL USING (
        account_id = public.get_account_id()
        OR public.is_super_admin()
    );

-- Super admin can see all pos_users
DROP POLICY IF EXISTS "Users see same account users" ON pos_user;
CREATE POLICY "Users see same account users" ON pos_user
    FOR SELECT USING (
        account_id = public.get_account_id()
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS "Admins manage users" ON pos_user;
CREATE POLICY "Admins manage users" ON pos_user
    FOR ALL USING (
        (account_id = public.get_account_id() AND public.get_user_role() IN ('OWNER', 'ADMIN'))
        OR public.is_super_admin()
    );

-- Update generic account-scoped policies to include super admin bypass
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
        -- Drop existing policies
        EXECUTE format('DROP POLICY IF EXISTS "Account read %1$s" ON %1$I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Account write %1$s" ON %1$I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Account update %1$s" ON %1$I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Admin delete %1$s" ON %1$I', t);

        -- Recreate with super admin bypass
        EXECUTE format(
            'CREATE POLICY "Account read %1$s" ON %1$I FOR SELECT USING (account_id = public.get_effective_account_id() OR public.is_super_admin())',
            t
        );
        EXECUTE format(
            'CREATE POLICY "Account write %1$s" ON %1$I FOR INSERT WITH CHECK (account_id = public.get_effective_account_id() OR public.is_super_admin())',
            t
        );
        EXECUTE format(
            'CREATE POLICY "Account update %1$s" ON %1$I FOR UPDATE USING (account_id = public.get_effective_account_id() OR public.is_super_admin())',
            t
        );
        EXECUTE format(
            'CREATE POLICY "Admin delete %1$s" ON %1$I FOR DELETE USING ((account_id = public.get_effective_account_id() AND public.get_user_role() IN (''OWNER'', ''ADMIN'')) OR public.is_super_admin())',
            t
        );
    END LOOP;
END;
$$;

-- Update joined-table policies for super admin
DROP POLICY IF EXISTS "Account read till_adjustment" ON till_adjustment;
DROP POLICY IF EXISTS "Account write till_adjustment" ON till_adjustment;
CREATE POLICY "Account read till_adjustment" ON till_adjustment
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM till WHERE till.till_id = till_adjustment.till_id AND till.account_id = public.get_effective_account_id())
        OR public.is_super_admin()
    );
CREATE POLICY "Account write till_adjustment" ON till_adjustment
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM till WHERE till.till_id = till_adjustment.till_id AND till.account_id = public.get_effective_account_id())
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS "Account read orderline" ON orderline;
DROP POLICY IF EXISTS "Account write orderline" ON orderline;
CREATE POLICY "Account read orderline" ON orderline
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM orders WHERE orders.order_id = orderline.order_id AND orders.account_id = public.get_effective_account_id())
        OR public.is_super_admin()
    );
CREATE POLICY "Account write orderline" ON orderline
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM orders WHERE orders.order_id = orderline.order_id AND orders.account_id = public.get_effective_account_id())
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS "Account read payment" ON payment;
DROP POLICY IF EXISTS "Account write payment" ON payment;
CREATE POLICY "Account read payment" ON payment
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM orders WHERE orders.order_id = payment.order_id AND orders.account_id = public.get_effective_account_id())
        OR public.is_super_admin()
    );
CREATE POLICY "Account write payment" ON payment
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM orders WHERE orders.order_id = payment.order_id AND orders.account_id = public.get_effective_account_id())
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS "Account read restaurant_table" ON restaurant_table;
DROP POLICY IF EXISTS "Account write restaurant_table" ON restaurant_table;
CREATE POLICY "Account read restaurant_table" ON restaurant_table
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM store WHERE store.store_id = restaurant_table.store_id AND store.account_id = public.get_effective_account_id())
        OR public.is_super_admin()
    );
CREATE POLICY "Account write restaurant_table" ON restaurant_table
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM store WHERE store.store_id = restaurant_table.store_id AND store.account_id = public.get_effective_account_id())
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS "Account read sequence" ON sequence;
DROP POLICY IF EXISTS "Account write sequence" ON sequence;
CREATE POLICY "Account read sequence" ON sequence
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM terminal WHERE terminal.terminal_id = sequence.terminal_id AND terminal.account_id = public.get_effective_account_id())
        OR public.is_super_admin()
    );
CREATE POLICY "Account write sequence" ON sequence
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM terminal WHERE terminal.terminal_id = sequence.terminal_id AND terminal.account_id = public.get_effective_account_id())
        OR public.is_super_admin()
    );

-- RLS for super_admin tables — only super admins can see these
ALTER TABLE super_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admin_session ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins only" ON super_admin
    FOR ALL USING (public.is_super_admin());

CREATE POLICY "Super admins only sessions" ON super_admin_session
    FOR ALL USING (public.is_super_admin());

-- ============================================================
-- Platform overview view (super admin only)
-- ============================================================
CREATE OR REPLACE VIEW v_platform_overview AS
SELECT
    a.account_id,
    a.businessname,
    a.currency,
    a.isactive,
    a.created_at,
    (SELECT COUNT(*) FROM store s WHERE s.account_id = a.account_id) AS store_count,
    (SELECT COUNT(*) FROM terminal t WHERE t.account_id = a.account_id) AS terminal_count,
    (SELECT COUNT(*) FROM product p WHERE p.account_id = a.account_id AND p.isactive = 'Y') AS product_count,
    (SELECT COUNT(*) FROM orders o WHERE o.account_id = a.account_id) AS order_count,
    (SELECT COALESCE(SUM(o.grand_total), 0) FROM orders o WHERE o.account_id = a.account_id AND o.is_paid = TRUE) AS total_revenue,
    (SELECT COUNT(*) FROM pos_user u WHERE u.account_id = a.account_id AND u.isactive = 'Y') AS user_count,
    (SELECT MAX(o.date_ordered) FROM orders o WHERE o.account_id = a.account_id) AS last_order_at
FROM account a
ORDER BY a.created_at DESC;
