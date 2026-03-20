package com.posterita.pos.android.data.remote.model.request

data class ConsentUpdateRequest(
    val phone: String,
    val consentGranted: Boolean,
    val consentSource: String = "POS",
    val brandName: String? = null,
    val storeId: Int = 0,
    val terminalId: Int = 0,
    val userId: Int = 0,
    val consentTimestamp: Long = System.currentTimeMillis()
)
