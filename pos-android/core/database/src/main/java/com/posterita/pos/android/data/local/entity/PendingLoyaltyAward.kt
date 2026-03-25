package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pending_loyalty_award")
data class PendingLoyaltyAward(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val phone: String,
    val orderUuid: String,
    val orderTotal: Double,
    val currency: String,
    val storeId: Int,
    val terminalId: Int,
    val createdAt: Long = System.currentTimeMillis()
)
