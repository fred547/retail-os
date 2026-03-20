package com.posterita.pos.android.data.remote.model.request

data class SyncDocumentNoRequest(
    val terminal_id: Int = 0,
    val document_no: Long = 0L,
    val cash_up_document_no: Long = 0L
)
