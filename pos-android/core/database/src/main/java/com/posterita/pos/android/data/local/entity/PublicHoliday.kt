package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "public_holiday")
data class PublicHoliday(
    @PrimaryKey val id: Int = 0,
    val account_id: String = "",
    val country_code: String = "MU",
    val date: String = "",
    val name: String = "",
    val is_recurring: Boolean = false,
    val is_deleted: Boolean = false,
    val created_at: String? = null,
    val updated_at: String? = null
)
