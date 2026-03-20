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
    @ColumnInfo(name = "role") val role: String = ROLE_RECEIPT
) {
    companion object {
        const val ROLE_RECEIPT = "receipt"
        const val ROLE_KITCHEN = "kitchen"
        const val ROLE_BAR = "bar"
        const val ROLE_LABEL = "label"
    }
}
