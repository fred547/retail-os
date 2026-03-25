package com.posterita.pos.android.data.remote.model.response

open class BaseResponse(
    val error: String? = null
) {
    fun hasError(): Boolean = !error.isNullOrEmpty()
}
