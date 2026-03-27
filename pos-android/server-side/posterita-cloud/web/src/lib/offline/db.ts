import Dexie, { type EntityTable } from "dexie";
import type {
  Product, ProductCategory, Tax, Modifier, Customer,
  Order, OrderLine, Payment, Till, PosUser, Store, Terminal,
  Preference, DiscountCode, LoyaltyConfig, Promotion, MenuSchedule,
  TagGroup, Tag, ProductTag, SyncMeta,
} from "./schema";

/**
 * Posterita offline database — mirrors Android Room schema.
 *
 * Indexed fields are listed in the Dexie store definition.
 * Non-indexed fields are still stored — Dexie stores all object properties,
 * indexes just make queries on those fields fast.
 *
 * Convention: first field is the primary key (auto-increment if prefixed with ++).
 */
class PosteritaDB extends Dexie {
  product!: EntityTable<Product, "product_id">;
  productcategory!: EntityTable<ProductCategory, "productcategory_id">;
  tax!: EntityTable<Tax, "tax_id">;
  modifier!: EntityTable<Modifier, "modifier_id">;
  customer!: EntityTable<Customer, "customer_id">;
  order!: EntityTable<Order, "order_id">;
  orderline!: EntityTable<OrderLine, "orderline_id">;
  payment!: EntityTable<Payment, "payment_id">;
  till!: EntityTable<Till, "till_id">;
  pos_user!: EntityTable<PosUser, "user_id">;
  store!: EntityTable<Store, "store_id">;
  terminal!: EntityTable<Terminal, "terminal_id">;
  preference!: EntityTable<Preference, "preference_id">;
  discountcode!: EntityTable<DiscountCode, "discountcode_id">;
  loyalty_config!: EntityTable<LoyaltyConfig, "id">;
  promotion!: EntityTable<Promotion, "id">;
  menu_schedule!: EntityTable<MenuSchedule, "id">;
  tag_group!: EntityTable<TagGroup, "tag_group_id">;
  tag!: EntityTable<Tag, "tag_id">;
  product_tag!: EntityTable<ProductTag, "product_id">;
  sync_meta!: EntityTable<SyncMeta, "key">;

  constructor() {
    super("posterita-pos");

    this.version(1).stores({
      // Products & catalogue
      product: "product_id, productcategory_id, upc, name, isactive, product_status, account_id, shelf_location",
      productcategory: "productcategory_id, name, isactive, account_id, parent_category_id",
      tax: "tax_id, account_id",
      modifier: "modifier_id, product_id, productcategory_id, account_id",
      // Customers
      customer: "customer_id, name, phone1, email, account_id, isactive",
      // Transactions (auto-increment PKs for locally-created records)
      order: "++order_id, uuid, till_id, is_sync, account_id, store_id, date_ordered",
      orderline: "++orderline_id, order_id, product_id",
      payment: "++payment_id, order_id",
      till: "++till_id, uuid, is_sync, account_id, store_id, terminal_id",
      // Users & config
      pos_user: "user_id, username, pin, account_id",
      store: "store_id, account_id",
      terminal: "terminal_id, store_id, account_id",
      preference: "preference_id, account_id",
      discountcode: "discountcode_id, account_id",
      // Phase 3 entities
      loyalty_config: "id, account_id",
      promotion: "id, account_id, is_active",
      menu_schedule: "id, account_id, store_id",
      // Tags
      tag_group: "tag_group_id, account_id",
      tag: "tag_id, tag_group_id, account_id",
      product_tag: "[product_id+tag_id], product_id, tag_id, account_id",
      // Sync metadata
      sync_meta: "key",
    });
  }
}

/** Singleton database instance */
let dbInstance: PosteritaDB | null = null;

export function getOfflineDb(): PosteritaDB {
  if (!dbInstance) {
    dbInstance = new PosteritaDB();
  }
  return dbInstance;
}

/**
 * Clear all data for a given account (used on logout or brand switch).
 */
export async function clearAccountData(accountId: string): Promise<void> {
  const db = getOfflineDb();
  const tables = [
    db.product, db.productcategory, db.tax, db.modifier, db.customer,
    db.pos_user, db.store, db.terminal, db.preference, db.discountcode,
    db.loyalty_config, db.promotion, db.menu_schedule,
    db.tag_group, db.tag, db.product_tag,
  ] as Dexie.Table[];

  // Delete records matching account_id from each table
  await Promise.all(
    tables.map(async (table) => {
      try {
        const records = await table.where("account_id").equals(accountId).primaryKeys();
        if (records.length > 0) await table.bulkDelete(records as any[]);
      } catch {
        // Table may not have account_id index — clear all
        await table.clear();
      }
    })
  );

  // Transactional data — clear all (scoped to this device anyway)
  await db.order.clear();
  await db.orderline.clear();
  await db.payment.clear();
  await db.till.clear();

  // Clear sync timestamps
  await db.sync_meta.clear();
}

/**
 * Get a sync metadata value.
 */
export async function getSyncMeta(key: string): Promise<string | undefined> {
  const row = await getOfflineDb().sync_meta.get(key);
  return row?.value;
}

/**
 * Set a sync metadata value.
 */
export async function setSyncMeta(key: string, value: string): Promise<void> {
  await getOfflineDb().sync_meta.put({ key, value });
}
