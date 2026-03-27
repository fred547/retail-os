package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "inventory_count_entry")
data class InventoryCountEntry(
    @PrimaryKey(autoGenerate = true) val entry_id: Int = 0,
    val session_id: Int = 0,
    val account_id: String = "",
    val product_id: Int = 0,
    val product_name: String? = null,
    val upc: String? = null,
    val quantity: Int = 1,
    val scanned_by: Int = 0,
    val terminal_id: Int = 0,
    val scanned_at: Long = System.currentTimeMillis(),
    val is_synced: String = "N",
    val system_qty: Double = 0.0,
    val variance: Double = 0.0
)
