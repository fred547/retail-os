-- ============================================================
-- Migration 00046: Delivery V2 — templates, direction, proof, COD
-- ============================================================

-- Direction & type
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS delivery_type TEXT NOT NULL DEFAULT 'package';
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'outbound';

-- Origin (for pickups/transfers — origin is not always our store)
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS origin_type TEXT NOT NULL DEFAULT 'store';
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS origin_store_id INTEGER;
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS origin_address TEXT;
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS origin_contact TEXT;

-- Destination refactored (supports store-to-store)
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS destination_type TEXT NOT NULL DEFAULT 'customer';
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS destination_store_id INTEGER;

-- Vehicle
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS vehicle_type TEXT;
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;

-- Proof of delivery
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS proof_type TEXT NOT NULL DEFAULT 'none';
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS proof_photos JSONB;
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS proof_signature TEXT;
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS proof_pin TEXT;
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS proof_verified BOOLEAN NOT NULL DEFAULT false;

-- Payment on delivery
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'prepaid';
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS cod_amount REAL NOT NULL DEFAULT 0;
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS cod_collected REAL NOT NULL DEFAULT 0;

-- Scheduling & items
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS items JSONB;
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS special_instructions TEXT;
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS driver_notes TEXT;

-- PO link (for supplier pickups)
ALTER TABLE delivery ADD COLUMN IF NOT EXISTS po_id INTEGER;

-- Update status CHECK to include 'returned'
ALTER TABLE delivery DROP CONSTRAINT IF EXISTS delivery_status_check;
ALTER TABLE delivery ADD CONSTRAINT delivery_status_check
  CHECK (status IN ('pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled', 'returned'));

-- Type CHECK
ALTER TABLE delivery ADD CONSTRAINT delivery_type_check
  CHECK (delivery_type IN ('food', 'package', 'heavy', 'transfer', 'supplier_pickup', 'return_pickup', 'document', 'cash_collection'));

-- Direction CHECK
ALTER TABLE delivery ADD CONSTRAINT delivery_direction_check
  CHECK (direction IN ('outbound', 'inbound', 'transfer'));

-- Proof type CHECK
ALTER TABLE delivery ADD CONSTRAINT delivery_proof_type_check
  CHECK (proof_type IN ('none', 'photo', 'signature', 'pin', 'barcode_scan'));

-- Payment method CHECK
ALTER TABLE delivery ADD CONSTRAINT delivery_payment_method_check
  CHECK (payment_method IN ('prepaid', 'cod_cash', 'cod_card', 'none'));

NOTIFY pgrst, 'reload schema';
