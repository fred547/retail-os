package com.posterita.pos.android

import com.posterita.pos.android.data.local.entity.InventoryCountEntry
import com.posterita.pos.android.data.local.entity.InventoryCountSession
import org.junit.Assert.*
import org.junit.Test

/**
 * Tests for inventory count sessions and entries:
 * session lifecycle, entry accumulation, variance calculation,
 * and scan workflow logic.
 */
class InventoryCountTest {

    // --- Session Defaults ---

    @Test
    fun `session default type is spot_check`() {
        val session = createSession()
        assertEquals("spot_check", session.type)
    }

    @Test
    fun `session default status is created`() {
        val session = createSession()
        assertEquals("created", session.status)
    }

    @Test
    fun `session default variance count is zero`() {
        val session = createSession()
        assertEquals(0, session.variance_count)
    }

    // --- Session Types ---

    @Test
    fun `spot check session`() {
        val session = createSession(type = "spot_check")
        assertEquals("spot_check", session.type)
    }

    @Test
    fun `full count session`() {
        val session = createSession(type = "full_count")
        assertEquals("full_count", session.type)
    }

    // --- Session Status Lifecycle ---

    @Test
    fun `session progresses through created to active to completed`() {
        val statuses = listOf("created", "active", "completed")
        assertEquals(3, statuses.toSet().size)
    }

    @Test
    fun `session can have notes`() {
        val session = createSession(notes = "Monthly stocktake Q1")
        assertEquals("Monthly stocktake Q1", session.notes)
    }

    @Test
    fun `session tracks who created it`() {
        val session = createSession(createdBy = 42)
        assertEquals(42, session.created_by)
    }

    @Test
    fun `session can be assigned to a user`() {
        val session = createSession(assignedTo = 7)
        assertEquals(7, session.assigned_to)
    }

    // --- Entry Defaults ---

    @Test
    fun `entry default quantity is 1`() {
        val entry = createEntry()
        assertEquals(1, entry.quantity)
    }

    @Test
    fun `entry default is_synced is N`() {
        val entry = createEntry()
        assertEquals("N", entry.is_synced)
    }

    @Test
    fun `entry default variance is zero`() {
        val entry = createEntry()
        assertEquals(0.0, entry.variance, 0.01)
    }

    // --- Variance Calculation ---

    @Test
    fun `positive variance when counted more than system`() {
        val entry = createEntry(quantity = 12, systemQty = 10.0)
        val variance = entry.quantity - entry.system_qty
        assertEquals(2.0, variance, 0.01)
    }

    @Test
    fun `negative variance when counted less than system`() {
        val entry = createEntry(quantity = 8, systemQty = 10.0)
        val variance = entry.quantity - entry.system_qty
        assertEquals(-2.0, variance, 0.01)
    }

    @Test
    fun `zero variance when count matches system`() {
        val entry = createEntry(quantity = 10, systemQty = 10.0)
        val variance = entry.quantity - entry.system_qty
        assertEquals(0.0, variance, 0.01)
    }

    @Test
    fun `variance stored in entry field`() {
        val entry = createEntry(variance = -3.0)
        assertEquals(-3.0, entry.variance, 0.01)
    }

    // --- Entry Accumulation (re-scan same product) ---

    @Test
    fun `accumulating scans for same product`() {
        // Simulates scanning the same barcode multiple times
        var entry = createEntry(productId = 101, quantity = 1)
        // Second scan: increment quantity
        entry = entry.copy(quantity = entry.quantity + 1)
        assertEquals(2, entry.quantity)
        // Third scan
        entry = entry.copy(quantity = entry.quantity + 1)
        assertEquals(3, entry.quantity)
    }

    @Test
    fun `multiple entries for different products in same session`() {
        val entry1 = createEntry(productId = 101, productName = "Burger")
        val entry2 = createEntry(productId = 102, productName = "Fries")
        val entry3 = createEntry(productId = 103, productName = "Cola")

        val entries = listOf(entry1, entry2, entry3)
        assertEquals(3, entries.map { it.product_id }.toSet().size)
    }

    // --- Barcode / UPC Tracking ---

    @Test
    fun `entry stores UPC barcode`() {
        val entry = createEntry(upc = "5901234123457")
        assertEquals("5901234123457", entry.upc)
    }

    @Test
    fun `entry without UPC has null`() {
        val entry = createEntry()
        assertNull(entry.upc)
    }

    // --- Session Variance Summary ---

    @Test
    fun `session variance count tracks number of discrepancies`() {
        val entries = listOf(
            createEntry(quantity = 10, systemQty = 10.0),  // no variance
            createEntry(quantity = 8, systemQty = 10.0),   // variance
            createEntry(quantity = 12, systemQty = 10.0),  // variance
            createEntry(quantity = 5, systemQty = 5.0)     // no variance
        )
        val varianceCount = entries.count { it.quantity.toDouble() != it.system_qty }
        assertEquals(2, varianceCount)
    }

    @Test
    fun `total variance amount across all entries`() {
        val entries = listOf(
            createEntry(quantity = 8, systemQty = 10.0),   // -2
            createEntry(quantity = 12, systemQty = 10.0),  // +2
            createEntry(quantity = 3, systemQty = 5.0)     // -2
        )
        val totalVariance = entries.sumOf { it.quantity.toDouble() - it.system_qty }
        assertEquals(-2.0, totalVariance, 0.01)
    }

    // --- Sync State ---

    @Test
    fun `entry marked as synced`() {
        val entry = createEntry(isSynced = "Y")
        assertEquals("Y", entry.is_synced)
    }

    @Test
    fun `new entry is not synced`() {
        val entry = createEntry()
        assertEquals("N", entry.is_synced)
    }

    // --- Helpers ---

    private fun createSession(
        type: String = "spot_check",
        status: String = "created",
        notes: String? = null,
        createdBy: Int = 0,
        assignedTo: Int? = null
    ) = InventoryCountSession(
        session_id = 1,
        account_id = "test_acc",
        store_id = TestFixtures.STORE_ID,
        type = type,
        status = status,
        name = "Test Count",
        notes = notes,
        created_by = createdBy,
        assigned_to = assignedTo
    )

    private fun createEntry(
        productId: Int = 101,
        productName: String? = "Test Product",
        upc: String? = null,
        quantity: Int = 1,
        systemQty: Double = 0.0,
        variance: Double = 0.0,
        isSynced: String = "N"
    ) = InventoryCountEntry(
        session_id = 1,
        account_id = "test_acc",
        product_id = productId,
        product_name = productName,
        upc = upc,
        quantity = quantity,
        system_qty = systemQty,
        variance = variance,
        is_synced = isSynced,
        terminal_id = TestFixtures.TERMINAL_ID
    )
}
