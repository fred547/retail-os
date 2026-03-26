-- Supplier & Purchase Order Management
-- Supplier master data + PO creation + GRN (Goods Received Note)

-- Supplier table
CREATE TABLE IF NOT EXISTS supplier (
    supplier_id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(account_id),
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    city TEXT,
    country TEXT,
    tax_id TEXT,
    payment_terms TEXT,                          -- e.g., "Net 30", "COD"
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchase order header
CREATE TABLE IF NOT EXISTS purchase_order (
    po_id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES account(account_id),
    supplier_id INTEGER NOT NULL,
    store_id INTEGER NOT NULL DEFAULT 0,
    po_number TEXT,                               -- human-readable PO number
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'partial', 'received', 'cancelled')),
    subtotal REAL NOT NULL DEFAULT 0,
    tax_total REAL NOT NULL DEFAULT 0,
    grand_total REAL NOT NULL DEFAULT 0,
    notes TEXT,
    order_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    expected_date TIMESTAMPTZ,
    received_date TIMESTAMPTZ,
    created_by INTEGER,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Purchase order line items
CREATE TABLE IF NOT EXISTS purchase_order_line (
    id SERIAL PRIMARY KEY,
    po_id INTEGER NOT NULL,
    account_id TEXT NOT NULL REFERENCES account(account_id),
    product_id INTEGER NOT NULL,
    product_name TEXT,
    quantity_ordered REAL NOT NULL DEFAULT 0,
    quantity_received REAL NOT NULL DEFAULT 0,
    unit_cost REAL NOT NULL DEFAULT 0,
    line_total REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE supplier ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_line ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX idx_supplier_account ON supplier(account_id);
CREATE INDEX idx_supplier_active ON supplier(account_id, is_active) WHERE is_deleted = false;
CREATE INDEX idx_po_account ON purchase_order(account_id);
CREATE INDEX idx_po_supplier ON purchase_order(supplier_id);
CREATE INDEX idx_po_status ON purchase_order(account_id, status) WHERE is_deleted = false;
CREATE INDEX idx_po_line_po ON purchase_order_line(po_id);
CREATE INDEX idx_po_line_product ON purchase_order_line(product_id);
