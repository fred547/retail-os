package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "quotation_line")
data class QuotationLine(
    @PrimaryKey val line_id: Int = 0,
    val quotation_id: Int = 0,
    val product_id: Int? = null,
    val product_name: String = "",
    val description: String? = null,
    val quantity: Double = 1.0,
    val unit_price: Double = 0.0,
    val discount_percent: Double = 0.0,
    val tax_id: Int = 0,
    val tax_rate: Double = 0.0,
    val line_total: Double = 0.0,
    val position: Int = 0,
)
