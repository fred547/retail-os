package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "leave_request")
data class LeaveRequest(
    @PrimaryKey val id: Int = 0,
    val account_id: String = "",
    val user_id: Int = 0,
    val leave_type_id: Int = 0,
    val start_date: String = "",
    val end_date: String = "",
    val days: Double = 0.0,
    val reason: String? = null,
    val status: String = "pending",
    val approved_by: Int? = null,
    val approved_at: String? = null,
    val rejection_reason: String? = null,
    val created_at: String? = null,
    val updated_at: String? = null,
)
