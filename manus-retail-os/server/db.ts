import { eq, desc, sql, and, like, or, gte, lte, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  stores, devices, deviceSessions,
  categories, products, priceRules,
  warehouses, inventoryLevels, stockAdjustments,
  customers, customerAddresses,
  loyaltyTiers, loyaltyAccounts, loyaltyTransactions, loyaltyMilestones,
  tillSessions, orders, orderItems, payments, refunds,
  whatsappTemplates, whatsappMessages, notificationLog,
  staffProfiles, shifts, leaveRequests, expenses, warnings, tasks,
  assets, maintenanceLogs,
  campaigns, vouchers, utilityBills,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USER ────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod", "phone", "avatarUrl"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => { const value = user[field]; if (value === undefined) return; const normalized = value ?? null; values[field] = normalized; updateSet[field] = normalized; };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.storeId !== undefined) { values.storeId = user.storeId; updateSet.storeId = user.storeId; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; } else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function listUsers(limit = 50, offset = 0) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
}

// ─── STORES ──────────────────────────────────────────────────
export async function listStores() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(stores).orderBy(asc(stores.name));
}
export async function getStoreById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(stores).where(eq(stores.id, id)).limit(1);
  return r[0];
}
export async function createStore(data: typeof stores.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const r = await db.insert(stores).values(data);
  return { id: r[0].insertId };
}
export async function updateStore(id: number, data: Partial<typeof stores.$inferInsert>) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  await db.update(stores).set(data).where(eq(stores.id, id));
}

// ─── DEVICES ─────────────────────────────────────────────────
export async function listDevices(storeId?: number) {
  const db = await getDb(); if (!db) return [];
  const q = storeId ? db.select().from(devices).where(eq(devices.storeId, storeId)) : db.select().from(devices);
  return q.orderBy(desc(devices.createdAt));
}
export async function getDeviceById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(devices).where(eq(devices.id, id)).limit(1);
  return r[0];
}
export async function createDevice(data: typeof devices.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const r = await db.insert(devices).values(data);
  return { id: r[0].insertId };
}
export async function updateDevice(id: number, data: Partial<typeof devices.$inferInsert>) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  await db.update(devices).set(data).where(eq(devices.id, id));
}

// ─── CATEGORIES ──────────────────────────────────────────────
export async function listCategories() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}
export async function createCategory(data: typeof categories.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const r = await db.insert(categories).values(data);
  return { id: r[0].insertId };
}
export async function updateCategory(id: number, data: Partial<typeof categories.$inferInsert>) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  await db.update(categories).set(data).where(eq(categories.id, id));
}
export async function deleteCategory(id: number) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  await db.delete(categories).where(eq(categories.id, id));
}

// ─── PRODUCTS ────────────────────────────────────────────────
export async function listProducts(opts: { limit?: number; offset?: number; categoryId?: number; search?: string; activeOnly?: boolean } = {}) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (opts.categoryId) conditions.push(eq(products.categoryId, opts.categoryId));
  if (opts.activeOnly) conditions.push(eq(products.isActive, true));
  if (opts.search) conditions.push(or(like(products.name, `%${opts.search}%`), like(products.sku, `%${opts.search}%`), like(products.barcode, `%${opts.search}%`)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(products).where(where).orderBy(desc(products.updatedAt)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
}
export async function getProductById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return r[0];
}
export async function createProduct(data: typeof products.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const r = await db.insert(products).values(data);
  return { id: r[0].insertId };
}
export async function updateProduct(id: number, data: Partial<typeof products.$inferInsert>) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  await db.update(products).set(data).where(eq(products.id, id));
}

