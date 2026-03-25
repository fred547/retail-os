package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "orderline")
data class OrderLine(
    @PrimaryKey(autoGenerate = true) val orderline_id: Int = 0,
    val order_id: Int = 0,
    val product_id: Int = 0,
    val productcategory_id: Int = 0,
    val tax_id: Int = 0,
    val qtyentered: Double = 0.0,
    val lineamt: Double = 0.0,
    val linenetamt: Double = 0.0,
    val priceentered: Double = 0.0,
    val costamt: Double = 0.0,
    val productname: String? = null,
    val productdescription: String? = null,
    val serial_item_id: Int? = null
)
