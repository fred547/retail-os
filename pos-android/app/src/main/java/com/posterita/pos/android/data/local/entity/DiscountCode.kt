package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "discountcode")
data class DiscountCode(
    @PrimaryKey val discountcode_id: Int = 0,
    val store_id: String? = null,
    val updatedby: Int = 0,
    val account_id: Int = 0,
    val createdby: Int = 0,
    val created: String? = null,
    val isactive: String? = null,
    val percentage: Double = 0.0,
    val name: String? = null,
    val updated: String? = null,
    val value: Double = 0.0
)
