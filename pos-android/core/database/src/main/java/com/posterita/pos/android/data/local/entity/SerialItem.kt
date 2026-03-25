package com.posterita.pos.android.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "serial_item")
data class SerialItem(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "serial_item_id") val serialItemId: Int = 0,
    @ColumnInfo(name = "account_id") val accountId: String = "",
    @ColumnInfo(name = "product_id") val productId: Int = 0,
    @ColumnInfo(name = "store_id") val storeId: Int = 0,
    @ColumnInfo(name = "serial_number") val serialNumber: String = "",
    @ColumnInfo(name = "serial_type") val serialType: String = TYPE_SERIAL,
    @ColumnInfo(name = "status") val status: String = STATUS_IN_STOCK,

    // Receiving
    @ColumnInfo(name = "supplier_name") val supplierName: String? = null,
    @ColumnInfo(name = "purchase_date") val purchaseDate: String? = null,
    @ColumnInfo(name = "cost_price") val costPrice: Double = 0.0,

    // Sale
    @ColumnInfo(name = "order_id") val orderId: Int? = null,
    @ColumnInfo(name = "orderline_id") val orderlineId: Int? = null,
    @ColumnInfo(name = "customer_id") val customerId: Int? = null,
    @ColumnInfo(name = "sold_date") val soldDate: String? = null,
    @ColumnInfo(name = "selling_price") val sellingPrice: Double? = null,

    // Delivery & Warranty
    @ColumnInfo(name = "delivered_date") val deliveredDate: String? = null,
    @ColumnInfo(name = "warranty_months") val warrantyMonths: Int = 0,
    @ColumnInfo(name = "warranty_expiry") val warrantyExpiry: String? = null,

    // Vehicle-specific
    @ColumnInfo(name = "color") val color: String? = null,
    @ColumnInfo(name = "year") val year: Int? = null,
    @ColumnInfo(name = "engine_number") val engineNumber: String? = null,

    // Metadata
    @ColumnInfo(name = "notes") val notes: String? = null,
    @ColumnInfo(name = "is_deleted") val isDeleted: Boolean = false,
    @ColumnInfo(name = "is_sync") val isSync: Boolean = true,
) {
    companion object {
        // Serial types
        const val TYPE_VIN = "vin"
        const val TYPE_IMEI = "imei"
        const val TYPE_SERIAL = "serial"
        const val TYPE_CERTIFICATE = "certificate"

        // Status flow: received → in_stock → reserved → sold → delivered → returned → in_service
        const val STATUS_RECEIVED = "received"
        const val STATUS_IN_STOCK = "in_stock"
        const val STATUS_RESERVED = "reserved"
        const val STATUS_SOLD = "sold"
        const val STATUS_DELIVERED = "delivered"
        const val STATUS_RETURNED = "returned"
        const val STATUS_IN_SERVICE = "in_service"
    }

    /** Display label for the serial type */
    val displayType: String get() = when (serialType) {
        TYPE_VIN -> "VIN"
        TYPE_IMEI -> "IMEI"
        TYPE_CERTIFICATE -> "Certificate"
        else -> "Serial"
    }

    /** Is this item available for sale? */
    val isAvailable: Boolean get() = status == STATUS_IN_STOCK

    /** Is warranty still active? */
    val isUnderWarranty: Boolean get() {
        if (warrantyExpiry == null || warrantyMonths == 0) return false
        return try {
            warrantyExpiry > java.time.Instant.now().toString()
        } catch (_: Exception) { false }
    }
}
