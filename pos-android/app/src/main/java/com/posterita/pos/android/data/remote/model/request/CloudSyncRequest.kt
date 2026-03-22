package com.posterita.pos.android.data.remote.model.request

import com.google.gson.annotations.SerializedName

/**
 * Request body for the cloud sync endpoint.
 * Sends local changes and receives server updates.
 */
data class CloudSyncRequest(
    @SerializedName("account_id") val accountId: String,
    @SerializedName("terminal_id") val terminalId: Int,
    @SerializedName("store_id") val storeId: Int,
    @SerializedName("last_sync_at") val lastSyncAt: String,
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
    // Push: error logs for remote debugging
    @SerializedName("error_logs") val errorLogs: List<SyncErrorLog>? = null,
)

data class SyncOrder(
    @SerializedName("order_id") val orderId: Int,
    @SerializedName("customer_id") val customerId: Int = 0,
    @SerializedName("sales_rep_id") val salesRepId: Int = 0,
    @SerializedName("till_id") val tillId: Int = 0,
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
