package com.posterita.pos.android.data.remote.model.response

data class SyncTillResponse(
    val tills: List<SyncTillResponseItem>? = null
) : BaseResponse() {
    data class SyncTillResponseItem(
        val uuid: String? = null,
        val status: String? = null,
        val error: String? = null
    )
}
