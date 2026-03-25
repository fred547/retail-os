package com.posterita.pos.android.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "till_adjustment")
data class TillAdjustment(
    @PrimaryKey(autoGenerate = true) val till_adjustment_id: Int = 0,
    val till_id: Int = 0,
    val date: Long = 0L,
    val user_id: Int = 0,
    val pay_type: String? = null,
    val reason: String? = null,
    val amount: Double = 0.0
)
