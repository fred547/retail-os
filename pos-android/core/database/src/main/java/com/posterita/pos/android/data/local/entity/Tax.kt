package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "tax")
data class Tax(
    @PrimaryKey val tax_id: Int = 0,
    val updatedby: Int = 0,
    val account_id: String = "",
    val createdby: Int = 0,
    val rate: Double = 0.0,
    val created: String? = null,
    val isactive: String? = null,
    val name: String? = null,
    val taxcode: String? = null,
    val updated: String? = null
)
