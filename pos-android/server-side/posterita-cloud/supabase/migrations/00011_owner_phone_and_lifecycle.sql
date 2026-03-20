-- ============================================================
-- Owner phone onboarding + sales lifecycle stages
-- - Owners can be identified by phone as well as email
-- - Accounts track commercial type + lifecycle separately from import progress
-- ============================================================

ALTER TABLE owner
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_phone_unique
    ON owner(phone)
    WHERE phone IS NOT NULL AND BTRIM(phone) <> '';

ALTER TABLE account
    ALTER COLUMN type DROP DEFAULT,
    ALTER COLUMN type SET DEFAULT 'trial';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'account_type_check'
    ) THEN
        ALTER TABLE account DROP CONSTRAINT account_type_check;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'account_status_check'
    ) THEN
        ALTER TABLE account DROP CONSTRAINT account_status_check;
    END IF;
END;
$$;

UPDATE account
SET type = CASE
    WHEN account_id = 'demo_account' THEN 'demo'
    WHEN COALESCE(type, '') = 'demo' THEN 'demo'
    WHEN COALESCE(type, '') = 'live' THEN 'live'
    ELSE 'trial'
END;

UPDATE account
SET status = CASE
    WHEN account_id = 'demo_account' THEN 'testing'
    WHEN COALESCE(status, '') = 'in_progress' THEN 'in_progress'
    WHEN COALESCE(status, '') = 'failed' THEN 'failed'
    WHEN COALESCE(status, '') = 'archived' THEN 'archived'
    WHEN COALESCE(status, '') = 'active' THEN 'active'
    WHEN COALESCE(status, '') = 'onboarding' THEN 'onboarding'
    WHEN COALESCE(status, '') = 'testing' THEN 'testing'
    WHEN COALESCE(status, '') = 'ready' AND type = 'live' THEN 'active'
    WHEN COALESCE(status, '') = 'ready' THEN 'testing'
    WHEN COALESCE(status, '') = 'draft' AND type = 'live' THEN 'onboarding'
    WHEN COALESCE(status, '') = 'draft' THEN 'draft'
    ELSE CASE
        WHEN type = 'live' THEN 'onboarding'
        WHEN type = 'demo' THEN 'testing'
        ELSE 'testing'
    END
END;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'account_type_check'
    ) THEN
        ALTER TABLE account DROP CONSTRAINT account_type_check;
    END IF;

    ALTER TABLE account
        ADD CONSTRAINT account_type_check
        CHECK (type IN ('demo', 'trial', 'live'));

    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'account_status_check'
    ) THEN
        ALTER TABLE account DROP CONSTRAINT account_status_check;
    END IF;

    ALTER TABLE account
        ADD CONSTRAINT account_status_check
        CHECK (status IN ('draft', 'in_progress', 'testing', 'onboarding', 'active', 'failed', 'archived'));
END;
$$;
