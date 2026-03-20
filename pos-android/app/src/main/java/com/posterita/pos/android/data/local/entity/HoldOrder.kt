package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import org.json.JSONObject
import java.sql.Timestamp

@Entity(tableName = "hold_orders")
data class HoldOrder(
    @PrimaryKey(autoGenerate = true) val holdOrderId: Int = 0,
    val dateHold: Timestamp? = null,
    val json: JSONObject? = null,
    val description: String? = null,
    val tillId: Int = 0,
    val terminalId: Int = 0,
    val storeId: Int = 0
)
