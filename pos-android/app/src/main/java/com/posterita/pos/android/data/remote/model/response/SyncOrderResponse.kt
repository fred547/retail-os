package com.posterita.pos.android.data.remote.model.response

data class SyncOrderResponse(
    val orders: List<SyncOrderResponseItem>? = null
) : BaseResponse() {
    data class SyncOrderResponseItem(
        val uuid: String? = null,
        val status: String? = null,
        val online_id: Int = 0
    )
}
