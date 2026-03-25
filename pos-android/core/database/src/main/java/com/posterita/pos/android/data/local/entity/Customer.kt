package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.io.Serializable

@Entity(tableName = "customer")
data class Customer(
    @PrimaryKey val customer_id: Int = 0,
    val country: String? = null,
    val note: String? = null,
    val updatedby: Int = 0,
    val gender: String? = null,
    val city: String? = null,
    val discountcode_id: Int = 0,
    val openbalance: Double = 0.0,
    val vatno: String? = null,
    val isactive: String? = null,
    val phone2: String? = null,
    val allowcredit: String? = null,
    val creditterm: Int = 0,
    val phone1: String? = null,
    val createdby: Int = 0,
    val state: String? = null,
    val email: String? = null,
    val zip: String? = null,
    val regno: String? = null,
    val identifier: String? = null,
    val address2: String? = null,
    val created: String? = null,
    val address1: String? = null,
    val mobile: String? = null,
    val account_id: String = "",
    val discountcodeexpiry: String? = null,
    val dob: String? = null,
    val loyaltypoints: Int = 0,
    val name: String? = null,
    val creditlimit: Double = 0.0,
    val updated: String? = null
) : Serializable
