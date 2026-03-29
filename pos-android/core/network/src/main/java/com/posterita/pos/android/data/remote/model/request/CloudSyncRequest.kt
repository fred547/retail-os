package com.posterita.pos.android.data.remote.model.request

import com.google.gson.annotations.SerializedName

/**
 * Sync protocol version — increment when making breaking changes.
 * Server checks this and returns 426 if the client is too old.
 */
const val SYNC_VERSION = 2

/**
 * Request body for the cloud sync endpoint.
 * Sends local changes and receives server updates.
 */
data class CloudSyncRequest(
    @SerializedName("account_id") val accountId: String,
    @SerializedName("terminal_id") val terminalId: Int,
    @SerializedName("store_id") val storeId: Int,
    @SerializedName("last_sync_at") val lastSyncAt: String,
    @SerializedName("client_sync_version") val clientSyncVersion: Int = SYNC_VERSION,
    // Device registration
    @SerializedName("device_id") val deviceId: String? = null,
    @SerializedName("device_name") val deviceName: String? = null,
    @SerializedName("device_model") val deviceModel: String? = null,
    @SerializedName("os_version") val osVersion: String? = null,
    @SerializedName("app_version") val appVersion: String? = null,
    // Push: terminal → cloud (transactional)
    @SerializedName("orders") val orders: List<SyncOrder>? = null,
    @SerializedName("order_lines") val orderLines: List<SyncOrderLine>? = null,
    @SerializedName("payments") val payments: List<SyncPayment>? = null,
    @SerializedName("tills") val tills: List<SyncTill>? = null,
    @SerializedName("customers") val customers: List<SyncCustomer>? = null,
    // Push: terminal → cloud (master data)
    @SerializedName("stores") val stores: List<SyncStore>? = null,
    @SerializedName("terminals") val terminals: List<SyncTerminal>? = null,
    @SerializedName("users") val users: List<SyncUser>? = null,
    @SerializedName("categories") val categories: List<SyncCategory>? = null,
    @SerializedName("products") val products: List<SyncProduct>? = null,
    @SerializedName("taxes") val taxes: List<SyncTax>? = null,
    // Push: restaurant tables
    @SerializedName("restaurant_tables") val restaurantTables: List<SyncRestaurantTable>? = null,
    // Push: inventory count entries
    @SerializedName("inventory_count_entries") val inventoryCountEntries: List<SyncInventoryCountEntry>? = null,
    // Push: error logs for remote debugging
    @SerializedName("error_logs") val errorLogs: List<SyncErrorLog>? = null,
    // Push: serial item status updates (sold/delivered/returned)
    @SerializedName("serial_items") val serialItems: List<SyncSerialItem>? = null,
    // Push: deliveries created at POS
    @SerializedName("deliveries") val deliveries: List<SyncDelivery>? = null,
    // Push: shifts (clock in/out) created offline
    @SerializedName("shifts") val shifts: List<SyncShift>? = null,
    // Push: audit events for fraud prevention
    @SerializedName("audit_events") val auditEvents: List<SyncAuditEvent>? = null,
    // Integrity: SHA-256 hash of critical push data (orders UUIDs + tills UUIDs + grand totals)
    @SerializedName("payload_checksum") val payloadChecksum: String? = null,
    // Pull pagination — request a specific page of products/customers
    @SerializedName("pull_page") val pullPage: Int = 0,
    @SerializedName("pull_page_size") val pullPageSize: Int = 1000,
)

data class SyncOrder(
    @SerializedName("order_id") val orderId: Int,
    @SerializedName("customer_id") val customerId: Int = 0,
    @SerializedName("sales_rep_id") val salesRepId: Int = 0,
    @SerializedName("till_id") val tillId: Int = 0,
    @SerializedName("till_uuid") val tillUuid: String? = null,
    @SerializedName("terminal_id") val terminalId: Int = 0,
    @SerializedName("store_id") val storeId: Int = 0,
    @SerializedName("order_type") val orderType: String? = null,
    @SerializedName("document_no") val documentNo: String? = null,
    @SerializedName("doc_status") val docStatus: String? = null,
    @SerializedName("is_paid") val isPaid: Boolean = false,
    @SerializedName("tax_total") val taxTotal: Double = 0.0,
    @SerializedName("grand_total") val grandTotal: Double = 0.0,
    @SerializedName("qty_total") val qtyTotal: Double = 0.0,
    @SerializedName("subtotal") val subtotal: Double = 0.0,
    @SerializedName("date_ordered") val dateOrdered: String? = null,
    @SerializedName("json") val json: Map<String, Any?>? = null,
    @SerializedName("uuid") val uuid: String? = null,
    @SerializedName("currency") val currency: String? = null,
    @SerializedName("tips") val tips: Double = 0.0,
    @SerializedName("note") val note: String? = null,
    @SerializedName("couponids") val couponids: String? = null,
)

