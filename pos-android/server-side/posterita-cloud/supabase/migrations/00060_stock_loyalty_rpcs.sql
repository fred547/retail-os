-- Stock deduction and loyalty earn RPCs — called by sync route on every order push

-- Batch deduct stock: creates journal entries for each product sold
CREATE OR REPLACE FUNCTION batch_deduct_stock(p_account_id TEXT, p_store_id INT, p_deductions JSONB)
RETURNS void AS $$
DECLARE
  d JSONB;
  v_product_id INT;
  v_qty NUMERIC;
  v_order_uuid TEXT;
  v_current_qty NUMERIC;
BEGIN
  FOR d IN SELECT * FROM jsonb_array_elements(p_deductions) LOOP
    v_product_id := (d->>'product_id')::INT;
    v_qty := (d->>'qty')::NUMERIC;
    v_order_uuid := d->>'order_uuid';
    SELECT quantity_after INTO v_current_qty FROM stock_journal WHERE account_id = p_account_id AND product_id = v_product_id AND store_id = p_store_id ORDER BY created_at DESC LIMIT 1;
    IF v_current_qty IS NULL THEN v_current_qty := 0; END IF;
    INSERT INTO stock_journal (account_id, product_id, store_id, quantity_change, quantity_after, reason, reference_type, reference_id) VALUES (p_account_id, v_product_id, p_store_id, -v_qty, v_current_qty - v_qty, 'sale', 'order', v_order_uuid);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Batch loyalty earn: awards points for each order with a customer
CREATE OR REPLACE FUNCTION batch_loyalty_earn(p_account_id TEXT, p_store_id INT, p_terminal_id INT, p_points_per_currency NUMERIC, p_earns JSONB)
RETURNS void AS $$
DECLARE
  o JSONB;
  v_customer_id INT;
  v_grand_total NUMERIC;
  v_order_id INT;
  v_points INT;
  v_current_balance INT;
BEGIN
  FOR o IN SELECT * FROM jsonb_array_elements(p_earns) LOOP
    v_customer_id := (o->>'customer_id')::INT;
    v_grand_total := (o->>'grand_total')::NUMERIC;
    v_order_id := (o->>'order_id')::INT;
    IF v_customer_id IS NULL OR v_customer_id <= 0 OR v_grand_total <= 0 THEN CONTINUE; END IF;
    v_points := FLOOR(v_grand_total * p_points_per_currency);
    IF v_points <= 0 THEN CONTINUE; END IF;
    SELECT COALESCE(loyaltypoints, 0) INTO v_current_balance FROM customer WHERE customer_id = v_customer_id AND account_id = p_account_id;
    IF v_current_balance IS NULL THEN CONTINUE; END IF;
    UPDATE customer SET loyaltypoints = v_current_balance + v_points WHERE customer_id = v_customer_id AND account_id = p_account_id;
    INSERT INTO loyalty_transaction (account_id, customer_id, type, points, balance_after, order_id, created_by, store_id, terminal_id)
    VALUES (p_account_id, v_customer_id, 'earn', v_points, v_current_balance + v_points, v_order_id, 0, p_store_id, p_terminal_id);
  END LOOP;
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload schema';
