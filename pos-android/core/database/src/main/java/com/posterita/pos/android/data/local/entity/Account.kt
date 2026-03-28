package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import java.io.Serializable

@Entity(tableName = "account")
data class Account(
    @PrimaryKey val account_id: String,
    val zip: String? = null,
    val website: String? = null,
    val vatregno: String? = null,
    val address2: String? = null,
    val city: String? = null,
    val address1: String? = null,
    val phone2: String? = null,
    val receiptmessage: String? = null,
    val phone1: String? = null,
    val isvatable: String? = null,
    val businessname: String? = null,
    val state: String? = null,
    val fax: String? = null,
    val isactive: String? = null,
    val currency: String? = null,
    val whatsappNumber: String? = null,
    val headOfficeAddress: String? = null,
    val brn: String? = null,
    val tan: String? = null,
    val plan: String? = "free",
    val billing_region: String? = "developing",
    val trial_plan: String? = null,
    val trial_ends_at: String? = null,
    val country_code: String? = null
) : Serializable
