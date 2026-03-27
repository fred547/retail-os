package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "quotation")
data class Quotation(
    @PrimaryKey val quotation_id: Int = 0,
    val account_id: String = "",
    val store_id: Int = 0,
    val terminal_id: Int = 0,
    val customer_id: Int? = null,
    val customer_name: String? = null,
    val customer_email: String? = null,
    val customer_phone: String? = null,
    val customer_address: String? = null,
    val document_no: String? = null,
    val status: String = "draft",
    val uuid: String? = null,
    val subtotal: Double = 0.0,
    val tax_total: Double = 0.0,
    val grand_total: Double = 0.0,
    val currency: String? = null,
    val notes: String? = null,
    val terms: String? = null,
    val valid_until: String? = null,
    val template_id: String = "classic",
    val converted_order_id: Int? = null,
    val created_by: Int = 0,
    val sent_at: String? = null,
    val accepted_at: String? = null,
    val is_deleted: Boolean = false,
    val created_at: String? = null,
    val updated_at: String? = null,
)
