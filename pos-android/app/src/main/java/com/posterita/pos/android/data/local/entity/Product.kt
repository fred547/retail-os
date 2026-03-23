package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.io.Serializable

@Entity(tableName = "product")
data class Product(
    @PrimaryKey val product_id: Int = 0,
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
    val iswholesaleprice: String? = null,
    val wholesaleprice: Double = 0.0,
    val barcodetype: String? = null,
    val printordercopy: String? = null,
    val itemcode: String? = null,
    /** "Y" if the price was set by a staff member and needs owner review */
    val needs_price_review: String? = null,
    /** user_id of whoever last set the price (0 = original/AI import) */
    val price_set_by: Int = 0,
    /** Lifecycle status: draft, review, live */
    val product_status: String? = "live",
    /** How this product was created: manual, ai_import, quotation, supplier_catalog */
    val source: String? = "manual",
    /** Override station for kitchen routing (null = use category mapping) */
    val station_override_id: Int? = null
) : Serializable
