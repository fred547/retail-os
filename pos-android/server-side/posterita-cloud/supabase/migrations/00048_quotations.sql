-- Quotation system: quotes, quote lines, PDF template config
-- Phase 4: quote → send → accept → convert to order

-- Quotations
CREATE TABLE IF NOT EXISTS quotation (
    quotation_id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    store_id INTEGER NOT NULL DEFAULT 0,
    terminal_id INTEGER NOT NULL DEFAULT 0,
    customer_id INTEGER,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    customer_address TEXT,
    document_no TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    uuid UUID NOT NULL DEFAULT gen_random_uuid(),
    subtotal DOUBLE PRECISION NOT NULL DEFAULT 0,
    tax_total DOUBLE PRECISION NOT NULL DEFAULT 0,
    grand_total DOUBLE PRECISION NOT NULL DEFAULT 0,
    currency TEXT,
    notes TEXT,
    terms TEXT,
    valid_until DATE,
    template_id TEXT NOT NULL DEFAULT 'classic',
    converted_order_id INTEGER,
    created_by INTEGER NOT NULL DEFAULT 0,
    sent_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT quotation_status_check CHECK (status IN ('draft', 'sent', 'accepted', 'converted', 'expired', 'cancelled'))
);

ALTER TABLE quotation ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_quotation_uuid ON quotation (uuid);
CREATE INDEX IF NOT EXISTS idx_quotation_account ON quotation (account_id, status, is_deleted);
CREATE INDEX IF NOT EXISTS idx_quotation_customer ON quotation (account_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_quotation_document_no ON quotation (account_id, document_no);

-- Quotation lines
CREATE TABLE IF NOT EXISTS quotation_line (
    line_id SERIAL PRIMARY KEY,
    quotation_id INTEGER NOT NULL REFERENCES quotation(quotation_id) ON DELETE CASCADE,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    description TEXT,
    quantity DOUBLE PRECISION NOT NULL DEFAULT 1,
    unit_price DOUBLE PRECISION NOT NULL DEFAULT 0,
    discount_percent DOUBLE PRECISION NOT NULL DEFAULT 0,
    tax_id INTEGER NOT NULL DEFAULT 0,
    tax_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
    line_total DOUBLE PRECISION NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE quotation_line ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_quotation_line_quotation ON quotation_line (quotation_id);

-- PDF template configuration (per account, per template)
CREATE TABLE IF NOT EXISTS quote_template_config (
    id SERIAL PRIMARY KEY,
    account_id TEXT NOT NULL,
    template_id TEXT NOT NULL,
    logo_url TEXT,
    primary_color TEXT NOT NULL DEFAULT '#1976D2',
    company_name TEXT,
    company_address TEXT,
    company_phone TEXT,
    company_email TEXT,
    footer_text TEXT,
    default_terms TEXT,
    default_valid_days INTEGER NOT NULL DEFAULT 30,
    show_tax_breakdown BOOLEAN NOT NULL DEFAULT true,
    show_discount_column BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT quote_template_unique UNIQUE (account_id, template_id)
);

ALTER TABLE quote_template_config ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_quote_template_account ON quote_template_config (account_id);

-- Auto-generate document_no sequence per account
CREATE OR REPLACE FUNCTION generate_quote_document_no()
RETURNS TRIGGER AS $$
DECLARE
    next_seq INTEGER;
BEGIN
    IF NEW.document_no IS NULL OR NEW.document_no = '' THEN
        SELECT COALESCE(MAX(
            CASE WHEN document_no ~ '^Q-[0-9]+$'
                 THEN CAST(SUBSTRING(document_no FROM 3) AS INTEGER)
                 ELSE 0 END
        ), 0) + 1
        INTO next_seq
        FROM quotation
        WHERE account_id = NEW.account_id;

        NEW.document_no := 'Q-' || LPAD(next_seq::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_quotation_document_no
    BEFORE INSERT ON quotation
    FOR EACH ROW
    EXECUTE FUNCTION generate_quote_document_no();
