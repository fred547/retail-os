package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "category_station_mapping")
data class CategoryStationMapping(
    @PrimaryKey val id: Int = 0,
    val account_id: String = "",
    val category_id: Int = 0,
    val station_id: Int = 0,
    val created_at: String? = null
)
