package com.posterita.pos.android.data.remote.model.request

data class CouponRequest(
    val couponCode: String? = null,
    val amountIssued: Double = 0.0,
    val expiryDate: String? = null,
    val accountKey: String? = null
)
