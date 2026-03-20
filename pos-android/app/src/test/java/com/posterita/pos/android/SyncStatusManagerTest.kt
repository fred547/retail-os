package com.posterita.pos.android

import com.posterita.pos.android.service.SyncStatusManager
import com.posterita.pos.android.service.SyncStatusManager.SyncState
import com.posterita.pos.android.service.SyncStatusManager.SyncSummary
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/**
 * Tests for SyncStatusManager state machine.
 */
class SyncStatusManagerTest {

    @Before
    fun reset() {
        SyncStatusManager.idle(0)
    }

    // ======================== INITIAL STATE ========================

    @Test
    fun `initial state is IDLE`() {
        assertEquals(SyncState.IDLE, SyncStatusManager.status.value.state)
    }

    @Test
    fun `initial message is empty`() {
        assertEquals("", SyncStatusManager.status.value.message)
    }

    @Test
    fun `initial error message is null`() {
        assertNull(SyncStatusManager.status.value.errorMessage)
    }

    @Test
    fun `initial summary is null`() {
        assertNull(SyncStatusManager.status.value.summary)
    }

    // ======================== UPDATE ========================

    @Test
    fun `update changes state and message`() {
        SyncStatusManager.update(SyncState.CONNECTING, "Connecting...", percent = 10)
        val status = SyncStatusManager.status.value
        assertEquals(SyncState.CONNECTING, status.state)
        assertEquals("Connecting...", status.message)
        assertEquals(10, status.progressPercent)
    }

    @Test
    fun `update clears previous error`() {
        SyncStatusManager.error("Failed")
        SyncStatusManager.update(SyncState.CONNECTING, "Retrying...")
        assertNull(SyncStatusManager.status.value.errorMessage)
    }

    @Test
    fun `update preserves lastSyncTime`() {
        SyncStatusManager.idle(99999L)
        SyncStatusManager.update(SyncState.PUSHING_ORDERS, "Uploading...")
        assertEquals(99999L, SyncStatusManager.status.value.lastSyncTime)
    }

    @Test
    fun `progress percent defaults to -1 (indeterminate)`() {
        SyncStatusManager.update(SyncState.CONNECTING, "Working...")
        assertEquals(-1, SyncStatusManager.status.value.progressPercent)
    }

    @Test
    fun `progress detail is preserved`() {
        SyncStatusManager.update(SyncState.PULLING_PRODUCTS, "Downloading...", "50 / 100", 50)
        val status = SyncStatusManager.status.value
        assertEquals("50 / 100", status.progressDetail)
        assertEquals(50, status.progressPercent)
    }

    // ======================== ERROR ========================

    @Test
    fun `error sets state and error message`() {
        SyncStatusManager.error("Network timeout")
        val status = SyncStatusManager.status.value
        assertEquals(SyncState.ERROR, status.state)
        assertEquals("Network timeout", status.errorMessage)
    }

    @Test
    fun `error sets message to Sync failed`() {
        SyncStatusManager.error("Something")
        assertEquals("Sync failed", SyncStatusManager.status.value.message)
    }

    // ======================== COMPLETE ========================

    @Test
    fun `complete sets summary and timestamp`() {
        val summary = SyncSummary(ordersPushed = 5, productsPulled = 10, durationMs = 1500)
        SyncStatusManager.complete(summary, 1710489600000L)
        val status = SyncStatusManager.status.value
        assertEquals(SyncState.COMPLETE, status.state)
        assertEquals("Sync complete", status.message)
        assertNotNull(status.summary)
        assertEquals(5, status.summary!!.ordersPushed)
        assertEquals(10, status.summary!!.productsPulled)
        assertEquals(1500, status.summary!!.durationMs)
        assertEquals(1710489600000L, status.lastSyncTime)
    }

    // ======================== IDLE ========================

    @Test
    fun `idle resets all state`() {
        SyncStatusManager.error("Something broke")
        SyncStatusManager.idle(12345L)
        val status = SyncStatusManager.status.value
        assertEquals(SyncState.IDLE, status.state)
        assertEquals("", status.message)
        assertNull(status.errorMessage)
        assertNull(status.summary)
        assertEquals(12345L, status.lastSyncTime)
    }

    @Test
    fun `idle preserves last sync time when not specified`() {
        SyncStatusManager.complete(SyncSummary(), 77777L)
        SyncStatusManager.idle()
        assertEquals(77777L, SyncStatusManager.status.value.lastSyncTime)
    }

    // ======================== SET LAST SYNC TIME ========================

    @Test
    fun `setLastSyncTime only updates timestamp`() {
        SyncStatusManager.update(SyncState.PUSHING_ORDERS, "Uploading...")
        SyncStatusManager.setLastSyncTime(99999L)
        val status = SyncStatusManager.status.value
        assertEquals(SyncState.PUSHING_ORDERS, status.state) // unchanged
        assertEquals("Uploading...", status.message) // unchanged
        assertEquals(99999L, status.lastSyncTime)
    }

