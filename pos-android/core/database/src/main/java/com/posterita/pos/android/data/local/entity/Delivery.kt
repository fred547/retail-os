package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "delivery")
data class Delivery(
    @PrimaryKey val id: Int = 0,
    val account_id: String = "",
    val order_id: Int? = null,
    val store_id: Int = 0,
    val customer_id: Int? = null,
    val customer_name: String? = null,
    val customer_phone: String? = null,
    val delivery_address: String? = null,
    val delivery_city: String? = null,
    val delivery_notes: String? = null,
    val driver_id: Int? = null,
    val driver_name: String? = null,
    val status: String = "pending",
    val estimated_time: String? = null,
    val actual_delivery_at: String? = null,
    val assigned_at: String? = null,
    val picked_up_at: String? = null,
    val distance_km: Double? = null,
    val delivery_fee: Double? = null,
    val is_deleted: Boolean = false,
    val created_at: String? = null,
    val updated_at: String? = null
) {
    companion object {
        const val STATUS_PENDING = "pending"
        const val STATUS_ASSIGNED = "assigned"
        const val STATUS_PICKED_UP = "picked_up"
        const val STATUS_IN_TRANSIT = "in_transit"
        const val STATUS_DELIVERED = "delivered"
        const val STATUS_FAILED = "failed"
        const val STATUS_CANCELLED = "cancelled"
    }
}
