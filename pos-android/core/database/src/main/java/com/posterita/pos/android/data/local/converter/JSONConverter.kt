package com.posterita.pos.android.data.local.converter

import androidx.room.TypeConverter
import org.json.JSONObject

class JSONConverter {
    @TypeConverter
    fun fromString(value: String?): JSONObject? = value?.let {
        try { JSONObject(it) } catch (e: Exception) { null }
    }

    @TypeConverter
    fun fromJSONObject(jsonObject: JSONObject?): String? = jsonObject?.toString()
}
