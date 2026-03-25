package com.posterita.pos.android.data.remote.model.request

import java.math.BigDecimal

data class BlinkTillQRCodeRequest(
    val merchant_id: String? = null,
    val terminal_id: String? = null,
    val transaction_id: String? = null,
    val store_id: String? = null,
    val amount: Amount? = null
) {
    data class Amount(
        val currency: String = "MUR",
        val value: BigDecimal = BigDecimal.ZERO
    )
}
