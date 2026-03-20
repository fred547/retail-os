package com.posterita.pos.android

import com.posterita.pos.android.util.DateUtils
import org.junit.Assert.*
import org.junit.Test
import java.text.SimpleDateFormat
import java.util.Locale

class DateUtilsTest {

    @Test
    fun formatDate_validTimestamp() {
        // Jan 15 2024 00:00:00 UTC
        val timestamp = 1705276800000L
        val result = DateUtils.formatDate(timestamp)
        // Should be dd/MM/yyyy format
        assertTrue(result.matches(Regex("\\d{2}/\\d{2}/\\d{4}")))
        assertTrue(result.contains("2024"))
    }

    @Test
    fun formatDateTime_validTimestamp() {
        val timestamp = 1705276800000L
        val result = DateUtils.formatDateTime(timestamp)
        // Should be dd/MM/yyyy HH:mm:ss format
        assertTrue(result.matches(Regex("\\d{2}/\\d{2}/\\d{4} \\d{2}:\\d{2}:\\d{2}")))
        assertTrue(result.contains("2024"))
    }

    @Test
    fun formatDate_zeroTimestamp() {
        val result = DateUtils.formatDate(0L)
        // Should still return a valid formatted date string (epoch)
        assertTrue(result.matches(Regex("\\d{2}/\\d{2}/\\d{4}")))
    }

    @Test
    fun formatDateTime_zeroTimestamp() {
        val result = DateUtils.formatDateTime(0L)
        assertTrue(result.matches(Regex("\\d{2}/\\d{2}/\\d{4} \\d{2}:\\d{2}:\\d{2}")))
    }

    @Test
    fun now_returnsReasonableTimestamp() {
        val before = System.currentTimeMillis()
        val result = DateUtils.now()
        val after = System.currentTimeMillis()
        assertTrue(result >= before)
        assertTrue(result <= after)
    }

    @Test
    fun formatDate_specificKnownDate() {
        // Use SimpleDateFormat to create a known timestamp for the local timezone
        val sdf = SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
        val date = sdf.parse("25/12/2023")!!
        val result = DateUtils.formatDate(date.time)
        assertEquals("25/12/2023", result)
    }

    @Test
    fun formatDateTime_specificKnownDateTime() {
        val sdf = SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault())
        val date = sdf.parse("25/12/2023 14:30:00")!!
        val result = DateUtils.formatDateTime(date.time)
        assertEquals("25/12/2023 14:30:00", result)
    }
}
