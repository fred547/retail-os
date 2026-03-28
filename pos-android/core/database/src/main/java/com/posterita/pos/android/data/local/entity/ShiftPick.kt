package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "shift_pick")
data class ShiftPick(
    @PrimaryKey val id: Int = 0,
    val account_id: String = "",
    val roster_period_id: Int = 0,
    val slot_id: Int = 0,
    val user_id: Int = 0,
    val date: String = "",
    val status: String = "picked",
    val effective_hours: Double? = null,
    val day_type: String? = null,
    val multiplier: Double? = null,
    val notes: String? = null,
    val created_at: String? = null,
    val updated_at: String? = null
)
