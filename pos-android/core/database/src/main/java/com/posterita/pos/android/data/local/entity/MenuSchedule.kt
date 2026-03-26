package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "menu_schedule")
data class MenuSchedule(
    @PrimaryKey val id: Int = 0,
    val account_id: String = "",
    val store_id: Int = 0,
    val name: String = "",
    val description: String? = null,
    val category_ids: String? = null,
    val start_time: String? = null,
    val end_time: String? = null,
    val days_of_week: String? = null,
    val priority: Int = 0,
    val is_active: Boolean = true,
    val created_at: String? = null,
    val updated_at: String? = null
)