    // ======================== SYNC SUMMARY CALCULATIONS ========================

    @Test
    fun `SyncSummary totalPushed sums orders and tills`() {
        val summary = SyncSummary(ordersPushed = 5, tillsPushed = 2)
        assertEquals(7, summary.totalPushed)
    }

    @Test
    fun `SyncSummary totalPulled sums all pulled categories`() {
        val summary = SyncSummary(
            productsPulled = 10, categoriesPulled = 3, taxesPulled = 2,
            modifiersPulled = 5, customersPulled = 8, usersPulled = 3,
            discountCodesPulled = 1, preferencesPulled = 1, tablesPulled = 4
        )
        assertEquals(37, summary.totalPulled)
    }

    @Test
    fun `SyncSummary totalPushed is 0 when nothing pushed`() {
        assertEquals(0, SyncSummary().totalPushed)
    }

    @Test
    fun `SyncSummary totalPulled is 0 when nothing pulled`() {
        assertEquals(0, SyncSummary().totalPulled)
    }

    // ======================== DISPLAY STRING ========================

    @Test
    fun `SyncSummary toDisplayString shows non-zero items`() {
        val summary = SyncSummary(ordersPushed = 3, productsPulled = 5)
        val display = summary.toDisplayString()
        assertTrue(display.contains("3 orders"))
        assertTrue(display.contains("5 products"))
        assertFalse(display.contains("tills"))
        assertFalse(display.contains("categories"))
    }

    @Test
    fun `SyncSummary toDisplayString shows up to date when all zero`() {
        val summary = SyncSummary()
        assertEquals("Everything up to date", summary.toDisplayString())
    }

    @Test
    fun `SyncSummary toDisplayString shows all non-zero fields`() {
        val summary = SyncSummary(
            ordersPushed = 1, tillsPushed = 2,
            productsPulled = 3, categoriesPulled = 4,
            taxesPulled = 5, modifiersPulled = 6,
            customersPulled = 7, usersPulled = 8,
            discountCodesPulled = 9, preferencesPulled = 10,
            tablesPulled = 11
        )
        val display = summary.toDisplayString()
        assertTrue(display.contains("1 orders"))
        assertTrue(display.contains("2 tills"))
        assertTrue(display.contains("3 products"))
        assertTrue(display.contains("4 categories"))
        assertTrue(display.contains("5 taxes"))
        assertTrue(display.contains("6 modifiers"))
        assertTrue(display.contains("7 customers"))
        assertTrue(display.contains("8 users"))
        assertTrue(display.contains("9 discount codes"))
        assertTrue(display.contains("10 preferences"))
        assertTrue(display.contains("11 tables"))
    }

    // ======================== STATE TRANSITIONS ========================

    @Test
    fun `can transition through full sync lifecycle`() {
        // IDLE -> CONNECTING -> PUSHING_ORDERS -> PUSHING_TILLS -> PULLING_PRODUCTS -> COMPLETE -> IDLE
        assertEquals(SyncState.IDLE, SyncStatusManager.status.value.state)

        SyncStatusManager.update(SyncState.CONNECTING, "Connecting...")
        assertEquals(SyncState.CONNECTING, SyncStatusManager.status.value.state)

        SyncStatusManager.update(SyncState.PUSHING_ORDERS, "Pushing orders...", "3 / 5", 60)
        assertEquals(SyncState.PUSHING_ORDERS, SyncStatusManager.status.value.state)

        SyncStatusManager.update(SyncState.PUSHING_TILLS, "Pushing tills...")
        assertEquals(SyncState.PUSHING_TILLS, SyncStatusManager.status.value.state)

        SyncStatusManager.update(SyncState.PULLING_PRODUCTS, "Pulling products...")
        assertEquals(SyncState.PULLING_PRODUCTS, SyncStatusManager.status.value.state)

        val summary = SyncSummary(ordersPushed = 5, tillsPushed = 1, productsPulled = 10)
        SyncStatusManager.complete(summary, System.currentTimeMillis())
        assertEquals(SyncState.COMPLETE, SyncStatusManager.status.value.state)

        SyncStatusManager.idle()
        assertEquals(SyncState.IDLE, SyncStatusManager.status.value.state)
    }

    @Test
    fun `can recover from error state`() {
        SyncStatusManager.error("Network timeout")
        assertEquals(SyncState.ERROR, SyncStatusManager.status.value.state)

        SyncStatusManager.update(SyncState.CONNECTING, "Retrying...")
        assertEquals(SyncState.CONNECTING, SyncStatusManager.status.value.state)
        assertNull(SyncStatusManager.status.value.errorMessage)
    }
}
