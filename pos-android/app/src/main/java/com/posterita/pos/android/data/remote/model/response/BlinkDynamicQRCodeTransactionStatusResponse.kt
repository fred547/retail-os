package com.posterita.pos.android.data.remote.model.response

data class BlinkDynamicQRCodeTransactionStatusResponse(
    val data: DynamicQRStatusData? = null,
    val status: ApiStatus? = null,
    val transactionResponse: String? = null,
    val transactionDescription: String? = null,
    val transactionStatus: Boolean = false,
    val transactionStatusCode: String? = null
)

data class DynamicQRStatusData(
    val transactionDescription: String? = null,
    val transactionResponse: String? = null,
    val transactionStatus: Boolean = false,
    val transactionStatusCode: String? = null
)
