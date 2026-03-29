-- Terminal device locking: each terminal can only be used by one device.
-- Once a device enrolls on a terminal, that terminal is locked to it.
-- Other devices are rejected. Owner/admin can unlock from web console.

ALTER TABLE terminal ADD COLUMN IF NOT EXISTS locked_device_id TEXT;
ALTER TABLE terminal ADD COLUMN IF NOT EXISTS locked_device_name TEXT;
ALTER TABLE terminal ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Index for quick lookup by device
CREATE INDEX IF NOT EXISTS idx_terminal_locked_device ON terminal (account_id, locked_device_id);

NOTIFY pgrst, 'reload schema';
