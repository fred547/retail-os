-- Nested categories: support 3-level hierarchy (main > sub > sub-sub)
-- Migration 00041

-- Add parent reference and level indicator
ALTER TABLE productcategory ADD COLUMN IF NOT EXISTS parent_category_id INT;
ALTER TABLE productcategory ADD COLUMN IF NOT EXISTS level INT NOT NULL DEFAULT 0;
-- level 0 = main, 1 = sub, 2 = sub-sub

-- Index for fast tree queries
CREATE INDEX IF NOT EXISTS idx_productcategory_parent
  ON productcategory(account_id, parent_category_id)
  WHERE is_deleted = false;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
