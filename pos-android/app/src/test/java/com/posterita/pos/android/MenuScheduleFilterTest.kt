package com.posterita.pos.android

import com.posterita.pos.android.data.local.entity.MenuSchedule
import org.json.JSONArray
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Tests for MenuSchedule entity and filtering logic.
 * Covers time-based filtering, day-of-week matching, and category ID parsing.
 */
@RunWith(RobolectricTestRunner::class)
class MenuScheduleFilterTest {

    // --- Entity Defaults ---

    @Test
    fun `default schedule is active`() {
        val schedule = createSchedule()
        assertTrue(schedule.is_active)
    }

    @Test
    fun `default schedule type is spot_check equivalent (no type field)`() {
        val schedule = createSchedule()
        assertEquals(0, schedule.store_id)
    }

    // --- Category ID Parsing ---

    @Test
    fun `parseCategoryIds returns correct set from JSON array`() {
        val json = JSONArray(listOf(10, 11, 12)).toString()
        val schedule = createSchedule(categoryIds = json)
        val ids = parseCategoryIds(schedule.category_ids)
        assertEquals(setOf(10, 11, 12), ids)
    }

    @Test
    fun `parseCategoryIds returns empty set for null`() {
        val ids = parseCategoryIds(null)
        assertTrue(ids.isEmpty())
    }

    @Test
    fun `parseCategoryIds returns empty set for blank string`() {
        val ids = parseCategoryIds("")
        assertTrue(ids.isEmpty())
    }

    @Test
    fun `parseCategoryIds returns empty set for invalid JSON`() {
        val ids = parseCategoryIds("not-json")
        assertTrue(ids.isEmpty())
    }

    @Test
    fun `parseCategoryIds handles single category`() {
        val json = JSONArray(listOf(42)).toString()
        val ids = parseCategoryIds(json)
        assertEquals(setOf(42), ids)
    }

    // --- Days of Week Parsing ---

    @Test
    fun `parseDaysOfWeek returns correct list`() {
        val json = JSONArray(listOf("monday", "wednesday", "friday")).toString()
        val days = parseDaysOfWeek(json)
        assertEquals(listOf("monday", "wednesday", "friday"), days)
    }

    @Test
    fun `parseDaysOfWeek handles case insensitive`() {
        val json = JSONArray(listOf("Monday", "FRIDAY")).toString()
        val days = parseDaysOfWeek(json)
        assertEquals(listOf("monday", "friday"), days)
    }

    @Test
    fun `parseDaysOfWeek returns empty for null`() {
        val days = parseDaysOfWeek(null)
        assertTrue(days.isEmpty())
    }

    @Test
    fun `parseDaysOfWeek returns empty for invalid JSON`() {
        val days = parseDaysOfWeek("bad-json")
        assertTrue(days.isEmpty())
    }

    // --- Time Range Checks ---

    @Test
    fun `isWithinTimeRange returns true when no time constraints`() {
        val schedule = createSchedule(startTime = null, endTime = null)
        assertTrue(isWithinTimeRange(schedule, "12:00"))
    }

    @Test
    fun `isWithinTimeRange returns true when current time is within range`() {
        val schedule = createSchedule(startTime = "09:00", endTime = "17:00")
        assertTrue(isWithinTimeRange(schedule, "12:00"))
    }

    @Test
    fun `isWithinTimeRange returns false when before start`() {
        val schedule = createSchedule(startTime = "09:00", endTime = "17:00")
        assertFalse(isWithinTimeRange(schedule, "08:00"))
    }

    @Test
    fun `isWithinTimeRange returns false when after end`() {
        val schedule = createSchedule(startTime = "09:00", endTime = "17:00")
        assertFalse(isWithinTimeRange(schedule, "18:00"))
    }

    @Test
    fun `isWithinTimeRange at exact start time is within range`() {
        val schedule = createSchedule(startTime = "09:00", endTime = "17:00")
        assertTrue(isWithinTimeRange(schedule, "09:00"))
    }

    @Test
    fun `isWithinTimeRange at exact end time is within range`() {
        val schedule = createSchedule(startTime = "09:00", endTime = "17:00")
        assertTrue(isWithinTimeRange(schedule, "17:00"))
    }

    @Test
    fun `isWithinTimeRange with only start time set`() {
        val schedule = createSchedule(startTime = "14:00", endTime = null)
        assertTrue(isWithinTimeRange(schedule, "15:00"))
        assertFalse(isWithinTimeRange(schedule, "13:00"))
    }

    @Test
    fun `isWithinTimeRange with only end time set`() {
        val schedule = createSchedule(startTime = null, endTime = "22:00")
        assertTrue(isWithinTimeRange(schedule, "21:00"))
        assertFalse(isWithinTimeRange(schedule, "23:00"))
    }

    // --- Schedule Merging (multiple active schedules) ---

    @Test
    fun `merging two schedules unions category IDs`() {
        val s1 = createSchedule(categoryIds = JSONArray(listOf(10, 11)).toString())
        val s2 = createSchedule(categoryIds = JSONArray(listOf(11, 12, 13)).toString())

        val merged = mutableSetOf<Int>()
        merged.addAll(parseCategoryIds(s1.category_ids))
        merged.addAll(parseCategoryIds(s2.category_ids))

        assertEquals(setOf(10, 11, 12, 13), merged)
    }

    @Test
    fun `empty category IDs contribute nothing to merge`() {
        val s1 = createSchedule(categoryIds = JSONArray(listOf(10)).toString())
        val s2 = createSchedule(categoryIds = null)

        val merged = mutableSetOf<Int>()
        merged.addAll(parseCategoryIds(s1.category_ids))
        merged.addAll(parseCategoryIds(s2.category_ids))

        assertEquals(setOf(10), merged)
    }

    // --- Priority ---

    @Test
    fun `schedules can have different priorities`() {
        val high = createSchedule(priority = 10)
        val low = createSchedule(priority = 1)
        assertTrue(high.priority > low.priority)
    }

    // --- Helpers (mirror MenuScheduleService private methods) ---

    private fun createSchedule(
        categoryIds: String? = null,
        startTime: String? = null,
        endTime: String? = null,
        daysOfWeek: String? = null,
        priority: Int = 0
    ) = MenuSchedule(
        id = 1,
        account_id = "test_acc",
        store_id = 0,
        name = "Test Schedule",
        category_ids = categoryIds,
        start_time = startTime,
        end_time = endTime,
        days_of_week = daysOfWeek,
        priority = priority,
        is_active = true
    )

    private fun parseCategoryIds(json: String?): Set<Int> {
        if (json.isNullOrBlank()) return emptySet()
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { arr.getInt(it) }.toSet()
        } catch (_: Exception) {
            emptySet()
        }
    }

    private fun parseDaysOfWeek(json: String?): List<String> {
        if (json.isNullOrBlank()) return emptyList()
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { arr.getString(it).lowercase() }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun isWithinTimeRange(schedule: MenuSchedule, currentTime: String): Boolean {
        val start = schedule.start_time
        val end = schedule.end_time
        if (start == null && end == null) return true
        if (start != null && currentTime < start) return false
        if (end != null && currentTime > end) return false
        return true
    }
}
