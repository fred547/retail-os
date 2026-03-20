import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  bigint,
  json,
} from "drizzle-orm/mysql-core";

// ─────────────────────────────────────────────────────────────
// 1. IDENTITY & ACCESS
// ─────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "manager", "staff", "customer"]).default("staff").notNull(),
  storeId: int("storeId"),
  avatarUrl: text("avatarUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const stores = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  code: varchar("code", { length: 32 }).notNull().unique(),
  address: text("address"),
  phone: varchar("phone", { length: 32 }),
  email: varchar("email", { length: 320 }),
  timezone: varchar("timezone", { length: 64 }).default("UTC"),
  currency: varchar("currency", { length: 8 }).default("MUR"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  deviceType: mysqlEnum("deviceType", ["pos", "staff_mobile", "desktop", "kiosk", "kitchen_display"]).notNull(),
  storeId: int("storeId").notNull(),
  assignedUserId: int("assignedUserId"),
  hardwareId: varchar("hardwareId", { length: 255 }),
  osInfo: varchar("osInfo", { length: 255 }),
  appVersion: varchar("appVersion", { length: 64 }),
  provisioningCode: varchar("provisioningCode", { length: 128 }),
  status: mysqlEnum("status", ["active", "inactive", "revoked", "ghost"]).default("inactive").notNull(),
  lastSeenAt: timestamp("lastSeenAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const deviceSessions = mysqlTable("device_sessions", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  userId: int("userId").notNull(),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  endedAt: timestamp("endedAt"),
  ipAddress: varchar("ipAddress", { length: 64 }),
});

// ─────────────────────────────────────────────────────────────
// 2. COMMERCE — Products & Categories
// ─────────────────────────────────────────────────────────────

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: int("parentId"),
  imageUrl: text("imageUrl"),
  sortOrder: int("sortOrder").default(0),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  sku: varchar("sku", { length: 64 }).notNull().unique(),
  barcode: varchar("barcode", { length: 128 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  categoryId: int("categoryId"),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  costPrice: decimal("costPrice", { precision: 12, scale: 2 }),
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("15.00"),
  unit: varchar("unit", { length: 32 }).default("each"),
  imageUrl: text("imageUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  isRecurring: boolean("isRecurring").default(false).notNull(),
  loyaltyPointsEarn: int("loyaltyPointsEarn").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const priceRules = mysqlTable("price_rules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  productId: int("productId"),
  categoryId: int("categoryId"),
  discountType: mysqlEnum("discountType", ["percentage", "fixed", "buy_x_get_y"]).notNull(),
  discountValue: decimal("discountValue", { precision: 12, scale: 2 }).notNull(),
  minQuantity: int("minQuantity").default(1),
  startDate: timestamp("startDate"),
  endDate: timestamp("endDate"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────
// 3. INVENTORY
// ─────────────────────────────────────────────────────────────

export const warehouses = mysqlTable("warehouses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  storeId: int("storeId"),
  address: text("address"),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const inventoryLevels = mysqlTable("inventory_levels", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  warehouseId: int("warehouseId").notNull(),
  quantity: int("quantity").default(0).notNull(),
  reorderLevel: int("reorderLevel").default(10),
  reorderQuantity: int("reorderQuantity").default(50),
  lastCountedAt: timestamp("lastCountedAt"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const stockAdjustments = mysqlTable("stock_adjustments", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  warehouseId: int("warehouseId").notNull(),
  adjustmentType: mysqlEnum("adjustmentType", [
    "received", "sold", "returned", "damaged", "counted", "transferred", "write_off",
  ]).notNull(),
  quantity: int("quantity").notNull(),
  previousQuantity: int("previousQuantity").notNull(),
  newQuantity: int("newQuantity").notNull(),
  reason: text("reason"),
  performedBy: int("performedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────
// 4. CUSTOMERS & CRM
// ─────────────────────────────────────────────────────────────

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 128 }).notNull(),
  lastName: varchar("lastName", { length: 128 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  whatsappPhone: varchar("whatsappPhone", { length: 32 }),
  dateOfBirth: timestamp("dateOfBirth"),
  gender: mysqlEnum("gender", ["male", "female", "other", "unspecified"]).default("unspecified"),
  notes: text("notes"),
  tags: json("tags"),
  preferredStoreId: int("preferredStoreId"),
  whatsappOptIn: boolean("whatsappOptIn").default(false).notNull(),
  totalSpent: decimal("totalSpent", { precision: 14, scale: 2 }).default("0.00"),
  totalOrders: int("totalOrders").default(0),
  lastOrderAt: timestamp("lastOrderAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const customerAddresses = mysqlTable("customer_addresses", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  label: varchar("label", { length: 64 }).default("home"),
  addressLine1: varchar("addressLine1", { length: 255 }).notNull(),
  addressLine2: varchar("addressLine2", { length: 255 }),
  city: varchar("city", { length: 128 }),
  region: varchar("region", { length: 128 }),
  postalCode: varchar("postalCode", { length: 32 }),
  country: varchar("country", { length: 64 }).default("Mauritius"),
  isDefault: boolean("isDefault").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────
// 5. LOYALTY
// ─────────────────────────────────────────────────────────────

export const loyaltyTiers = mysqlTable("loyalty_tiers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  minPoints: int("minPoints").default(0).notNull(),
  multiplier: decimal("multiplier", { precision: 4, scale: 2 }).default("1.00"),
  benefits: json("benefits"),
  color: varchar("color", { length: 16 }),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const loyaltyAccounts = mysqlTable("loyalty_accounts", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId").notNull(),
  tierId: int("tierId"),
  pointsBalance: int("pointsBalance").default(0).notNull(),
  lifetimePoints: int("lifetimePoints").default(0).notNull(),
  lifetimeRedeemed: int("lifetimeRedeemed").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const loyaltyTransactions = mysqlTable("loyalty_transactions", {
  id: int("id").autoincrement().primaryKey(),
  accountId: int("accountId").notNull(),
  customerId: int("customerId").notNull(),
  type: mysqlEnum("type", ["earn", "redeem", "adjust", "expire", "bonus"]).notNull(),
  points: int("points").notNull(),
  balanceAfter: int("balanceAfter").notNull(),
  orderId: int("orderId"),
  description: text("description"),
  performedBy: int("performedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const loyaltyMilestones = mysqlTable("loyalty_milestones", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  triggerType: mysqlEnum("triggerType", ["points_earned", "orders_count", "total_spent", "tier_upgrade"]).notNull(),
  triggerValue: int("triggerValue").notNull(),
  rewardType: mysqlEnum("rewardType", ["bonus_points", "voucher", "notification"]).notNull(),
  rewardValue: varchar("rewardValue", { length: 255 }),
  whatsappTemplate: varchar("whatsappTemplate", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────
// 6. ORDERS & PAYMENTS
// ─────────────────────────────────────────────────────────────

export const tillSessions = mysqlTable("till_sessions", {
  id: int("id").autoincrement().primaryKey(),
  deviceId: int("deviceId").notNull(),
  userId: int("userId").notNull(),
  storeId: int("storeId").notNull(),
  openingBalance: decimal("openingBalance", { precision: 12, scale: 2 }).notNull(),
  closingBalance: decimal("closingBalance", { precision: 12, scale: 2 }),
  expectedBalance: decimal("expectedBalance", { precision: 12, scale: 2 }),
  discrepancy: decimal("discrepancy", { precision: 12, scale: 2 }),
  discrepancyNote: text("discrepancyNote"),
  status: mysqlEnum("status", ["open", "closed", "reconciled"]).default("open").notNull(),
  openedAt: timestamp("openedAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
  reconciliationPdfUrl: text("reconciliationPdfUrl"),
});

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 64 }).notNull().unique(),
  storeId: int("storeId").notNull(),
  customerId: int("customerId"),
  userId: int("userId").notNull(),
  deviceId: int("deviceId"),
  tillSessionId: int("tillSessionId"),
  channel: mysqlEnum("channel", ["pos", "online", "whatsapp", "phone"]).default("pos").notNull(),
  status: mysqlEnum("status", ["pending", "completed", "refunded", "partially_refunded", "cancelled", "on_hold"]).default("pending").notNull(),
  subtotal: decimal("subtotal", { precision: 14, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 14, scale: 2 }).default("0.00"),
  discountAmount: decimal("discountAmount", { precision: 14, scale: 2 }).default("0.00"),
  totalAmount: decimal("totalAmount", { precision: 14, scale: 2 }).notNull(),
  loyaltyPointsEarned: int("loyaltyPointsEarned").default(0),
  loyaltyPointsRedeemed: int("loyaltyPointsRedeemed").default(0),
  notes: text("notes"),
  offlineSyncId: varchar("offlineSyncId", { length: 128 }),
  syncedAt: timestamp("syncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  sku: varchar("sku", { length: 64 }),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).default("0.00"),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 }).default("0.00"),
  totalPrice: decimal("totalPrice", { precision: 12, scale: 2 }).notNull(),
});

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  method: mysqlEnum("method", ["cash", "card", "qr", "mobile_money", "voucher", "loyalty_points", "split"]).notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  reference: varchar("reference", { length: 255 }),
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("completed").notNull(),
  processedAt: timestamp("processedAt").defaultNow().notNull(),
});

export const refunds = mysqlTable("refunds", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  reason: text("reason"),
  processedBy: int("processedBy").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "completed", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────
// 7. WHATSAPP & MESSAGING
// ─────────────────────────────────────────────────────────────

export const whatsappTemplates = mysqlTable("whatsapp_templates", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  category: mysqlEnum("category", ["receipt", "loyalty", "promotion", "support", "booking", "general"]).notNull(),
  bodyTemplate: text("bodyTemplate").notNull(),
  variables: json("variables"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const whatsappMessages = mysqlTable("whatsapp_messages", {
  id: int("id").autoincrement().primaryKey(),
  customerId: int("customerId"),
  phone: varchar("phone", { length: 32 }).notNull(),
  direction: mysqlEnum("direction", ["inbound", "outbound"]).notNull(),
  templateId: int("templateId"),
  messageType: mysqlEnum("messageType", ["text", "template", "media", "interactive"]).default("text").notNull(),
  content: text("content"),
  mediaUrl: text("mediaUrl"),
  status: mysqlEnum("status", ["queued", "sent", "delivered", "read", "failed"]).default("queued").notNull(),
  externalMessageId: varchar("externalMessageId", { length: 255 }),
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const notificationLog = mysqlTable("notification_log", {
  id: int("id").autoincrement().primaryKey(),
  recipientType: mysqlEnum("recipientType", ["customer", "staff"]).notNull(),
  recipientId: int("recipientId").notNull(),
  channel: mysqlEnum("channel", ["whatsapp", "email", "push", "sms"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  status: mysqlEnum("status", ["sent", "failed", "pending"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────
// 8. STAFF & HR
// ─────────────────────────────────────────────────────────────

export const staffProfiles = mysqlTable("staff_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  employeeCode: varchar("employeeCode", { length: 32 }),
  department: varchar("department", { length: 128 }),
  position: varchar("position", { length: 128 }),
  hireDate: timestamp("hireDate"),
  emergencyContact: varchar("emergencyContact", { length: 255 }),
  emergencyPhone: varchar("emergencyPhone", { length: 32 }),
  bankAccountNumber: varchar("bankAccountNumber", { length: 64 }),
  skills: json("skills"),
  hobbies: text("hobbies"),
  bio: text("bio"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const shifts = mysqlTable("shifts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  storeId: int("storeId").notNull(),
  shiftDate: timestamp("shiftDate").notNull(),
  startTime: varchar("startTime", { length: 8 }).notNull(),
  endTime: varchar("endTime", { length: 8 }).notNull(),
  status: mysqlEnum("status", ["scheduled", "approved", "in_progress", "completed", "cancelled"]).default("scheduled").notNull(),
  approvedBy: int("approvedBy"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const leaveRequests = mysqlTable("leave_requests", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  leaveType: mysqlEnum("leaveType", ["annual", "sick", "personal", "training", "unpaid"]).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "cancelled"]).default("pending").notNull(),
  approvedBy: int("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  category: mysqlEnum("category", ["transport", "bus_fare", "supplies", "meals", "other"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  receiptUrl: text("receiptUrl"),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "paid"]).default("pending").notNull(),
  approvedBy: int("approvedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const warnings = mysqlTable("warnings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  issuedBy: int("issuedBy").notNull(),
  severity: mysqlEnum("severity", ["verbal", "written", "final", "termination"]).notNull(),
  reason: text("reason").notNull(),
  voiceRecordingUrl: text("voiceRecordingUrl"),
  signatureUrl: text("signatureUrl"),
  acknowledged: boolean("acknowledged").default(false).notNull(),
  acknowledgedAt: timestamp("acknowledgedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assignedTo: int("assignedTo"),
  assignedBy: int("assignedBy").notNull(),
  storeId: int("storeId"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────
// 9. ASSETS
// ─────────────────────────────────────────────────────────────

export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  assetType: mysqlEnum("assetType", [
    "phone", "computer", "vehicle", "fire_extinguisher", "furniture", "internet_service", "rental", "insurance", "other",
  ]).notNull(),
  serialNumber: varchar("serialNumber", { length: 128 }),
  storeId: int("storeId"),
  assignedTo: int("assignedTo"),
  purchaseDate: timestamp("purchaseDate"),
  expiryDate: timestamp("expiryDate"),
  renewalDate: timestamp("renewalDate"),
  value: decimal("value", { precision: 12, scale: 2 }),
  status: mysqlEnum("status", ["active", "maintenance", "retired", "lost"]).default("active").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const maintenanceLogs = mysqlTable("maintenance_logs", {
  id: int("id").autoincrement().primaryKey(),
  assetId: int("assetId").notNull(),
  description: text("description").notNull(),
  imageUrl: text("imageUrl"),
  cost: decimal("cost", { precision: 12, scale: 2 }),
  performedBy: int("performedBy"),
  scheduledDate: timestamp("scheduledDate"),
  completedDate: timestamp("completedDate"),
  status: mysqlEnum("status", ["scheduled", "in_progress", "completed"]).default("scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────
// 10. MARKETING & CAMPAIGNS
// ─────────────────────────────────────────────────────────────

export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  campaignType: mysqlEnum("campaignType", ["discount", "voucher", "loyalty_bonus", "flash_sale"]).notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate"),
  status: mysqlEnum("status", ["draft", "active", "paused", "completed"]).default("draft").notNull(),
  targetAudience: json("targetAudience"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const vouchers = mysqlTable("vouchers", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  campaignId: int("campaignId"),
  discountType: mysqlEnum("discountType", ["percentage", "fixed"]).notNull(),
  discountValue: decimal("discountValue", { precision: 12, scale: 2 }).notNull(),
  minOrderAmount: decimal("minOrderAmount", { precision: 12, scale: 2 }),
  maxUses: int("maxUses"),
  usedCount: int("usedCount").default(0).notNull(),
  validFrom: timestamp("validFrom"),
  validUntil: timestamp("validUntil"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// ─────────────────────────────────────────────────────────────
// 11. UTILITY BILLS & FINANCE (Lightweight)
// ─────────────────────────────────────────────────────────────

export const utilityBills = mysqlTable("utility_bills", {
  id: int("id").autoincrement().primaryKey(),
  storeId: int("storeId").notNull(),
  billType: mysqlEnum("billType", ["electricity", "water", "internet", "rent", "insurance", "other"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  billingPeriod: varchar("billingPeriod", { length: 32 }),
  dueDate: timestamp("dueDate"),
  paidDate: timestamp("paidDate"),
  receiptUrl: text("receiptUrl"),
  status: mysqlEnum("status", ["pending", "paid", "overdue"]).default("pending").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
