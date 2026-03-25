package com.posterita.pos.android.data.remote.model.response

import java.math.BigDecimal

data class BlinkTillQRCodeResponse(
    val transaction_id: String? = null,
    val status: String? = null,
    val message: String? = null,
    val amount: Amount? = null
) {
    data class Amount(
        val currency: String? = null,
        val value: BigDecimal? = null
    )
}
