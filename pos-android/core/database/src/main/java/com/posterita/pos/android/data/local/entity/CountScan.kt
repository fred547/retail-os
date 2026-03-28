package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "count_scan")
data class CountScan(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val plan_id: Int = 0,
    val account_id: String = "",
    val user_id: Int = 0,
    val user_name: String? = null,
    val shelf: Int = 0,
    val height: String = "A",
    val product_id: Int? = null,
    val barcode: String? = null,
    val product_name: String? = null,
    val quantity: Int = 1,
    val is_unknown: Boolean = false,
    val is_synced: Boolean = false,
    val notes: String? = null,
    val scanned_at: String? = null,
)
