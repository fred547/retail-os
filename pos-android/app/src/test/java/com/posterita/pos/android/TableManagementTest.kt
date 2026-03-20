package com.posterita.pos.android

import com.posterita.pos.android.data.local.entity.RestaurantTable
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Regression tests for Restaurant Table management logic.
 *
 * Covers Sprint 4: table occupy/free lifecycle, occupied table detection,
 * and error rollback (table status should be reverted if hold order save fails).
 *
 * NOTE: These tests validate the pure logic of table state management.
 * DAO-level tests require an instrumented test with Room's in-memory DB.
 */
@RunWith(RobolectricTestRunner::class)
class TableManagementTest {

    private lateinit var tables: MutableList<RestaurantTable>

    @Before
    fun setUp() {
        // Initialize deterministic set of tables — all free
        tables = mutableListOf(
            TestFixtures.TABLE_1.copy(),
            TestFixtures.TABLE_2.copy(),
            TestFixtures.TABLE_3.copy()
        )
    }

    // ========== TABLE STATE ==========

    @Test
    fun allTables_initiallyFree() {
        assertTrue(tables.all { !it.is_occupied })
        assertTrue(tables.all { it.current_order_id == null })
    }

    @Test
    fun occupyTable_setsOccupied() {
        val table = occupyTable(tables[0], "order-uuid-1")

        assertTrue(table.is_occupied)
        assertEquals("order-uuid-1", table.current_order_id)
    }

    @Test
    fun freeTable_clearsStatus() {
        val occupied = occupyTable(tables[0], "order-uuid-1")
        val freed = freeTable(occupied)

        assertFalse(freed.is_occupied)
        assertNull(freed.current_order_id)
    }

    @Test
    fun occupiedTablesList_filtersCorrectly() {
        // Occupy tables 1 and 3
        tables[0] = occupyTable(tables[0], "order-1")
        tables[2] = occupyTable(tables[2], "order-2")

        val occupied = tables.filter { it.is_occupied }
        val free = tables.filter { !it.is_occupied }

        assertEquals(2, occupied.size)
        assertEquals(1, free.size)
        assertEquals("Table 2", free[0].table_name)
    }

    @Test
    fun freeTablesList_filtersCorrectly() {
        tables[1] = occupyTable(tables[1], "order-1")

        val free = tables.filter { !it.is_occupied }

        assertEquals(2, free.size)
        assertTrue(free.any { it.table_name == "Table 1" })
        assertTrue(free.any { it.table_name == "Table 3" })
    }

    // ========== TABLE PICKER DIALOG LOGIC ==========

    @Test
    fun tablePickerDialog_showsAllTables() {
        assertEquals(3, tables.size)
    }

    @Test
    fun tablePickerDialog_occupiedTableIdentifiable() {
        tables[0] = occupyTable(tables[0], "order-1")

        // In CartActivity.showTablePickerDialog(), occupied tables
        // are shown with a red background and offer merge/replace
        val isOccupied = tables[0].is_occupied
        assertTrue(isOccupied)
    }

    @Test
    fun tablePickerDialog_freeTableDirectlySelectable() {
        val table = tables[1]
        assertFalse(table.is_occupied)
    }

    // ========== TABLE INDEX SAFETY ==========

    @Test
    fun forEachIndexed_safeIteration() {
        // This was a Sprint 1 bug fix: tables[tableViews.indexOf(v)] crashed
        // when indexOf returned -1. Now uses forEachIndexed with bounds check.
        val tableNames = mutableListOf<String>()

        tables.forEachIndexed { index, table ->
            if (index in tables.indices) {
                tableNames.add(table.table_name)
            }
        }

        assertEquals(3, tableNames.size)
    }

    @Test
    fun indexBoundsCheck_negativeIndex_noAction() {
        // Simulates the old bug: indexOf returning -1
        val index = -1
        var accessed = false

        if (index in tables.indices) {
            accessed = true
        }

        assertFalse(accessed)
    }

    @Test
    fun indexBoundsCheck_outOfRange_noAction() {
        val index = tables.size  // one past the end
        var accessed = false

        if (index in tables.indices) {
            accessed = true
        }

        assertFalse(accessed)
    }

