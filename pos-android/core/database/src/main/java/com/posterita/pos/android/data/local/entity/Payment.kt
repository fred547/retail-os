package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import org.json.JSONObject
import java.sql.Timestamp

@Entity(tableName = "payment")
data class Payment(
    @PrimaryKey(autoGenerate = true) val paymentId: Int = 0,
    val orderId: Int = 0,
    val documentNo: String? = null,
    val tendered: Double = 0.0,
    val amount: Double = 0.0,
    val change: Double = 0.0,
    val paymentType: String? = null,
    val datePaid: Timestamp? = Timestamp(System.currentTimeMillis()),
    val payAmt: Double = 0.0,
    val status: String? = null,
    val checknumber: String? = null,
    val extraInfo: JSONObject? = JSONObject()
)
