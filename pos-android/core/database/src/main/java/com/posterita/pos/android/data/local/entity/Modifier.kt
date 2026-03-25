package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "modifier")
data class Modifier(
    @PrimaryKey val modifier_id: Int = 0,
    val updatedby: Int = 0,
    val productcategories: String? = null,
    val discountcode_id: Int = 0,
    val isactive: String? = null,
    val istaxincluded: String? = null,
    val description: String? = null,
    val costprice: Double = 0.0,
    val createdby: Int = 0,
    val isstock: String? = null,
    val isvariableitem: String? = null,
    val image: String? = null,
    val created: String? = null,
    val upc: String? = null,
    val isbom: String? = null,
    val ismodifier: String? = null,
    val tax_id: Int = 0,
    val iseditable: String? = null,
    val isfavourite: String? = null,
    val productcategory_id: Int = 0,
    val account_id: String = "",
    val iskitchenitem: String? = null,
    val sellingprice: Double = 0.0,
    val name: String? = null,
    val taxamount: Double = 0.0,
    val updated: String? = null,
    val product_id: Int = 0
)
