package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "preference")
data class Preference(
    @PrimaryKey val preference_id: Int = 0,
    val preventzeroqtysales: String? = null,
    val updatedby: Int = 0,
    val created: String? = null,
    val isactive: String? = null,
    val showreceiptlogo: String? = null,
    val showsignature: String? = null,
    val showcustomerbrn: String? = null,
    val showstocktransfer: String? = null,
    val printpaymentrule: String? = null,
    val account_id: String = "",
    val showunitprice: String? = null,
    val createdby: Int = 0,
    val acceptpaymentrule: String? = null,
    val showtaxcode: String? = null,
    val opencashdrawer: String? = null,
    val updated: String? = null,
    val ai_api_key: String? = null
)
