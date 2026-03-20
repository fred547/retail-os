package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import org.json.JSONObject
import java.io.Serializable
import java.sql.Timestamp

@Entity(tableName = "orders")
data class Order(
    @PrimaryKey(autoGenerate = true) val orderId: Int = 0,
    val customerId: Int = 0,
    val salesRepId: Int = 0,
    val tillId: Int = 0,
    val terminalId: Int = 0,
    val storeId: Int = 0,
    val accountId: String? = null,
    val orderType: String? = null,
    val documentNo: String? = null,
    val docStatus: String? = null,
    val isPaid: Boolean = false,
    val subtotal: Double = 0.0,
    val taxTotal: Double = 0.0,
    val grandTotal: Double = 0.0,
    val qtyTotal: Double = 0.0,
    val dateOrdered: Timestamp? = null,
    val json: JSONObject? = null,
    val isSync: Boolean = false,
    val syncErrorMessage: String? = null,
    val uuid: String? = null,
    val currency: String? = null,
    val tips: Double = 0.0,
    val note: String? = null,
    val couponids: String? = null
) : Serializable
