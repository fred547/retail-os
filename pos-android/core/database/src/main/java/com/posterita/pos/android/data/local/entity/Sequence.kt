package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "sequence")
data class Sequence(
    @PrimaryKey(autoGenerate = true) val sequence_id: Int = 0,
    val terminal_id: Int = 0,
    val name: String = "",
    var sequenceNo: Int = 0,
    val prefix: String = ""
) {
    companion object {
        const val ORDER_DOCUMENT_NO = "order_document_no"
        const val TILL_DOCUMENT_NO = "till_document_no"
    }
}
