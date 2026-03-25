package com.posterita.pos.android.data.remote.model.request

data class LoyaltyAwardRequest(
    val phone: String,
    val orderUuid: String,
    val orderTotal: Double,
    val currency: String,
    val storeId: Int,
    val terminalId: Int
)
