-- Add scenario test columns to ci_report
ALTER TABLE ci_report ADD COLUMN IF NOT EXISTS scenario_passed  INT DEFAULT 0;
ALTER TABLE ci_report ADD COLUMN IF NOT EXISTS scenario_failed  INT DEFAULT 0;
ALTER TABLE ci_report ADD COLUMN IF NOT EXISTS scenario_files   INT DEFAULT 0;
ALTER TABLE ci_report ADD COLUMN IF NOT EXISTS scenario_details JSONB;  -- per-file results
ALTER TABLE ci_report ADD COLUMN IF NOT EXISTS smoke_passed     INT DEFAULT 0;
ALTER TABLE ci_report ADD COLUMN IF NOT EXISTS smoke_failed     INT DEFAULT 0;
ALTER TABLE ci_report ADD COLUMN IF NOT EXISTS duration_ms      INT DEFAULT 0;

NOTIFY pgrst, 'reload schema';