data class SyncOrderLine(
    @SerializedName("orderline_id") val orderLineId: Int,
    @SerializedName("order_id") val orderId: Int,
    @SerializedName("product_id") val productId: Int,
    @SerializedName("productcategory_id") val productCategoryId: Int = 0,
    @SerializedName("tax_id") val taxId: Int = 0,
    @SerializedName("qtyentered") val qtyEntered: Double = 0.0,
    @SerializedName("lineamt") val lineAmt: Double = 0.0,
    @SerializedName("linenetamt") val lineNetAmt: Double = 0.0,
    @SerializedName("priceentered") val priceEntered: Double = 0.0,
    @SerializedName("costamt") val costAmt: Double = 0.0,
    @SerializedName("productname") val productName: String? = null,
    @SerializedName("productdescription") val productDescription: String? = null,
    @SerializedName("serial_item_id") val serialItemId: Int? = null,
)

data class SyncPayment(
    @SerializedName("payment_id") val paymentId: Int,
    @SerializedName("order_id") val orderId: Int = 0,
    @SerializedName("document_no") val documentNo: String? = null,
    @SerializedName("tendered") val tendered: Double = 0.0,
    @SerializedName("amount") val amount: Double = 0.0,
    @SerializedName("change") val change: Double = 0.0,
    @SerializedName("payment_type") val paymentType: String? = null,
    @SerializedName("date_paid") val datePaid: String? = null,
    @SerializedName("pay_amt") val payAmt: Double = 0.0,
    @SerializedName("status") val status: String? = null,
    @SerializedName("checknumber") val checkNumber: String? = null,
)

data class SyncTill(
    @SerializedName("till_id") val tillId: Int,
    @SerializedName("store_id") val storeId: Int = 0,
    @SerializedName("terminal_id") val terminalId: Int = 0,
    @SerializedName("open_by") val openBy: Int = 0,
    @SerializedName("close_by") val closeBy: Int = 0,
    @SerializedName("opening_amt") val openingAmt: Double = 0.0,
    @SerializedName("closing_amt") val closingAmt: Double = 0.0,
    @SerializedName("date_opened") val dateOpened: String? = null,
    @SerializedName("date_closed") val dateClosed: String? = null,
    @SerializedName("json") val json: Map<String, Any?>? = null,
    @SerializedName("uuid") val uuid: String? = null,
    @SerializedName("documentno") val documentNo: String? = null,
    @SerializedName("vouchers") val vouchers: String? = null,
    @SerializedName("adjustmenttotal") val adjustmentTotal: Double = 0.0,
    @SerializedName("cashamt") val cashAmt: Double = 0.0,
    @SerializedName("cardamt") val cardAmt: Double = 0.0,
    @SerializedName("subtotal") val subtotal: Double = 0.0,
    @SerializedName("taxtotal") val taxTotal: Double = 0.0,
    @SerializedName("grandtotal") val grandTotal: Double = 0.0,
    @SerializedName("forexcurrency") val forexCurrency: String? = null,
    @SerializedName("forexamt") val forexAmt: Double = 0.0,
    @SerializedName("status") val status: String = "closed",
)

data class SyncCustomer(
    @SerializedName("customer_id") val customerId: Int,
    @SerializedName("name") val name: String? = null,
    @SerializedName("identifier") val identifier: String? = null,
    @SerializedName("phone1") val phone1: String? = null,
    @SerializedName("phone2") val phone2: String? = null,
    @SerializedName("mobile") val mobile: String? = null,
    @SerializedName("email") val email: String? = null,
    @SerializedName("address1") val address1: String? = null,
    @SerializedName("address2") val address2: String? = null,
    @SerializedName("city") val city: String? = null,
    @SerializedName("state") val state: String? = null,
    @SerializedName("zip") val zip: String? = null,
    @SerializedName("country") val country: String? = null,
    @SerializedName("credit_limit") val creditLimit: Double = 0.0,
    @SerializedName("balance") val balance: Double = 0.0,
    @SerializedName("isactive") val isActive: String? = "Y",
    @SerializedName("loyalty_points") val loyaltyPoints: Int = 0,
    @SerializedName("discountcode_id") val discountCodeId: Int = 0,
    @SerializedName("gender") val gender: String? = null,
    @SerializedName("dob") val dob: String? = null,
    @SerializedName("regno") val regno: String? = null,
    @SerializedName("note") val note: String? = null,
    @SerializedName("creditterm") val creditTerm: Int = 0,
)

