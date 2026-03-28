package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "store_operating_hours")
data class StoreOperatingHours(
    @PrimaryKey val id: Int = 0,
    val account_id: String = "",
    val store_id: Int = 0,
    val day_type: String = "weekday",
    val open_time: String? = null,
    val close_time: String? = null,
    val is_closed: Boolean = false,
    val created_at: String? = null,
    val updated_at: String? = null
)
