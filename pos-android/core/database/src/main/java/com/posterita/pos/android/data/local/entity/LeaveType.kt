package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "leave_type")
data class LeaveType(
    @PrimaryKey val id: Int = 0,
    val account_id: String = "",
    val name: String = "",
    val paid: Boolean = true,
    val default_days: Int = 0,
    val color: String = "#1976D2",
    val is_active: Boolean = true,
    val created_at: String? = null,
)
