package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "staff_break")
data class StaffBreak(
    @PrimaryKey val id: Int = 0,
    val shift_id: Int? = null,
    val account_id: String = "",
    val user_id: Int = 0,
    val break_type: String = "unpaid",
    val start_time: String? = null,
    val end_time: String? = null,
    val duration_minutes: Int? = null,
    val created_at: String? = null,
)
