package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "loyalty_cache")
data class LoyaltyCache(
    @PrimaryKey val phone: String,
    val points: Int = 0,
    val tier: String? = null,
    val vouchersJson: String? = null,
    val lastUpdated: Long = System.currentTimeMillis()
)
