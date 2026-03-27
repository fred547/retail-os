package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "inventory_count_session")
data class InventoryCountSession(
    @PrimaryKey val session_id: Int = 0,
    val account_id: String = "",
    val store_id: Int = 0,
    val type: String = "spot_check",
    val status: String = "created",
    val name: String? = null,
    val started_at: String? = null,
    val completed_at: String? = null,
    val created_by: Int = 0,
    val created_at: String? = null,
    val updated_at: String? = null,
    val notes: String? = null,
    val assigned_to: Int? = null,
    val variance_count: Int = 0
)
