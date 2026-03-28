package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "count_plan")
data class CountPlan(
    @PrimaryKey val id: Int = 0,
    val account_id: String = "",
    val store_id: Int = 0,
    val name: String = "",
    val status: String = "draft",
    val notes: String? = null,
    val started_at: String? = null,
    val completed_at: String? = null,
    val created_by: Int = 0,
    val is_deleted: Boolean = false,
    val created_at: String? = null,
    val updated_at: String? = null,
)