data class SyncStore(
    @SerializedName("store_id") val storeId: Int,
    @SerializedName("name") val name: String? = null,
    @SerializedName("address") val address: String? = null,
    @SerializedName("city") val city: String? = null,
    @SerializedName("state") val state: String? = null,
    @SerializedName("zip") val zip: String? = null,
    @SerializedName("country") val country: String? = null,
    @SerializedName("currency") val currency: String? = null,
    @SerializedName("isactive") val isActive: String? = "Y",
)

data class SyncTerminal(
    @SerializedName("terminal_id") val terminalId: Int,
    @SerializedName("store_id") val storeId: Int = 0,
    @SerializedName("name") val name: String? = null,
    @SerializedName("prefix") val prefix: String? = null,
    @SerializedName("sequence") val sequence: Int = 0,
    @SerializedName("cash_up_sequence") val cashUpSequence: Int = 0,
    @SerializedName("isactive") val isActive: String? = "Y",
)

data class SyncUser(
    @SerializedName("user_id") val userId: Int,
    @SerializedName("username") val username: String? = null,
    @SerializedName("firstname") val firstname: String? = null,
    @SerializedName("lastname") val lastname: String? = null,
    @SerializedName("pin") val pin: String? = null,
    @SerializedName("role") val role: String? = null,
    @SerializedName("isadmin") val isAdmin: String? = null,
    @SerializedName("issalesrep") val isSalesRep: String? = null,
    @SerializedName("permissions") val permissions: String? = null,
    @SerializedName("discountlimit") val discountLimit: Double = 0.0,
    @SerializedName("isactive") val isActive: String? = "Y",
)

data class SyncCategory(
    @SerializedName("productcategory_id") val productCategoryId: Int,
    @SerializedName("name") val name: String? = null,
    @SerializedName("isactive") val isActive: String? = "Y",
    @SerializedName("display") val display: String? = null,
    @SerializedName("position") val position: Int = 0,
    @SerializedName("tax_id") val taxId: String? = null,
)

data class SyncProduct(
    @SerializedName("product_id") val productId: Int,
    @SerializedName("name") val name: String? = null,
    @SerializedName("description") val description: String? = null,
    @SerializedName("sellingprice") val sellingPrice: Double = 0.0,
    @SerializedName("costprice") val costPrice: Double = 0.0,
    @SerializedName("taxamount") val taxAmount: Double = 0.0,
    @SerializedName("tax_id") val taxId: Int = 0,
    @SerializedName("productcategory_id") val productCategoryId: Int = 0,
    @SerializedName("image") val image: String? = null,
    @SerializedName("upc") val upc: String? = null,
    @SerializedName("itemcode") val itemCode: String? = null,
    @SerializedName("barcodetype") val barcodeType: String? = null,
    @SerializedName("isactive") val isActive: String? = "Y",
    @SerializedName("istaxincluded") val isTaxIncluded: String? = null,
    @SerializedName("isstock") val isStock: String? = null,
    @SerializedName("isvariableitem") val isVariableItem: String? = null,
    @SerializedName("iskitchenitem") val isKitchenItem: String? = null,
    @SerializedName("ismodifier") val isModifier: String? = null,
    @SerializedName("isfavourite") val isFavourite: String? = null,
    @SerializedName("wholesaleprice") val wholesalePrice: Double = 0.0,
    @SerializedName("needs_price_review") val needsPriceReview: String? = null,
    @SerializedName("price_set_by") val priceSetBy: Int = 0,
)

data class SyncTax(
    @SerializedName("tax_id") val taxId: Int,
    @SerializedName("name") val name: String? = null,
    @SerializedName("rate") val rate: Double = 0.0,
    @SerializedName("taxcode") val taxCode: String? = null,
    @SerializedName("isactive") val isActive: String? = "Y",
)

data class SyncRestaurantTable(
    @SerializedName("table_id") val tableId: Int,
    @SerializedName("table_name") val tableName: String,
    @SerializedName("seats") val seats: Int = 4,
    @SerializedName("is_occupied") val isOccupied: Boolean = false,
    @SerializedName("current_order_id") val currentOrderId: String? = null,
    @SerializedName("store_id") val storeId: Int = 0,
    @SerializedName("terminal_id") val terminalId: Int = 0,
    @SerializedName("created") val created: Long = 0,
    @SerializedName("updated") val updated: Long = 0,
)

data class SyncInventoryCountEntry(
    @SerializedName("session_id") val sessionId: Int,
    @SerializedName("product_id") val productId: Int,
    @SerializedName("product_name") val productName: String? = null,
    @SerializedName("upc") val upc: String? = null,
    @SerializedName("quantity") val quantity: Int = 1,
    @SerializedName("scanned_by") val scannedBy: Int = 0,
    @SerializedName("terminal_id") val terminalId: Int = 0,
)

