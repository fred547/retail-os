/**
 * TypeScript interfaces matching Android Room entities.
 * Used by both Dexie (IndexedDB) and the sync engine.
 * Field names match Supabase column names (snake_case).
 */

export interface Product {
  product_id: number;
  account_id: string;
  name: string | null;
  description: string | null;
  sellingprice: number;
  costprice: number;
  taxamount: number;
  tax_id: number;
  productcategory_id: number;
  image: string | null;
  upc: string | null;
  itemcode: string | null;
  barcodetype: string | null;
  isactive: string | null;
  istaxincluded: string | null;
  isstock: string | null;
  isvariableitem: string | null;
  iskitchenitem: string | null;
  ismodifier: string | null;
  isfavourite: string | null;
  iseditable: string | null;
  wholesaleprice: number;
  needs_price_review: string | null;
  price_set_by: number;
  product_status: string | null;
  source: string | null;
  is_serialized: string | null;
  quantity_on_hand: number;
  reorder_point: number;
  track_stock: boolean;
  shelf_location: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  is_deleted: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProductCategory {
  productcategory_id: number;
  account_id: string;
  name: string | null;
  isactive: string | null;
  display: string | null;
  position: number;
  tax_id: string | null;
  parent_category_id: number | null;
  level: number;
}

export interface Tax {
  tax_id: number;
  account_id: string;
  name: string | null;
  rate: number;
  taxcode: string | null;
  isactive: string | null;
}

export interface Modifier {
  modifier_id: number;
  account_id: string;
  name: string | null;
  sellingprice: number;
  costprice: number;
  taxamount: number;
  tax_id: number;
  productcategory_id: number;
  product_id: number;
  image: string | null;
  isactive: string | null;
}

export interface Customer {
  customer_id: number;
  account_id: string;
  name: string | null;
  identifier: string | null;
  phone1: string | null;
  phone2: string | null;
  mobile: string | null;
  email: string | null;
  address1: string | null;
  address2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  gender: string | null;
  dob: string | null;
  regno: string | null;
  note: string | null;
  allowcredit: string | null;
  creditlimit: number;
  creditterm: number;
  openbalance: number;
  isactive: string | null;
  loyaltypoints: number;
  discountcode_id: number;
  created: string | null;
  updated: string | null;
}

export interface Order {
  order_id: number;
  account_id: string;
  customer_id: number;
  sales_rep_id: number;
  till_id: number;
  till_uuid: string | null;
  terminal_id: number;
  store_id: number;
  order_type: string | null;
  document_no: string | null;
  doc_status: string | null;
  is_paid: boolean;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  qty_total: number;
  date_ordered: string | null;
  json_data: any;
  is_sync: boolean;
  sync_error_message: string | null;
  uuid: string;
  currency: string | null;
  tips: number;
  note: string | null;
  couponids: string | null;
}

export interface OrderLine {
  orderline_id: number;
  order_id: number;
  product_id: number;
  productcategory_id: number;
  tax_id: number;
  qtyentered: number;
  lineamt: number;
  linenetamt: number;
  priceentered: number;
  costamt: number;
  productname: string | null;
  productdescription: string | null;
  serial_item_id: number | null;
}

export interface Payment {
  payment_id: number;
  order_id: number;
  document_no: string | null;
  tendered: number;
  amount: number;
  change: number;
  payment_type: string | null;
  date_paid: string | null;
  pay_amt: number;
  status: string | null;
  checknumber: string | null;
  extra_info: any;
}

export interface Till {
  till_id: number;
  account_id: string;
  store_id: number;
  terminal_id: number;
  open_by: number;
  close_by: number;
  opening_amt: number;
  closing_amt: number;
  date_opened: string | null;
  date_closed: string | null;
  json_data: any;
  is_sync: boolean;
  sync_error_message: string | null;
  uuid: string;
  documentno: string | null;
  vouchers: string | null;
  adjustment_total: number;
  cash_amt: number;
  card_amt: number;
  subtotal: number;
  tax_total: number;
  grand_total: number;
  forex_currency: string | null;
  forex_amt: number;
}

export interface PosUser {
  user_id: number;
  account_id: string;
  username: string | null;
  firstname: string | null;
  lastname: string | null;
  pin: string | null;
  role: string | null;
  isadmin: string | null;
  issalesrep: string | null;
  permissions: string | null;
  discountlimit: number;
  isactive: string | null;
  email: string | null;
}

export interface Store {
  store_id: number;
  account_id: string;
  name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  currency: string | null;
  isactive: string | null;
  store_type: string;
}

export interface Terminal {
  terminal_id: number;
  account_id: string;
  store_id: number;
  name: string | null;
  prefix: string | null;
  sequence: number;
  cash_up_sequence: number;
  isactive: string | null;
  terminal_type: string;
}

export interface Preference {
  preference_id: number;
  account_id: string;
  isactive: string | null;
  showreceiptlogo: string | null;
  showsignature: string | null;
  opencashdrawer: string | null;
  showunitprice: string | null;
  showtaxcode: string | null;
  preventzeroqtysales: string | null;
  printpaymentrule: string | null;
  acceptpaymentrule: string | null;
  showcustomerbrn: string | null;
  showstocktransfer: string | null;
  ai_api_key: string | null;
}

export interface DiscountCode {
  discountcode_id: number;
  account_id: string;
  name: string | null;
  percentage: number;
  value: number;
  isactive: string | null;
}

export interface LoyaltyConfig {
  id: number;
  account_id: string;
  points_per_currency: number;
  redemption_rate: number;
  min_redeem_points: number;
  is_active: boolean;
  welcome_bonus: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface Promotion {
  id: number;
  account_id: string;
  name: string;
  description: string | null;
  type: string;
  discount_value: number;
  buy_quantity: number | null;
  get_quantity: number | null;
  applies_to: string;
  product_ids: string | null;
  category_ids: string | null;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  promo_code: string | null;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  start_date: string | null;
  end_date: string | null;
  days_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
  store_id: number | null;
  priority: number;
  is_deleted: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface MenuSchedule {
  id: number;
  account_id: string;
  store_id: number;
  name: string;
  description: string | null;
  category_ids: string | null;
  start_time: string | null;
  end_time: string | null;
  days_of_week: string | null;
  priority: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface TagGroup {
  tag_group_id: number;
  account_id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
  is_deleted: boolean;
}

export interface Tag {
  tag_id: number;
  account_id: string;
  tag_group_id: number;
  name: string;
  color: string | null;
  position: number;
  is_active: boolean;
  is_deleted: boolean;
}

export interface ProductTag {
  product_id: number;
  tag_id: number;
  account_id: string;
}

/** Sync metadata stored in IndexedDB */
export interface SyncMeta {
  key: string;
  value: string;
}
