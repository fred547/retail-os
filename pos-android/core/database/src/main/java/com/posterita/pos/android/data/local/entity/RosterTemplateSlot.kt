package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "roster_template_slot")
data class RosterTemplateSlot(
    @PrimaryKey val id: Int = 0,
    val account_id: String = "",
    val store_id: Int = 0,
    val name: String = "",
    val day_of_week: Int = 1,
    val start_time: String = "",
    val end_time: String = "",
    val break_minutes: Int = 30,
    val required_role: String? = null,
    val color: String? = null,
    val is_deleted: Boolean = false,
    val created_at: String? = null,
    val updated_at: String? = null
)
