ALTER TABLE account ADD COLUMN IF NOT EXISTS sync_secret TEXT;
-- Populate existing accounts with a random secret
UPDATE account SET sync_secret = encode(gen_random_bytes(32), 'hex') WHERE sync_secret IS NULL;
