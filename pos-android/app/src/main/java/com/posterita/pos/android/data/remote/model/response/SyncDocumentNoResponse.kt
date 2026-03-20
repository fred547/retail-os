package com.posterita.pos.android.data.remote.model.response

data class SyncDocumentNoResponse(
    val document_no: Int = 0,
    val cash_up_document_no: Int = 0,
    val terminal_id: Int = 0
) : BaseResponse()
