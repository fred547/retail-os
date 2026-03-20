package com.posterita.pos.android.data.remote.model.response

data class BlinkTillQRCodeTransactionStatusResponse(
    val data: TransactionStatusData? = null,
    val status: ApiStatus? = null
)

data class TransactionStatusData(
    val transaction_id: String? = null,
    val statusDescription: String? = null,
    val payment_ref: String? = null,
    val transactionStatusCode: String? = null
)

data class ApiStatus(
    val i: Boolean = false,
    val m: String? = null,
    val s: String? = null
)
