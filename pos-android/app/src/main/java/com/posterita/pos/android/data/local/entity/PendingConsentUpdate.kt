package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "pending_consent_update")
data class PendingConsentUpdate(
    @PrimaryKey(autoGenerate = true) val id: Int = 0,
    val phone: String,
    val consentGranted: Boolean,
    val consentSource: String = "POS",
    val brandName: String? = null,
    val storeId: Int = 0,
    val terminalId: Int = 0,
    val userId: Int = 0,
    val consentTimestamp: Long = System.currentTimeMillis(),
    val createdAt: Long = System.currentTimeMillis()
)
