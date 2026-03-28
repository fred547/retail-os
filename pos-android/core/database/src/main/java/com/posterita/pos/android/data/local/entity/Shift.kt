package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "shift")
data class Shift(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val account_id: String = "",
    val store_id: Int = 0,
    val terminal_id: Int = 0,
    val user_id: Int = 0,
    val user_name: String? = null,
    val clock_in: String? = null,
    val clock_out: String? = null,
    val break_minutes: Int = 0,
    val hours_worked: Double? = null,
    val notes: String? = null,
    val status: String = "active",
    val created_at: String? = null,
    val uuid: String? = null,
    val is_synced: Boolean = false,
    val scheduled_start: String? = null,
    val scheduled_end: String? = null,
    val overtime_minutes: Int = 0,
    val is_late: Boolean = false,
    val late_minutes: Int = 0,
    val total_break_minutes: Int = 0
) {
    companion object {
        const val STATUS_ACTIVE = "active"
        const val STATUS_COMPLETED = "completed"
        const val STATUS_CANCELLED = "cancelled"
    }
}
