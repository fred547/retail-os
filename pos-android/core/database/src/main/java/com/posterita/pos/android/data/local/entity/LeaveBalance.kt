package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "leave_balance")
data class LeaveBalance(
    @PrimaryKey val id: Int = 0,
    val account_id: String = "",
    val user_id: Int = 0,
    val leave_type_id: Int = 0,
    val year: Int = 0,
    val total_days: Double = 0.0,
    val used_days: Double = 0.0,
)
