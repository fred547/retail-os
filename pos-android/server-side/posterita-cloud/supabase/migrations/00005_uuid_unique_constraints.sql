-- Add UNIQUE constraints on uuid columns for upsert support
-- Orders and tills use uuid for conflict resolution during sync

-- Orders: make uuid unique (was only indexed, not unique)
DROP INDEX IF EXISTS idx_orders_uuid;
ALTER TABLE orders ADD CONSTRAINT orders_uuid_unique UNIQUE (uuid);

-- Till: make uuid unique
ALTER TABLE till ADD CONSTRAINT till_uuid_unique UNIQUE (uuid);
