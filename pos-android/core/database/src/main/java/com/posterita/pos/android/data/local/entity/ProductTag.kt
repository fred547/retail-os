package com.posterita.pos.android.data.local.entity

import androidx.room.Entity

@Entity(
    tableName = "product_tag",
    primaryKeys = ["product_id", "tag_id"]
)
data class ProductTag(
    val product_id: Int = 0,
    val tag_id: Int = 0,
    val account_id: String = ""
)
