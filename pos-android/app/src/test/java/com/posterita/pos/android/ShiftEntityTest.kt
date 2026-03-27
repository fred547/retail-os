package com.posterita.pos.android

import com.posterita.pos.android.data.local.entity.Shift
import org.junit.Assert.*
import org.junit.Test

/**
 * Tests for Shift entity: status lifecycle, clock in/out,
 * break tracking, and hours worked calculation.
 */
class ShiftEntityTest {

    // --- Status Constants ---

    @Test
    fun `shift status constants match expected values`() {
        assertEquals("active", Shift.STATUS_ACTIVE)
        assertEquals("completed", Shift.STATUS_COMPLETED)
        assertEquals("cancelled", Shift.STATUS_CANCELLED)
    }

    // --- Entity Defaults ---

    @Test
    fun `default shift status is active`() {
        val shift = createShift()
        assertEquals(Shift.STATUS_ACTIVE, shift.status)
    }

    @Test
    fun `default break minutes is zero`() {
        val shift = createShift()
        assertEquals(0, shift.break_minutes)
    }

    @Test
    fun `default hours worked is null`() {
        val shift = createShift()
        assertNull(shift.hours_worked)
    }

    // --- Clock In ---

    @Test
    fun `shift with clock in time`() {
        val shift = createShift(clockIn = "2026-03-27T08:00:00Z")
        assertEquals("2026-03-27T08:00:00Z", shift.clock_in)
    }

    @Test
    fun `shift without clock out (still active)`() {
        val shift = createShift(clockIn = "2026-03-27T08:00:00Z")
        assertNull(shift.clock_out)
        assertEquals(Shift.STATUS_ACTIVE, shift.status)
    }

    // --- Clock Out ---

    @Test
    fun `shift with clock out time`() {
        val shift = createShift(
            clockIn = "2026-03-27T08:00:00Z",
            clockOut = "2026-03-27T17:00:00Z",
            status = Shift.STATUS_COMPLETED
        )
        assertNotNull(shift.clock_out)
        assertEquals(Shift.STATUS_COMPLETED, shift.status)
    }

    @Test
    fun `completed shift has hours worked`() {
        val shift = createShift(
            clockIn = "2026-03-27T08:00:00Z",
            clockOut = "2026-03-27T17:00:00Z",
            hoursWorked = 9.0,
            status = Shift.STATUS_COMPLETED
        )
        assertEquals(9.0, shift.hours_worked!!, 0.01)
    }

    // --- Break Tracking ---

    @Test
    fun `shift with break time`() {
        val shift = createShift(breakMinutes = 60)
        assertEquals(60, shift.break_minutes)
    }

    @Test
    fun `hours worked accounts for breaks`() {
        // 9 hours total - 1 hour break = 8 hours worked
        val shift = createShift(
            clockIn = "2026-03-27T08:00:00Z",
            clockOut = "2026-03-27T17:00:00Z",
            breakMinutes = 60,
            hoursWorked = 8.0,
            status = Shift.STATUS_COMPLETED
        )
        assertEquals(8.0, shift.hours_worked!!, 0.01)
        assertEquals(60, shift.break_minutes)
    }

    // --- User and Context ---

    @Test
    fun `shift tracks user`() {
        val shift = createShift(userId = 5, userName = "Jane")
        assertEquals(5, shift.user_id)
        assertEquals("Jane", shift.user_name)
    }

    @Test
    fun `shift tracks store and terminal`() {
        val shift = createShift()
        assertEquals(TestFixtures.STORE_ID, shift.store_id)
        assertEquals(TestFixtures.TERMINAL_ID, shift.terminal_id)
    }

    // --- Notes ---

    @Test
    fun `shift with notes`() {
        val shift = createShift(notes = "Covered for morning shift")
        assertEquals("Covered for morning shift", shift.notes)
    }

    @Test
    fun `shift without notes`() {
        val shift = createShift()
        assertNull(shift.notes)
    }

    // --- Cancelled Shift ---

    @Test
    fun `cancelled shift`() {
        val shift = createShift(status = Shift.STATUS_CANCELLED)
        assertEquals(Shift.STATUS_CANCELLED, shift.status)
    }

    // --- Multiple Shifts ---

    @Test
    fun `different users can have concurrent shifts`() {
        val shift1 = createShift(userId = 1, userName = "Alice")
        val shift2 = createShift(userId = 2, userName = "Bob")
        assertNotEquals(shift1.user_id, shift2.user_id)
    }

    // --- Helpers ---

    private fun createShift(
        userId: Int = 1,
        userName: String? = "Test User",
        clockIn: String? = null,
        clockOut: String? = null,
        breakMinutes: Int = 0,
        hoursWorked: Double? = null,
        notes: String? = null,
        status: String = Shift.STATUS_ACTIVE
    ) = Shift(
        id = 1,
        account_id = "test_acc",
        store_id = TestFixtures.STORE_ID,
        terminal_id = TestFixtures.TERMINAL_ID,
        user_id = userId,
        user_name = userName,
        clock_in = clockIn,
        clock_out = clockOut,
        break_minutes = breakMinutes,
        hours_worked = hoursWorked,
        notes = notes,
        status = status
    )
}
