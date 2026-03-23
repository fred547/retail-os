package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "table_section")
data class TableSection(
    @PrimaryKey val section_id: Int = 0,
    val account_id: String = "",
    val store_id: Int = 0,
    val name: String = "",
    val display_order: Int = 0,
    val color: String = "#6B7280",
    val is_active: Boolean = true,
    val is_takeaway: Boolean = false,
    val created_at: String? = null,
    val updated_at: String? = null
)
