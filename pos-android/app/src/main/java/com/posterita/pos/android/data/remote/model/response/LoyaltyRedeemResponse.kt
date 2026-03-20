package com.posterita.pos.android.data.remote.model.response

data class LoyaltyRedeemResponse(
    val voucherId: String = "",
    val redeemed: Boolean = false,
    val discountApplied: Double = 0.0,
    val message: String? = null
)
