package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "error_log")
data class ErrorLog(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val timestamp: Long = System.currentTimeMillis(),
    val severity: String = "ERROR",       // FATAL, ERROR, WARN, INFO
    val tag: String,                       // e.g. "SplashActivity", "CloudSync"
    val message: String,                   // Human-readable summary
    val stacktrace: String? = null,        // Full exception trace
    val screen: String? = null,            // Activity/Fragment class name
    val userId: Int = 0,
    val userName: String? = null,
    val storeId: Int = 0,
    val terminalId: Int = 0,
    val accountId: String? = null,
    val deviceId: String? = null,
    val appVersion: String? = null,
    val osVersion: String? = null,
    val isSynced: String = "N"
)