// ─── INVENTORY ───────────────────────────────────────────────
export async function listInventoryLevels(opts: { warehouseId?: number; lowStockOnly?: boolean } = {}) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (opts.warehouseId) conditions.push(eq(inventoryLevels.warehouseId, opts.warehouseId));
  if (opts.lowStockOnly) conditions.push(sql`${inventoryLevels.quantity} <= ${inventoryLevels.reorderLevel}`);
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select({ inventory: inventoryLevels, product: products }).from(inventoryLevels).leftJoin(products, eq(inventoryLevels.productId, products.id)).where(where).orderBy(asc(inventoryLevels.quantity));
}
export async function adjustStock(data: typeof stockAdjustments.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  await db.insert(stockAdjustments).values(data);
  await db.update(inventoryLevels).set({ quantity: data.newQuantity }).where(and(eq(inventoryLevels.productId, data.productId), eq(inventoryLevels.warehouseId, data.warehouseId)));
}
export async function listStockAdjustments(productId?: number, limit = 50) {
  const db = await getDb(); if (!db) return [];
  const where = productId ? eq(stockAdjustments.productId, productId) : undefined;
  return db.select().from(stockAdjustments).where(where).orderBy(desc(stockAdjustments.createdAt)).limit(limit);
}
export async function listWarehouses() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(warehouses).orderBy(asc(warehouses.name));
}
export async function createWarehouse(data: typeof warehouses.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const r = await db.insert(warehouses).values(data);
  return { id: r[0].insertId };
}

// ─── CUSTOMERS ───────────────────────────────────────────────
export async function listCustomers(opts: { limit?: number; offset?: number; search?: string } = {}) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (opts.search) conditions.push(or(like(customers.firstName, `%${opts.search}%`), like(customers.lastName, `%${opts.search}%`), like(customers.email, `%${opts.search}%`), like(customers.phone, `%${opts.search}%`)));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(customers).where(where).orderBy(desc(customers.updatedAt)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
}
export async function getCustomerById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
  return r[0];
}
export async function createCustomer(data: typeof customers.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const r = await db.insert(customers).values(data);
  return { id: r[0].insertId };
}
export async function updateCustomer(id: number, data: Partial<typeof customers.$inferInsert>) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  await db.update(customers).set(data).where(eq(customers.id, id));
}
export async function getCustomerAddresses(customerId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(customerAddresses).where(eq(customerAddresses.customerId, customerId));
}

// ─── LOYALTY ─────────────────────────────────────────────────
export async function listLoyaltyTiers() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(loyaltyTiers).orderBy(asc(loyaltyTiers.sortOrder));
}
export async function createLoyaltyTier(data: typeof loyaltyTiers.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const r = await db.insert(loyaltyTiers).values(data);
  return { id: r[0].insertId };
}
export async function getLoyaltyAccount(customerId: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(loyaltyAccounts).where(eq(loyaltyAccounts.customerId, customerId)).limit(1);
  return r[0];
}
export async function createLoyaltyAccount(data: typeof loyaltyAccounts.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const r = await db.insert(loyaltyAccounts).values(data);
  return { id: r[0].insertId };
}
export async function addLoyaltyTransaction(data: typeof loyaltyTransactions.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  await db.insert(loyaltyTransactions).values(data);
  await db.update(loyaltyAccounts).set({
    pointsBalance: data.balanceAfter,
    lifetimePoints: data.type === 'earn' || data.type === 'bonus' ? sql`lifetimePoints + ${data.points}` : undefined,
    lifetimeRedeemed: data.type === 'redeem' ? sql`lifetimeRedeemed + ${Math.abs(data.points)}` : undefined,
  }).where(eq(loyaltyAccounts.id, data.accountId));
}
export async function listLoyaltyTransactions(customerId: number, limit = 50) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(loyaltyTransactions).where(eq(loyaltyTransactions.customerId, customerId)).orderBy(desc(loyaltyTransactions.createdAt)).limit(limit);
}
export async function listLoyaltyMilestones() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(loyaltyMilestones).orderBy(asc(loyaltyMilestones.triggerValue));
}
export async function createLoyaltyMilestone(data: typeof loyaltyMilestones.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const r = await db.insert(loyaltyMilestones).values(data);
  return { id: r[0].insertId };
}

