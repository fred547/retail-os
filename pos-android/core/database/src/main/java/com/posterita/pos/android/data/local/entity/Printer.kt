package com.posterita.pos.android.data.local.entity

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "printer")
data class Printer(
    @PrimaryKey(autoGenerate = true)
    @ColumnInfo(name = "printer_id") val printerId: Int = 0,
    @ColumnInfo(name = "name") val name: String? = null,
    @ColumnInfo(name = "printer_type") val printerType: String? = null,
    @ColumnInfo(name = "width") val width: Int = 0,
    @ColumnInfo(name = "ip") val ip: String? = null,
    @ColumnInfo(name = "device_name") val deviceName: String? = null,
    @ColumnInfo(name = "print_receipt") val printReceipt: Boolean = true,
    @ColumnInfo(name = "print_kitchen") val printKitchen: Boolean = false,
    @ColumnInfo(name = "cash_drawer") val cashDrawer: String? = null,
    @ColumnInfo(name = "role") val role: String = ROLE_RECEIPT,
    @ColumnInfo(name = "account_id") val account_id: String = "",
    @ColumnInfo(name = "store_id") val store_id: Int = 0,
    @ColumnInfo(name = "station_id") val station_id: Int? = null
) {
    /** Does this printer handle customer receipts? Derived from role. */
    val printsReceipts: Boolean get() = role == ROLE_RECEIPT || printReceipt
    /** Does this printer handle kitchen/bar tickets? Derived from role. */
    val printsKitchen: Boolean get() = role == ROLE_KITCHEN || role == ROLE_BAR || printKitchen
    /** Does this printer handle queue tickets? */
    val printsQueue: Boolean get() = role == ROLE_QUEUE

    companion object {
        const val ROLE_RECEIPT = "receipt"
        const val ROLE_KITCHEN = "kitchen"
        const val ROLE_BAR = "bar"
        const val ROLE_LABEL = "label"
        const val ROLE_QUEUE = "queue"

        val ALL_ROLES = listOf(ROLE_RECEIPT, ROLE_KITCHEN, ROLE_BAR, ROLE_LABEL, ROLE_QUEUE)
    }
}
