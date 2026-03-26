-- Delivery Tracking
-- Track delivery orders: driver assignment, status, address, estimated times

CREATE TABLE IF NOT EXISTS delivery (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(account_id),
    order_id INTEGER,
    store_id INTEGER NOT NULL DEFAULT 0,
    customer_id INTEGER,
    customer_name TEXT,
    customer_phone TEXT,
    delivery_address TEXT NOT NULL,
    delivery_city TEXT,
    delivery_notes TEXT,
    driver_id INTEGER,                           -- pos_user.user_id
    driver_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled')),
    estimated_time INTEGER,                      -- estimated delivery in minutes
    actual_delivery_at TIMESTAMPTZ,
    assigned_at TIMESTAMPTZ,
    picked_up_at TIMESTAMPTZ,
    distance_km REAL,
    delivery_fee REAL NOT NULL DEFAULT 0,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE delivery ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_delivery_account ON delivery(account_id);
CREATE INDEX idx_delivery_status ON delivery(account_id, status) WHERE is_deleted = false;
CREATE INDEX idx_delivery_driver ON delivery(account_id, driver_id) WHERE driver_id IS NOT NULL;
CREATE INDEX idx_delivery_order ON delivery(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_delivery_date ON delivery(account_id, created_at DESC);
