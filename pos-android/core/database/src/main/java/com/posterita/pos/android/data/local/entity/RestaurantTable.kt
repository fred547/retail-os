package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "restaurant_table")
data class RestaurantTable(
    @PrimaryKey(autoGenerate = true) val table_id: Int = 0,
    val table_name: String,
    val is_occupied: Boolean = false,
    val current_order_id: String? = null, // UUID of the hold order on this table
    val store_id: Int = 0,
    val terminal_id: Int = 0,
    val seats: Int = 4,
    val section_id: Int? = null,
    val created: Long = System.currentTimeMillis(),
    val updated: Long = System.currentTimeMillis()
)
