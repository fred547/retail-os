package com.posterita.pos.android.data.local.converter

import androidx.room.TypeConverter
import java.sql.Timestamp

class TimestampConverter {
    @TypeConverter
    fun fromTimestamp(value: Long?): Timestamp? = value?.let { Timestamp(it) }

    @TypeConverter
    fun dateToTimestamp(timestamp: Timestamp?): Long? = timestamp?.time
}
