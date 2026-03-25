package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "preparation_station")
data class PreparationStation(
    @PrimaryKey val station_id: Int = 0,
    val account_id: String = "",
    val store_id: Int = 0,
    val name: String = "",
    val station_type: String = "kitchen",
    val printer_id: Int? = null,
    val color: String = "#3B82F6",
    val display_order: Int = 0,
    val is_active: Boolean = true,
    val created_at: String? = null,
    val updated_at: String? = null
) {
    companion object {
        const val TYPE_KITCHEN = "kitchen"
        const val TYPE_BAR = "bar"
        const val TYPE_DESSERT = "dessert"
        const val TYPE_CUSTOM = "custom"
    }
}
