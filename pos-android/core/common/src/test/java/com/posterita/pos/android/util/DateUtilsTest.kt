package com.posterita.pos.android.util

import org.junit.Assert.*
import org.junit.Test
import java.util.TimeZone

/**
 * Unit tests for DateUtils UTC parsing — specifically to catch timezone bugs
 * like the +4h shift hours issue (Mauritius UTC+4).
 *
 * These tests force a non-UTC timezone to verify that parsing always uses UTC
 * regardless of the device's local timezone.
 */
class DateUtilsTest {

    @Test
    fun `parseUtcToMillis handles full ISO with milliseconds and Z`() {
        val ms = DateUtils.parseUtcToMillis("2026-03-28T10:00:00.000Z")
        assertNotNull(ms)
        // 2026-03-28T10:00:00Z = specific epoch value
        // Verify by parsing back
        val expected = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", java.util.Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.parse("2026-03-28T10:00:00")!!.time
        assertEquals(expected, ms)
    }

    @Test
    fun `parseUtcToMillis handles ISO without milliseconds`() {
        val ms = DateUtils.parseUtcToMillis("2026-03-28T10:00:00Z")
        assertNotNull(ms)
        val ms2 = DateUtils.parseUtcToMillis("2026-03-28T10:00:00.000Z")
        assertEquals(ms, ms2) // same result regardless of .000Z vs Z
    }

    @Test
    fun `parseUtcToMillis handles ISO without Z suffix`() {
        val ms = DateUtils.parseUtcToMillis("2026-03-28T10:00:00")
        assertNotNull(ms)
        val ms2 = DateUtils.parseUtcToMillis("2026-03-28T10:00:00.000Z")
        assertEquals(ms, ms2) // treats bare timestamp as UTC too
    }

    @Test
    fun `parseUtcToMillis returns null for null or blank`() {
        assertNull(DateUtils.parseUtcToMillis(null))
        assertNull(DateUtils.parseUtcToMillis(""))
        assertNull(DateUtils.parseUtcToMillis("   "))
    }

    @Test
    fun `parseUtcToMillis returns null for garbage input`() {
        assertNull(DateUtils.parseUtcToMillis("not-a-date"))
        assertNull(DateUtils.parseUtcToMillis("2026-13-45T99:99:99"))
    }

    @Test
    fun `hoursBetweenUtc computes correct hours`() {
        val hours = DateUtils.hoursBetweenUtc(
            "2026-03-28T09:00:00.000Z",
            "2026-03-28T17:30:00.000Z"
        )
        assertEquals(8.5, hours, 0.01)
    }

    @Test
    fun `hoursBetweenUtc returns zero for null inputs`() {
        assertEquals(0.0, DateUtils.hoursBetweenUtc(null, "2026-03-28T17:00:00Z"), 0.001)
        assertEquals(0.0, DateUtils.hoursBetweenUtc("2026-03-28T09:00:00Z", null), 0.001)
        assertEquals(0.0, DateUtils.hoursBetweenUtc(null, null), 0.001)
    }

    @Test
    fun `hoursBetweenUtc is timezone-independent`() {
        // Force a non-UTC default timezone to simulate Mauritius (UTC+4)
        val originalTz = TimeZone.getDefault()
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("Indian/Mauritius")) // UTC+4

            val hours = DateUtils.hoursBetweenUtc(
                "2026-03-28T09:00:00.000Z",
                "2026-03-28T17:00:00.000Z"
            )
            // Must be exactly 8 hours — NOT 12 hours (which would be the bug)
            assertEquals(8.0, hours, 0.01)
        } finally {
            TimeZone.setDefault(originalTz)
        }
    }

    @Test
    fun `parseUtcToMillis is timezone-independent`() {
        val originalTz = TimeZone.getDefault()
        try {
            // Parse in UTC+4
            TimeZone.setDefault(TimeZone.getTimeZone("Indian/Mauritius"))
            val ms1 = DateUtils.parseUtcToMillis("2026-03-28T10:00:00.000Z")

            // Parse in UTC-5
            TimeZone.setDefault(TimeZone.getTimeZone("America/New_York"))
            val ms2 = DateUtils.parseUtcToMillis("2026-03-28T10:00:00.000Z")

            // Parse in UTC
            TimeZone.setDefault(TimeZone.getTimeZone("UTC"))
            val ms3 = DateUtils.parseUtcToMillis("2026-03-28T10:00:00.000Z")

            // All must be identical — same instant in time
            assertEquals(ms1, ms2)
            assertEquals(ms2, ms3)
        } finally {
            TimeZone.setDefault(originalTz)
        }
    }

    @Test
    fun `hoursElapsedSinceUtc returns zero for null`() {
        assertEquals(0.0, DateUtils.hoursElapsedSinceUtc(null), 0.001)
    }

    @Test
    fun `hoursElapsedSinceUtc returns positive for past time`() {
        // Use a time 2 hours ago
        val twoHoursAgo = System.currentTimeMillis() - 2 * 3600000
        val isoStr = DateUtils.formatIso(twoHoursAgo)
        val elapsed = DateUtils.hoursElapsedSinceUtc(isoStr)
        assertEquals(2.0, elapsed, 0.1) // within 6 minutes tolerance
    }
}
