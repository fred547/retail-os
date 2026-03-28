package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "labor_config")
data class LaborConfig(
    @PrimaryKey val id: Int = 0,
    val account_id: String = "",
    val country_code: String = "MU",
    val standard_weekly_hours: Double = 45.0,
    val standard_daily_hours: Double = 9.0,
    val weekday_multiplier: Double = 1.0,
    val saturday_multiplier: Double = 1.0,
    val sunday_multiplier: Double = 1.5,
    val public_holiday_multiplier: Double = 2.0,
    val overtime_multiplier: Double = 1.5,
    val min_break_minutes: Int = 30,
    val created_at: String? = null,
    val updated_at: String? = null
)
