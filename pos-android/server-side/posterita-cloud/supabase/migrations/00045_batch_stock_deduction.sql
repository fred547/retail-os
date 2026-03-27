-- Batch stock deduction: RPC function to replace N+1 query pattern in sync push
-- Handles stock deduction + journal entries in a single DB call

CREATE OR REPLACE FUNCTION batch_deduct_stock(
  p_account_id TEXT,
  p_store_id INTEGER,
  p_deductions JSONB
)
RETURNS VOID AS $$
DECLARE
  d JSONB;
  v_product_id INTEGER;
  v_qty DOUBLE PRECISION;
  v_order_uuid TEXT;
  v_new_qty DOUBLE PRECISION;
BEGIN
  FOR d IN SELECT * FROM jsonb_array_elements(p_deductions)
  LOOP
    v_product_id := (d->>'product_id')::INTEGER;
    v_qty := (d->>'qty')::DOUBLE PRECISION;
    v_order_uuid := d->>'order_uuid';

    -- Atomic decrement (no read-then-write race)
    UPDATE product
    SET quantity_on_hand = quantity_on_hand - v_qty,
        updated_at = now()
    WHERE product_id = v_product_id
      AND account_id = p_account_id
      AND track_stock = true
    RETURNING quantity_on_hand INTO v_new_qty;

    -- Journal entry (only if product was actually updated)
    IF FOUND THEN
      INSERT INTO stock_journal (account_id, product_id, store_id, quantity_change, quantity_after, reason, reference_type, reference_id)
      VALUES (p_account_id, v_product_id, p_store_id, -v_qty, v_new_qty, 'sale', 'order', v_order_uuid);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Batch loyalty earn: RPC function to replace N+1 loyalty pattern
CREATE OR REPLACE FUNCTION batch_loyalty_earn(
  p_account_id TEXT,
  p_store_id INTEGER,
  p_terminal_id INTEGER,
  p_points_per_currency DOUBLE PRECISION,
  p_earns JSONB
)
RETURNS VOID AS $$
DECLARE
  e JSONB;
  v_customer_id INTEGER;
  v_grand_total DOUBLE PRECISION;
  v_order_id INTEGER;
  v_earned_points INTEGER;
  v_new_balance INTEGER;
BEGIN
  FOR e IN SELECT * FROM jsonb_array_elements(p_earns)
  LOOP
    v_customer_id := (e->>'customer_id')::INTEGER;
    v_grand_total := (e->>'grand_total')::DOUBLE PRECISION;
    v_order_id := (e->>'order_id')::INTEGER;
    v_earned_points := FLOOR(v_grand_total * p_points_per_currency);

    IF v_earned_points <= 0 THEN CONTINUE; END IF;

    -- Atomic increment
    UPDATE customer
    SET loyaltypoints = loyaltypoints + v_earned_points,
        updated = now()
    WHERE customer_id = v_customer_id
      AND account_id = p_account_id
    RETURNING loyaltypoints INTO v_new_balance;

    IF FOUND THEN
      INSERT INTO loyalty_transaction (account_id, customer_id, order_id, type, points, balance_after, description, store_id, terminal_id)
      VALUES (p_account_id, v_customer_id, v_order_id, 'earn', v_earned_points, v_new_balance,
              'Earned ' || v_earned_points || ' pts on order #' || v_order_id,
              p_store_id, p_terminal_id);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
