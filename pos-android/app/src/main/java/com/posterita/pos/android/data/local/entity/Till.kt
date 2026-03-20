package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import org.json.JSONObject
import java.sql.Timestamp

@Entity(tableName = "till")
data class Till(
    @PrimaryKey(autoGenerate = true) val tillId: Int = 0,
    val account_id: String? = null,
    val store_id: Int = 0,
    val terminal_id: Int = 0,
    val openBy: Int = 0,
    val closeBy: Int = 0,
    val openingAmt: Double = 0.0,
    val closingAmt: Double = 0.0,
    val dateOpened: Timestamp? = null,
    val dateClosed: Timestamp? = null,
    val json: JSONObject? = null,
    val isSync: Boolean = false,
    val syncErrorMessage: String? = null,
    val uuid: String? = null,
    val documentno: String? = null,
    val vouchers: String? = null,
    val adjustmenttotal: Double = 0.0,
    val cashamt: Double = 0.0,
    val cardamt: Double = 0.0,
    val subtotal: Double = 0.0,
    val taxtotal: Double = 0.0,
    val grandtotal: Double = 0.0,
    val forexcurrency: String? = null,
    val forexamt: Double = 0.0
)
