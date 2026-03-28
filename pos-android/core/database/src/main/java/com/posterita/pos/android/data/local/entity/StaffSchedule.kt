package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "staff_schedule")
data class StaffSchedule(
    @PrimaryKey val id: Int = 0,
    val account_id: String = "",
    val store_id: Int = 0,
    val user_id: Int = 0,
    val date: String = "",
    val start_time: String = "",
    val end_time: String = "",
    val break_minutes: Int = 0,
    val role_override: String? = null,
    val notes: String? = null,
    val status: String = "scheduled",
    val created_by: Int? = null,
    val created_at: String? = null,
    val updated_at: String? = null,
)
