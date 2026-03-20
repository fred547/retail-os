-- Fix pos_user role check constraint to accept both uppercase and lowercase values
-- Android sends lowercase ('owner', 'admin', 'staff') while the original constraint expected uppercase.
ALTER TABLE pos_user DROP CONSTRAINT IF EXISTS pos_user_role_check;
ALTER TABLE pos_user ADD CONSTRAINT pos_user_role_check
  CHECK (LOWER(role) IN ('owner', 'admin', 'staff'));

-- Remove foreign key constraint on product.productcategory_id
-- to prevent sync failures when products are synced before their categories.
-- The POS enforces referential integrity locally; the cloud is a reporting mirror.
ALTER TABLE product DROP CONSTRAINT IF EXISTS product_productcategory_id_fkey;
