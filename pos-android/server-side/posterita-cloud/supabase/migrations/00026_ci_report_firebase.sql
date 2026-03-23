-- ============================================================
-- Add Firebase Test Lab columns to ci_report
-- ============================================================
ALTER TABLE ci_report ADD COLUMN IF NOT EXISTS firebase_passed  INT DEFAULT 0;
ALTER TABLE ci_report ADD COLUMN IF NOT EXISTS firebase_failed  INT DEFAULT 0;
ALTER TABLE ci_report ADD COLUMN IF NOT EXISTS firebase_status  TEXT;  -- pass/fail/timeout/skipped
ALTER TABLE ci_report ADD COLUMN IF NOT EXISTS source           TEXT DEFAULT 'ci';  -- ci/local/manual

NOTIFY pgrst, 'reload schema';
