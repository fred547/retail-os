package com.posterita.pos.android.data.remote.model.response

data class LoyaltyAwardResponse(
    val phone: String = "",
    val pointsAwarded: Int = 0,
    val newBalance: Int = 0,
    val transactionId: String? = null
)
