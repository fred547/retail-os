package com.posterita.pos.android.data.remote.model.response

data class LoyaltyBalanceResponse(
    val phone: String = "",
    val points: Int = 0,
    val tier: String? = null,
    val activeVouchers: List<LoyaltyVoucher> = emptyList()
)

data class LoyaltyVoucher(
    val voucherId: String = "",
    val code: String = "",
    val description: String? = null,
    val discountType: String = "FIXED",   // "FIXED" or "PERCENTAGE"
    val discountValue: Double = 0.0,
    val minOrderAmount: Double = 0.0,
    val expiryDate: String? = null,
    val isUsed: Boolean = false
)