// ─── ORDERS ──────────────────────────────────────────────────
export async function listOrders(opts: { limit?: number; offset?: number; storeId?: number; customerId?: number; status?: string; channel?: string } = {}) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (opts.storeId) conditions.push(eq(orders.storeId, opts.storeId));
  if (opts.customerId) conditions.push(eq(orders.customerId, opts.customerId));
  if (opts.status) conditions.push(eq(orders.status, opts.status as any));
  if (opts.channel) conditions.push(eq(orders.channel, opts.channel as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(opts.limit ?? 50).offset(opts.offset ?? 0);
}
export async function getOrderById(id: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return r[0];
}
export async function getOrderItems(orderId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
}
export async function getOrderPayments(orderId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(payments).where(eq(payments.orderId, orderId));
}
export async function createOrder(data: typeof orders.$inferInsert, items: (typeof orderItems.$inferInsert)[], paymentData: (typeof payments.$inferInsert)[]) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const r = await db.insert(orders).values(data);
  const orderId = r[0].insertId;
  if (items.length > 0) await db.insert(orderItems).values(items.map(i => ({ ...i, orderId })));
  if (paymentData.length > 0) await db.insert(payments).values(paymentData.map(p => ({ ...p, orderId })));
  return { id: orderId };
}
export async function updateOrderStatus(id: number, status: string) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  await db.update(orders).set({ status: status as any }).where(eq(orders.id, id));
}

// ─── TILL SESSIONS ───────────────────────────────────────────
export async function listTillSessions(opts: { storeId?: number; status?: string; limit?: number } = {}) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (opts.storeId) conditions.push(eq(tillSessions.storeId, opts.storeId));
  if (opts.status) conditions.push(eq(tillSessions.status, opts.status as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(tillSessions).where(where).orderBy(desc(tillSessions.openedAt)).limit(opts.limit ?? 50);
}
export async function openTillSession(data: typeof tillSessions.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const r = await db.insert(tillSessions).values(data);
  return { id: r[0].insertId };
}
export async function closeTillSession(id: number, data: { closingBalance: string; expectedBalance: string; discrepancy: string; discrepancyNote?: string }) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  await db.update(tillSessions).set({ ...data, status: 'closed', closedAt: new Date() } as any).where(eq(tillSessions.id, id));
}

// ─── WHATSAPP ────────────────────────────────────────────────
export async function listWhatsappTemplates() {
  const db = await getDb(); if (!db) return [];
  return db.select().from(whatsappTemplates).orderBy(asc(whatsappTemplates.name));
}
export async function createWhatsappTemplate(data: typeof whatsappTemplates.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const r = await db.insert(whatsappTemplates).values(data);
  return { id: r[0].insertId };
}
export async function listWhatsappMessages(opts: { customerId?: number; phone?: string; limit?: number } = {}) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (opts.customerId) conditions.push(eq(whatsappMessages.customerId, opts.customerId));
  if (opts.phone) conditions.push(eq(whatsappMessages.phone, opts.phone));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(whatsappMessages).where(where).orderBy(desc(whatsappMessages.createdAt)).limit(opts.limit ?? 100);
}
export async function logWhatsappMessage(data: typeof whatsappMessages.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const r = await db.insert(whatsappMessages).values(data);
  return { id: r[0].insertId };
}

// ─── STAFF ───────────────────────────────────────────────────
export async function getStaffProfile(userId: number) {
  const db = await getDb(); if (!db) return undefined;
  const r = await db.select().from(staffProfiles).where(eq(staffProfiles.userId, userId)).limit(1);
  return r[0];
}
export async function listStaffWithProfiles(limit = 50) {
  const db = await getDb(); if (!db) return [];
  return db.select({ user: users, profile: staffProfiles }).from(users).leftJoin(staffProfiles, eq(users.id, staffProfiles.userId)).where(or(eq(users.role, 'staff'), eq(users.role, 'manager'))).orderBy(desc(users.createdAt)).limit(limit);
}
export async function upsertStaffProfile(data: typeof staffProfiles.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const existing = await getStaffProfile(data.userId);
  if (existing) { await db.update(staffProfiles).set(data).where(eq(staffProfiles.userId, data.userId)); return { id: existing.id }; }
  const r = await db.insert(staffProfiles).values(data);
  return { id: r[0].insertId };
}

