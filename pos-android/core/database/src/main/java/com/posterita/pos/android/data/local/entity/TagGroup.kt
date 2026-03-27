package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "tag_group")
data class TagGroup(
    @PrimaryKey val tag_group_id: Int = 0,
    val account_id: String = "",
    val name: String = "",
    val description: String? = null,
    val color: String = "#6B7280",
    val is_active: Boolean = true,
    val is_deleted: Boolean = false,
    val created_at: String? = null,
    val updated_at: String? = null
)