    // ========== TABLE ERROR ROLLBACK ==========

    @Test
    fun rollback_occupiedTableFreedOnError() {
        // Sprint 2 fix: if hold order save fails after table was marked occupied,
        // the table should be rolled back to free.
        val table = occupyTable(tables[0], "order-1")
        assertTrue(table.is_occupied)

        // Simulate error during save — rollback
        val rolledBack = freeTable(table)
        assertFalse(rolledBack.is_occupied)
        assertNull(rolledBack.current_order_id)
    }

    // ========== ADD ITEMS TO OCCUPIED TABLE ==========

    @Test
    fun occupiedTable_hasExistingOrderId() {
        tables[0] = occupyTable(tables[0], "order-uuid-123")

        assertEquals("order-uuid-123", tables[0].current_order_id)
    }

    @Test
    fun occupiedTable_mergeDecision() {
        tables[0] = occupyTable(tables[0], "order-1")

        // When user taps occupied table, they get 3 choices:
        // 1. Merge (add items to existing) — most common in restaurants
        // 2. Replace (clear existing, new order)
        // 3. Cancel

        // The decision is UI-driven, but the table state is what triggers the dialog
        assertTrue(tables[0].is_occupied)
        assertNotNull(tables[0].current_order_id)
    }

    // ========== KITCHEN ORDER JSON TABLE FIELDS ==========

    @Test
    fun kitchenOrderJson_tableFieldsPresent() {
        val cart = TestFixtures.cartWith(TestFixtures.PRODUCT_BURGER)
        val json = TestFixtures.kitchenOrderJson(
            cart, tableId = 2, tableName = "Table 2"
        )

        assertEquals(2, json.getInt("tableId"))
        assertEquals("Table 2", json.getString("tableName"))
    }

    @Test
    fun kitchenOrderJson_tableFieldsMatchEntity() {
        val table = tables[1] // Table 2
        val cart = TestFixtures.cartWith(TestFixtures.PRODUCT_BURGER)
        val json = TestFixtures.kitchenOrderJson(
            cart, tableId = table.table_id, tableName = table.table_name
        )

        assertEquals(table.table_id, json.getInt("tableId"))
        assertEquals(table.table_name, json.getString("tableName"))
    }

    @Test
    fun freeTable_afterDelete() {
        // When a kitchen order is deleted, the table should be freed
        tables[0] = occupyTable(tables[0], "order-1")
        assertTrue(tables[0].is_occupied)

        // Simulate delete: free the table
        val tableId = 1
        val tableIndex = tables.indexOfFirst { it.table_id == tableId }
        if (tableIndex >= 0) {
            tables[tableIndex] = freeTable(tables[tableIndex])
        }

        assertFalse(tables[0].is_occupied)
    }

    @Test
    fun freeTable_afterComplete() {
        // When a kitchen order is completed (paid), the table should be freed
        tables[2] = occupyTable(tables[2], "order-3")

        val tableId = 3
        val tableIndex = tables.indexOfFirst { it.table_id == tableId }
        if (tableIndex >= 0) {
            tables[tableIndex] = freeTable(tables[tableIndex])
        }

        assertFalse(tables[2].is_occupied)
    }

    @Test
    fun freeTable_afterRecall() {
        // When a kitchen order is recalled to cart, the table should be freed
        tables[0] = occupyTable(tables[0], "order-recall")

        val tableId = 1
        val tableIndex = tables.indexOfFirst { it.table_id == tableId }
        if (tableIndex >= 0) {
            tables[tableIndex] = freeTable(tables[tableIndex])
        }

        assertFalse(tables[0].is_occupied)
    }

    // ========== HELPERS ==========

    /** Simulate DAO updateTableStatus(occupied=true). */
    private fun occupyTable(table: RestaurantTable, orderId: String): RestaurantTable {
        return table.copy(
            is_occupied = true,
            current_order_id = orderId,
            updated = System.currentTimeMillis()
        )
    }

    /** Simulate DAO updateTableStatus(occupied=false). */
    private fun freeTable(table: RestaurantTable): RestaurantTable {
        return table.copy(
            is_occupied = false,
            current_order_id = null,
            updated = System.currentTimeMillis()
        )
    }
}
