package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "audit_event")
data class AuditEvent(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val timestamp: Long = System.currentTimeMillis(),
    val userId: Int = 0,
    val userName: String? = null,
    val action: String,          // e.g. "cart.remove_line", "cart.decrease_qty", "order.create", "till.open", "till.close", "order.void", "user.login"
    val detail: String? = null,  // e.g. "Removed Reef Sandal Navy (qty 1)"
    val reason: String? = null,  // For removals requiring note
    val supervisorId: Int? = null, // If supervisor PIN was used
    val storeId: Int = 0,
    val terminalId: Int = 0,
    val orderId: String? = null, // Order UUID if applicable
    val amount: Double? = null,  // Monetary value of the action
    val isSynced: String = "N"   // For future backend sync
)
