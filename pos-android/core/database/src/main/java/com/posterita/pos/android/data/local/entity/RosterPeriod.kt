package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "roster_period")
data class RosterPeriod(
    @PrimaryKey val id: Int = 0,
    val account_id: String = "",
    val store_id: Int = 0,
    val name: String? = null,
    val start_date: String = "",
    val end_date: String = "",
    val status: String = "open",
    val picking_deadline: String? = null,
    val approved_by: Int? = null,
    val approved_at: String? = null,
    val is_deleted: Boolean = false,
    val created_at: String? = null,
    val updated_at: String? = null
)
