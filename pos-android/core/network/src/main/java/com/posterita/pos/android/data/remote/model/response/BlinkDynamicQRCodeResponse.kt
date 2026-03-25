package com.posterita.pos.android.data.remote.model.response

data class BlinkDynamicQRCodeResponse(
    val message: String? = null,
    val success: Boolean = false,
    val qrCodeString: String? = null,
    val payload: String? = null
) : BaseResponse()
