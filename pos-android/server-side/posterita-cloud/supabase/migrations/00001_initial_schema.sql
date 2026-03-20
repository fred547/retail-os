-- ============================================================
-- Posterita POS Cloud — Initial Database Schema
-- Supabase PostgreSQL
-- Maps 1:1 from Android Room entities with proper constraints
-- ============================================================

-- Supabase has gen_random_uuid() built-in, no extensions needed

-- ============================================================
-- ACCOUNTS (top-level tenant)
-- ============================================================
CREATE TABLE account (
    account_id   TEXT PRIMARY KEY,
    businessname TEXT,
    address1     TEXT,
    address2     TEXT,
    city         TEXT,
    state        TEXT,
    zip          TEXT,
    phone1       TEXT,
    phone2       TEXT,
    fax          TEXT,
    website      TEXT,
    vatregno     TEXT,
    currency     TEXT,
    receiptmessage TEXT,
    isvatable    TEXT DEFAULT 'N',
    isactive     TEXT DEFAULT 'Y',
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS (POS users — staff, admin, owner)
-- ============================================================
CREATE TABLE pos_user (
    user_id      SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    auth_uid     UUID REFERENCES auth.users(id),  -- link to Supabase Auth
    username     TEXT,
    password     TEXT,  -- hashed PIN for POS login
    pin          TEXT,
    firstname    TEXT,
    lastname     TEXT,
    email        TEXT,
    phone1       TEXT,
    phone2       TEXT,
    address1     TEXT,
    address2     TEXT,
    city         TEXT,
    state        TEXT,
    zip          TEXT,
    country      TEXT,
    role         TEXT DEFAULT 'STAFF' CHECK (role IN ('OWNER', 'ADMIN', 'STAFF')),
    isadmin      TEXT DEFAULT 'N',
    issalesrep   TEXT DEFAULT 'N',
    permissions  TEXT,
    discountlimit DOUBLE PRECISION DEFAULT 0,
    isactive     TEXT DEFAULT 'Y',
    createdby    INT DEFAULT 0,
    updatedby    INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pos_user_account ON pos_user(account_id);
CREATE INDEX idx_pos_user_auth ON pos_user(auth_uid);

-- ============================================================
-- STORES
-- ============================================================
CREATE TABLE store (
    store_id     SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    name         TEXT,
    address      TEXT,
    city         TEXT,
    state        TEXT,
    zip          TEXT,
    country      TEXT,
    currency     TEXT,
    isactive     TEXT DEFAULT 'Y',
    createdby    INT DEFAULT 0,
    updatedby    INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_store_account ON store(account_id);

-- ============================================================
-- TERMINALS
-- ============================================================
CREATE TABLE terminal (
    terminal_id  SERIAL PRIMARY KEY,
    store_id     INT REFERENCES store(store_id),
    account_id   TEXT REFERENCES account(account_id),
    name         TEXT,
    prefix       TEXT,
    areacode     TEXT,
    tax_id       INT DEFAULT 0,
    sequence     INT DEFAULT 0,
    cash_up_sequence INT DEFAULT 0,
    last_std_invoice_no INT DEFAULT 0,
    last_crn_invoice_no INT DEFAULT 0,
    ebs_counter  INT DEFAULT 0,
    ebscounter   TEXT,
    mraebs_id    TEXT,
    floatamt     DOUBLE PRECISION DEFAULT 0,
    isactive     TEXT DEFAULT 'Y',
    isselected   TEXT DEFAULT 'N',
    createdby    INT DEFAULT 0,
    updatedby    INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_terminal_store ON terminal(store_id);

-- ============================================================
-- TAXES
-- ============================================================
CREATE TABLE tax (
    tax_id       SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    name         TEXT,
    taxcode      TEXT,
    rate         DOUBLE PRECISION DEFAULT 0,
    isactive     TEXT DEFAULT 'Y',
    createdby    INT DEFAULT 0,
    updatedby    INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCT CATEGORIES
-- ============================================================
CREATE TABLE productcategory (
    productcategory_id SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    name         TEXT,
    display      TEXT,
    tax_id       TEXT,  -- stored as text in Android entity
    position     INT DEFAULT 0,
    isactive     TEXT DEFAULT 'Y',
    createdby    INT DEFAULT 0,
    updatedby    INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_productcategory_account ON productcategory(account_id);

-- ============================================================
-- DISCOUNT CODES
-- ============================================================
CREATE TABLE discountcode (
    discountcode_id SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    store_id     TEXT,
    name         TEXT,
    percentage   DOUBLE PRECISION DEFAULT 0,
    value        DOUBLE PRECISION DEFAULT 0,
    isactive     TEXT DEFAULT 'Y',
    createdby    INT DEFAULT 0,
    updatedby    INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE product (
    product_id   SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    productcategory_id INT REFERENCES productcategory(productcategory_id),
    tax_id       INT DEFAULT 0,
    discountcode_id INT DEFAULT 0,
    name         TEXT,
    description  TEXT,
    upc          TEXT,
    itemcode     TEXT,
    barcodetype  TEXT,
    image        TEXT,  -- Cloudinary URL
    costprice    DOUBLE PRECISION DEFAULT 0,
    sellingprice DOUBLE PRECISION DEFAULT 0,
    taxamount    DOUBLE PRECISION DEFAULT 0,
    wholesaleprice DOUBLE PRECISION DEFAULT 0,
    productcategories TEXT,
    isactive     TEXT DEFAULT 'Y',
    istaxincluded TEXT DEFAULT 'N',
    isstock      TEXT DEFAULT 'Y',
    isvariableitem TEXT DEFAULT 'N',
    isbom        TEXT DEFAULT 'N',
    ismodifier   TEXT DEFAULT 'N',
    iseditable   TEXT DEFAULT 'N',
    isfavourite  TEXT DEFAULT 'N',
    iskitchenitem TEXT DEFAULT 'N',
    iswholesaleprice TEXT DEFAULT 'N',
    printordercopy TEXT,
    -- Price review system
    needs_price_review TEXT,
    price_set_by INT DEFAULT 0,
    createdby    INT DEFAULT 0,
    updatedby    INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_product_account ON product(account_id);
CREATE INDEX idx_product_category ON product(productcategory_id);
CREATE INDEX idx_product_upc ON product(upc);
CREATE INDEX idx_product_name ON product(name);
CREATE INDEX idx_product_review ON product(needs_price_review) WHERE needs_price_review = 'Y';

-- ============================================================
-- MODIFIERS (product add-ons)
-- ============================================================
CREATE TABLE modifier (
    modifier_id  SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    product_id   INT REFERENCES product(product_id),
    productcategory_id INT DEFAULT 0,
    tax_id       INT DEFAULT 0,
    discountcode_id INT DEFAULT 0,
    name         TEXT,
    description  TEXT,
    upc          TEXT,
    image        TEXT,
    costprice    DOUBLE PRECISION DEFAULT 0,
    sellingprice DOUBLE PRECISION DEFAULT 0,
    taxamount    DOUBLE PRECISION DEFAULT 0,
    productcategories TEXT,
    isactive     TEXT DEFAULT 'Y',
    istaxincluded TEXT DEFAULT 'N',
    isstock      TEXT DEFAULT 'N',
    isvariableitem TEXT DEFAULT 'N',
    isbom        TEXT DEFAULT 'N',
    ismodifier   TEXT DEFAULT 'Y',
    iseditable   TEXT DEFAULT 'N',
    isfavourite  TEXT DEFAULT 'N',
    iskitchenitem TEXT DEFAULT 'N',
    createdby    INT DEFAULT 0,
    updatedby    INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_modifier_product ON modifier(product_id);

-- ============================================================
-- CUSTOMERS
-- ============================================================
CREATE TABLE customer (
    customer_id  SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    discountcode_id INT DEFAULT 0,
    name         TEXT,
    email        TEXT,
    phone1       TEXT,
    phone2       TEXT,
    mobile       TEXT,
    address1     TEXT,
    address2     TEXT,
    city         TEXT,
    state        TEXT,
    zip          TEXT,
    country      TEXT,
    gender       TEXT,
    dob          TEXT,
    regno        TEXT,
    identifier   TEXT,
    note         TEXT,
    allowcredit  TEXT DEFAULT 'N',
    creditlimit  DOUBLE PRECISION DEFAULT 0,
    creditterm   INT DEFAULT 0,
    openbalance  DOUBLE PRECISION DEFAULT 0,
    loyaltypoints INT DEFAULT 0,
    isactive     TEXT DEFAULT 'Y',
    createdby    INT DEFAULT 0,
    updatedby    INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_customer_account ON customer(account_id);
CREATE INDEX idx_customer_phone ON customer(phone1);
CREATE INDEX idx_customer_email ON customer(email);

-- ============================================================
-- TILLS (cash register sessions)
-- ============================================================
CREATE TABLE till (
    till_id      SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    store_id     INT REFERENCES store(store_id),
    terminal_id  INT REFERENCES terminal(terminal_id),
    documentno   TEXT,
    uuid         UUID DEFAULT gen_random_uuid(),
    open_by      INT DEFAULT 0,
    close_by     INT DEFAULT 0,
    opening_amt  DOUBLE PRECISION DEFAULT 0,
    closing_amt  DOUBLE PRECISION DEFAULT 0,
    adjustment_total DOUBLE PRECISION DEFAULT 0,
    cash_amt     DOUBLE PRECISION DEFAULT 0,
    card_amt     DOUBLE PRECISION DEFAULT 0,
    subtotal     DOUBLE PRECISION DEFAULT 0,
    tax_total    DOUBLE PRECISION DEFAULT 0,
    grand_total  DOUBLE PRECISION DEFAULT 0,
    forex_amt    DOUBLE PRECISION DEFAULT 0,
    forex_currency TEXT,
    vouchers     TEXT,
    date_opened  TIMESTAMPTZ,
    date_closed  TIMESTAMPTZ,
    json_data    JSONB,
    is_sync      BOOLEAN DEFAULT FALSE,
    sync_error   TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_till_terminal ON till(terminal_id);
CREATE INDEX idx_till_store ON till(store_id);

-- ============================================================
-- TILL ADJUSTMENTS
-- ============================================================
CREATE TABLE till_adjustment (
    till_adjustment_id SERIAL PRIMARY KEY,
    till_id      INT REFERENCES till(till_id),
    user_id      INT DEFAULT 0,
    amount       DOUBLE PRECISION DEFAULT 0,
    pay_type     TEXT,
    reason       TEXT,
    date         BIGINT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE orders (
    order_id     SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    store_id     INT REFERENCES store(store_id),
    terminal_id  INT REFERENCES terminal(terminal_id),
    till_id      INT REFERENCES till(till_id),
    customer_id  INT DEFAULT 0,
    sales_rep_id INT DEFAULT 0,
    uuid         UUID DEFAULT gen_random_uuid(),
    document_no  TEXT,
    order_type   TEXT,
    doc_status   TEXT,
    currency     TEXT,
    note         TEXT,
    couponids    TEXT,
    qty_total    DOUBLE PRECISION DEFAULT 0,
    subtotal     DOUBLE PRECISION DEFAULT 0,
    tax_total    DOUBLE PRECISION DEFAULT 0,
    grand_total  DOUBLE PRECISION DEFAULT 0,
    tips         DOUBLE PRECISION DEFAULT 0,
    is_paid      BOOLEAN DEFAULT FALSE,
    is_sync      BOOLEAN DEFAULT FALSE,
    sync_error   TEXT,
    json_data    JSONB,
    date_ordered TIMESTAMPTZ DEFAULT NOW(),
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_account ON orders(account_id);
CREATE INDEX idx_orders_store ON orders(store_id);
CREATE INDEX idx_orders_terminal ON orders(terminal_id);
CREATE INDEX idx_orders_date ON orders(date_ordered);
CREATE INDEX idx_orders_uuid ON orders(uuid);
CREATE INDEX idx_orders_sync ON orders(is_sync) WHERE is_sync = FALSE;

-- ============================================================
-- ORDER LINES
-- ============================================================
CREATE TABLE orderline (
    orderline_id SERIAL PRIMARY KEY,
    order_id     INT REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id   INT REFERENCES product(product_id),
    productcategory_id INT DEFAULT 0,
    tax_id       INT DEFAULT 0,
    productname  TEXT,
    productdescription TEXT,
    qtyentered   DOUBLE PRECISION DEFAULT 0,
    priceentered DOUBLE PRECISION DEFAULT 0,
    lineamt      DOUBLE PRECISION DEFAULT 0,
    linenetamt   DOUBLE PRECISION DEFAULT 0,
    costamt      DOUBLE PRECISION DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orderline_order ON orderline(order_id);
CREATE INDEX idx_orderline_product ON orderline(product_id);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE payment (
    payment_id   SERIAL PRIMARY KEY,
    order_id     INT REFERENCES orders(order_id),
    document_no  TEXT,
    payment_type TEXT,
    status       TEXT,
    checknumber  TEXT,
    tendered     DOUBLE PRECISION DEFAULT 0,
    amount       DOUBLE PRECISION DEFAULT 0,
    change       DOUBLE PRECISION DEFAULT 0,
    pay_amt      DOUBLE PRECISION DEFAULT 0,
    extra_info   JSONB,
    date_paid    TIMESTAMPTZ DEFAULT NOW(),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_order ON payment(order_id);

-- ============================================================
-- HOLD ORDERS (parked orders)
-- ============================================================
CREATE TABLE hold_order (
    hold_order_id SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    store_id     INT DEFAULT 0,
    terminal_id  INT DEFAULT 0,
    till_id      INT DEFAULT 0,
    description  TEXT,
    json_data    JSONB,
    date_hold    TIMESTAMPTZ DEFAULT NOW(),
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RESTAURANT TABLES
-- ============================================================
CREATE TABLE restaurant_table (
    table_id     SERIAL PRIMARY KEY,
    store_id     INT REFERENCES store(store_id),
    terminal_id  INT DEFAULT 0,
    table_name   TEXT NOT NULL,
    seats        INT DEFAULT 4,
    is_occupied  BOOLEAN DEFAULT FALSE,
    current_order_id TEXT,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_table_store ON restaurant_table(store_id);

-- ============================================================
-- PREFERENCES (account-level settings)
-- ============================================================
CREATE TABLE preference (
    preference_id SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    preventzeroqtysales TEXT DEFAULT 'N',
    showreceiptlogo TEXT DEFAULT 'Y',
    showsignature TEXT DEFAULT 'N',
    showcustomerbrn TEXT DEFAULT 'N',
    showstocktransfer TEXT DEFAULT 'N',
    showunitprice TEXT DEFAULT 'Y',
    showtaxcode  TEXT DEFAULT 'N',
    printpaymentrule TEXT,
    acceptpaymentrule TEXT,
    opencashdrawer TEXT DEFAULT 'N',
    isactive     TEXT DEFAULT 'Y',
    createdby    INT DEFAULT 0,
    updatedby    INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INTEGRATIONS
-- ============================================================
CREATE TABLE integration (
    integration_id SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    name         TEXT,
    json_data    JSONB,
    isactive     TEXT DEFAULT 'Y',
    createdby    INT DEFAULT 0,
    updatedby    INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SEQUENCES (document numbering per terminal)
-- ============================================================
CREATE TABLE sequence (
    sequence_id  SERIAL PRIMARY KEY,
    terminal_id  INT REFERENCES terminal(terminal_id),
    name         TEXT,
    prefix       TEXT,
    sequence_no  INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- LOYALTY CACHE
-- ============================================================
CREATE TABLE loyalty_cache (
    phone        TEXT PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    points       INT DEFAULT 0,
    tier         TEXT,
    vouchers     JSONB,
    last_updated BIGINT,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PENDING LOYALTY AWARDS (offline queue)
-- ============================================================
CREATE TABLE pending_loyalty_award (
    id           SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    phone        TEXT NOT NULL,
    order_uuid   TEXT NOT NULL,
    order_total  DOUBLE PRECISION DEFAULT 0,
    currency     TEXT,
    store_id     INT DEFAULT 0,
    terminal_id  INT DEFAULT 0,
    created_at   BIGINT
);

-- ============================================================
-- PENDING CONSENT UPDATES (offline queue)
-- ============================================================
CREATE TABLE pending_consent_update (
    id           SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    phone        TEXT NOT NULL,
    consent_granted BOOLEAN DEFAULT FALSE,
    consent_source TEXT,
    consent_timestamp BIGINT,
    brand_name   TEXT,
    store_id     INT DEFAULT 0,
    terminal_id  INT DEFAULT 0,
    user_id      INT DEFAULT 0,
    created_at   BIGINT
);

-- ============================================================
-- PRINTERS (per-terminal, synced from cloud)
-- ============================================================
CREATE TABLE printer (
    printer_id   SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    store_id     INT DEFAULT 0,
    name         TEXT,
    printer_type TEXT,
    ip           TEXT,
    device_name  TEXT,
    cash_drawer  TEXT,
    width        INT DEFAULT 80,
    print_receipt BOOLEAN DEFAULT TRUE,
    print_kitchen BOOLEAN DEFAULT FALSE,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SYNC LOG (track what each terminal has synced)
-- ============================================================
CREATE TABLE sync_log (
    id           SERIAL PRIMARY KEY,
    account_id   TEXT REFERENCES account(account_id),
    terminal_id  INT,
    entity_type  TEXT NOT NULL,  -- 'product', 'order', 'customer', etc.
    entity_id    INT,
    action       TEXT NOT NULL,  -- 'INSERT', 'UPDATE', 'DELETE'
    synced_at    TIMESTAMPTZ DEFAULT NOW(),
    payload      JSONB
);

CREATE INDEX idx_sync_log_account ON sync_log(account_id);
CREATE INDEX idx_sync_log_entity ON sync_log(entity_type, entity_id);

-- ============================================================
-- AI IMPORT JOBS (track bulk AI product imports)
-- ============================================================
CREATE TABLE ai_import_job (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id   TEXT REFERENCES account(account_id),
    status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    source_url   TEXT,
    total_products INT DEFAULT 0,
    processed_products INT DEFAULT 0,
    products_json JSONB,
    error_message TEXT,
    started_by   INT DEFAULT 0,
    created_at   TIMESTAMPTZ DEFAULT NOW(),
    updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ai_import_account ON ai_import_job(account_id);

-- ============================================================
-- UPDATED_AT TRIGGER (auto-update timestamps)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at'
        AND table_schema = 'public'
    LOOP
        EXECUTE format(
            'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
            t
        );
    END LOOP;
END;
$$;
