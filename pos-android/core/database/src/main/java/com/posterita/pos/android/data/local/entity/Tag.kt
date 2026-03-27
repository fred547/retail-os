package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "tag")
data class Tag(
    @PrimaryKey val tag_id: Int = 0,
    val account_id: String = "",
    val tag_group_id: Int = 0,
    val name: String = "",
    val color: String? = null,
    val position: Int = 0,
    val is_active: Boolean = true,
    val is_deleted: Boolean = false,
    val created_at: String? = null,
    val updated_at: String? = null
)