export async function listShifts(opts: { userId?: number; storeId?: number; limit?: number } = {}) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (opts.userId) conditions.push(eq(shifts.userId, opts.userId));
  if (opts.storeId) conditions.push(eq(shifts.storeId, opts.storeId));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(shifts).where(where).orderBy(desc(shifts.shiftDate)).limit(opts.limit ?? 50);
}
export async function createShift(data: typeof shifts.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const r = await db.insert(shifts).values(data);
  return { id: r[0].insertId };
}

export async function listTasks(opts: { assignedTo?: number; storeId?: number; status?: string; limit?: number } = {}) {
  const db = await getDb(); if (!db) return [];
  const conditions = [];
  if (opts.assignedTo) conditions.push(eq(tasks.assignedTo, opts.assignedTo));
  if (opts.storeId) conditions.push(eq(tasks.storeId, opts.storeId));
  if (opts.status) conditions.push(eq(tasks.status, opts.status as any));
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(tasks).where(where).orderBy(desc(tasks.createdAt)).limit(opts.limit ?? 50);
}
export async function createTask(data: typeof tasks.$inferInsert) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  const r = await db.insert(tasks).values(data);
  return { id: r[0].insertId };
}
export async function updateTask(id: number, data: Partial<typeof tasks.$inferInsert>) {
  const db = await getDb(); if (!db) throw new Error("DB unavailable");
  await db.update(tasks).set(data).where(eq(tasks.id, id));
}

// ─── ANALYTICS ───────────────────────────────────────────────
export async function getSalesAnalytics(opts: { storeId?: number; startDate?: Date; endDate?: Date } = {}) {
  const db = await getDb(); if (!db) return { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };
  const conditions = [eq(orders.status, 'completed')];
  if (opts.storeId) conditions.push(eq(orders.storeId, opts.storeId));
  if (opts.startDate) conditions.push(gte(orders.createdAt, opts.startDate));
  if (opts.endDate) conditions.push(lte(orders.createdAt, opts.endDate));
  const r = await db.select({
    totalRevenue: sql<string>`COALESCE(SUM(${orders.totalAmount}), 0)`,
    totalOrders: sql<number>`COUNT(*)`,
    avgOrderValue: sql<string>`COALESCE(AVG(${orders.totalAmount}), 0)`,
  }).from(orders).where(and(...conditions));
  return r[0] ?? { totalRevenue: '0', totalOrders: 0, avgOrderValue: '0' };
}

export async function getTopProducts(limit = 10) {
  const db = await getDb(); if (!db) return [];
  return db.select({
    productId: orderItems.productId,
    productName: orderItems.productName,
    totalQuantity: sql<number>`SUM(${orderItems.quantity})`,
    totalRevenue: sql<string>`SUM(${orderItems.totalPrice})`,
  }).from(orderItems).groupBy(orderItems.productId, orderItems.productName).orderBy(sql`SUM(${orderItems.totalPrice}) DESC`).limit(limit);
}

export async function getCustomerCount() {
  const db = await getDb(); if (!db) return 0;
  const r = await db.select({ count: sql<number>`COUNT(*)` }).from(customers);
  return r[0]?.count ?? 0;
}

export async function getProductCount() {
  const db = await getDb(); if (!db) return 0;
  const r = await db.select({ count: sql<number>`COUNT(*)` }).from(products).where(eq(products.isActive, true));
  return r[0]?.count ?? 0;
}

export async function getLowStockCount() {
  const db = await getDb(); if (!db) return 0;
  const r = await db.select({ count: sql<number>`COUNT(*)` }).from(inventoryLevels).where(sql`${inventoryLevels.quantity} <= ${inventoryLevels.reorderLevel}`);
  return r[0]?.count ?? 0;
}

export async function getRecentOrders(limit = 10) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit);
}
