package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "productcategory")
data class ProductCategory(
    @PrimaryKey val productcategory_id: Int = 0,
    val updatedby: Int = 0,
    val account_id: String = "",
    val createdby: Int = 0,
    val created: String? = null,
    val isactive: String? = null,
    val display: String? = null,
    val name: String? = null,
    val position: Int = 0,
    val updated: String? = null,
    val tax_id: String? = null,
    val parent_category_id: Int? = null,
    val level: Int = 0
) {
    override fun toString(): String = name ?: ""
}
