package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.fasterxml.jackson.annotation.JsonProperty
import java.io.Serializable

@Entity(tableName = "store")
data class Store(
    @PrimaryKey
    @JsonProperty("store_id")
    val storeId: Int = 0,
    val zip: String? = null,
    val country: String? = null,
    val currency: String? = null,
    val updatedby: Int = 0,
    val address: String? = null,
    val city: String? = null,
    val created: String? = null,
    val isactive: String? = null,
    val account_id: String = "",
    val createdby: Int = 0,
    val name: String? = null,
    val state: String? = null,
    val updated: String? = null,
    /** "retail" or "warehouse" — determines available features */
    val store_type: String = "retail"
) : Serializable {
    val isWarehouse: Boolean get() = store_type == "warehouse"
    override fun toString(): String = name ?: ""
}
