package com.posterita.pos.android.data.remote.model.response

data class CouponResponse(
    val couponId: Int = 0,
    val couponCode: String? = null,
    val accountKey: String? = null,
    val balance: Double = 0.0,
    val amountIssued: Double = 0.0,
    val expiryDate: String? = null
) : BaseResponse()