data class SyncErrorLog(
    @SerializedName("id") val id: Long,
    @SerializedName("timestamp") val timestamp: Long,
    @SerializedName("severity") val severity: String,
    @SerializedName("tag") val tag: String,
    @SerializedName("message") val message: String,
    @SerializedName("stacktrace") val stacktrace: String? = null,
    @SerializedName("screen") val screen: String? = null,
    @SerializedName("user_id") val userId: Int = 0,
    @SerializedName("user_name") val userName: String? = null,
    @SerializedName("store_id") val storeId: Int = 0,
    @SerializedName("terminal_id") val terminalId: Int = 0,
    @SerializedName("account_id") val accountId: String? = null,
    @SerializedName("device_id") val deviceId: String? = null,
    @SerializedName("app_version") val appVersion: String? = null,
    @SerializedName("os_version") val osVersion: String? = null,
)

data class SyncSerialItem(
    @SerializedName("serial_item_id") val serialItemId: Int,
    @SerializedName("serial_number") val serialNumber: String,
    @SerializedName("product_id") val productId: Int = 0,
    @SerializedName("store_id") val storeId: Int = 0,
    @SerializedName("serial_type") val serialType: String = "serial",
    @SerializedName("status") val status: String = "in_stock",
    @SerializedName("order_id") val orderId: Int? = null,
    @SerializedName("orderline_id") val orderlineId: Int? = null,
    @SerializedName("customer_id") val customerId: Int? = null,
    @SerializedName("sold_date") val soldDate: String? = null,
    @SerializedName("selling_price") val sellingPrice: Double? = null,
    @SerializedName("delivered_date") val deliveredDate: String? = null,
)

data class SyncDelivery(
    @SerializedName("order_id") val orderId: Int? = null,
    @SerializedName("store_id") val storeId: Int = 0,
    @SerializedName("customer_id") val customerId: Int? = null,
    @SerializedName("customer_name") val customerName: String? = null,
    @SerializedName("customer_phone") val customerPhone: String? = null,
    @SerializedName("delivery_address") val deliveryAddress: String? = null,
    @SerializedName("delivery_city") val deliveryCity: String? = null,
    @SerializedName("delivery_notes") val deliveryNotes: String? = null,
    @SerializedName("driver_id") val driverId: Int? = null,
    @SerializedName("driver_name") val driverName: String? = null,
    @SerializedName("status") val status: String = "pending",
    @SerializedName("estimated_time") val estimatedTime: String? = null,
    @SerializedName("actual_delivery_at") val actualDeliveryAt: String? = null,
    @SerializedName("assigned_at") val assignedAt: String? = null,
    @SerializedName("picked_up_at") val pickedUpAt: String? = null,
    @SerializedName("distance_km") val distanceKm: Double? = null,
    @SerializedName("delivery_fee") val deliveryFee: Double? = null,
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("updated_at") val updatedAt: String? = null,
)

data class SyncShift(
    @SerializedName("uuid") val uuid: String,
    @SerializedName("store_id") val storeId: Int = 0,
    @SerializedName("terminal_id") val terminalId: Int = 0,
    @SerializedName("user_id") val userId: Int = 0,
    @SerializedName("user_name") val userName: String? = null,
    @SerializedName("clock_in") val clockIn: String? = null,
    @SerializedName("clock_out") val clockOut: String? = null,
    @SerializedName("break_minutes") val breakMinutes: Int = 0,
    @SerializedName("hours_worked") val hoursWorked: Double? = null,
    @SerializedName("notes") val notes: String? = null,
    @SerializedName("status") val status: String = "active",
    @SerializedName("created_at") val createdAt: String? = null,
    @SerializedName("scheduled_start") val scheduledStart: String? = null,
    @SerializedName("scheduled_end") val scheduledEnd: String? = null,
    @SerializedName("overtime_minutes") val overtimeMinutes: Int? = null,
    @SerializedName("is_late") val isLate: Boolean? = null,
    @SerializedName("late_minutes") val lateMinutes: Int? = null,
    @SerializedName("total_break_minutes") val totalBreakMinutes: Int? = null,
)

data class SyncAuditEvent(
    @SerializedName("id") val id: Long,
    @SerializedName("timestamp") val timestamp: Long,
    @SerializedName("user_id") val userId: Int,
    @SerializedName("user_name") val userName: String? = null,
    @SerializedName("action") val action: String,
    @SerializedName("detail") val detail: String? = null,
    @SerializedName("reason") val reason: String? = null,
    @SerializedName("supervisor_id") val supervisorId: Int? = null,
    @SerializedName("store_id") val storeId: Int = 0,
    @SerializedName("terminal_id") val terminalId: Int = 0,
    @SerializedName("order_id") val orderId: String? = null,
    @SerializedName("amount") val amount: Double? = null,
)
