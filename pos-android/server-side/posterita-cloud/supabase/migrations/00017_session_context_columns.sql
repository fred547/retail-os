-- ============================================================
-- Add store_id and terminal_id to owner_account_session
-- Allows the session to carry full context: account + store + terminal
-- ============================================================

ALTER TABLE owner_account_session
    ADD COLUMN IF NOT EXISTS store_id INT,
    ADD COLUMN IF NOT EXISTS terminal_id INT;

-- Notify PostgREST to pick up the schema change
NOTIFY pgrst, 'reload schema';
