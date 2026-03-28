package com.posterita.pos.android.util

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

object DateUtils {
    private val dateFormat = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
    private val dateTimeFormat = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault())

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = java.util.TimeZone.getTimeZone("UTC")
    }

    fun formatDate(timestamp: Long): String = dateFormat.format(Date(timestamp))
    fun formatDateTime(timestamp: Long): String = dateTimeFormat.format(Date(timestamp))
    fun formatIso(timestamp: Long): String = isoFormat.format(Date(timestamp))
    fun now(): Long = System.currentTimeMillis()

    /**
     * Parse an ISO 8601 UTC timestamp string to epoch millis.
     * Handles: "2026-03-28T10:00:00.000Z", "2026-03-28T10:00:00Z", "2026-03-28T10:00:00"
     * Always interprets as UTC regardless of device timezone.
     */
    fun parseUtcToMillis(isoString: String?): Long? {
        if (isoString.isNullOrBlank()) return null
        return try {
            val cleaned = isoString
                .replace(Regex("\\.[0-9]+Z$"), "")  // remove .000Z
                .replace("Z", "")                    // remove trailing Z
            val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
                isLenient = false
            }
            fmt.parse(cleaned)?.time
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Compute hours between two ISO UTC timestamps.
     * Returns 0.0 if either is null or unparseable.
     */
    fun hoursBetweenUtc(start: String?, end: String?): Double {
        val startMs = parseUtcToMillis(start) ?: return 0.0
        val endMs = parseUtcToMillis(end) ?: return 0.0
        return (endMs - startMs) / 3600000.0
    }

    /**
     * Compute elapsed hours from a UTC timestamp to now.
     */
    fun hoursElapsedSinceUtc(start: String?): Double {
        val startMs = parseUtcToMillis(start) ?: return 0.0
        return (System.currentTimeMillis() - startMs) / 3600000.0
    }
}
