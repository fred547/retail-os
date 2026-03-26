package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "loyalty_config")
data class LoyaltyConfig(
    @PrimaryKey val id: Int = 0,
    val account_id: String = "",
    val points_per_currency: Double = 1.0,
    val redemption_rate: Double = 0.01,
    val min_redeem_points: Int = 100,
    val is_active: Boolean = true,
    val welcome_bonus: Int = 0,
    val created_at: String? = null,
    val updated_at: String? = null
)
