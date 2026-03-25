package com.posterita.pos.android.data.remote.model.response

data class LoyaltyValidateResponse(
    val voucherId: String = "",
    val valid: Boolean = false,
    val discountType: String? = null,
    val discountValue: Double = 0.0,
    val message: String? = null
)
