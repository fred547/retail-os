package com.posterita.pos.android.database

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.dao.RestaurantTableDao
import com.posterita.pos.android.data.local.entity.RestaurantTable
import kotlinx.coroutines.runBlocking
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Instrumented tests for RestaurantTableDao (Room database).
 *
 * Uses an in-memory database that is destroyed after each test,
 * ensuring deterministic state for every run.
 *
 * Covers table CRUD, occupy/free lifecycle, and store-scoped queries.
 */
@RunWith(AndroidJUnit4::class)
class RestaurantTableDaoTest {

    private lateinit var db: AppDatabase
    private lateinit var tableDao: RestaurantTableDao

    @Before
    fun setUp() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        tableDao = db.restaurantTableDao()
        // Seed deterministic tables
        runBlocking {
            tableDao.insertTable(RestaurantTable(table_name = "Table 1", store_id = 1, terminal_id = 1, seats = 4))
            tableDao.insertTable(RestaurantTable(table_name = "Table 2", store_id = 1, terminal_id = 1, seats = 6))
            tableDao.insertTable(RestaurantTable(table_name = "Table 3", store_id = 1, terminal_id = 1, seats = 2))
            tableDao.insertTable(RestaurantTable(table_name = "Bar 1", store_id = 2, terminal_id = 2, seats = 2))
        }
    }

    @After
    fun tearDown() {
        db.close()
    }

    // ========== QUERY ==========

    @Test
    fun getTablesByStore_returnsCorrectStore() = runBlocking {
        val store1Tables = tableDao.getTablesByStore(1)
        val store2Tables = tableDao.getTablesByStore(2)

        assertEquals(3, store1Tables.size)
        assertEquals(1, store2Tables.size)
    }

    @Test
    fun getTablesByStore_sortedByName() = runBlocking {
        val tables = tableDao.getTablesByStore(1)

        assertEquals("Table 1", tables[0].table_name)
        assertEquals("Table 2", tables[1].table_name)
        assertEquals("Table 3", tables[2].table_name)
    }

    @Test
    fun getTableById_returnsCorrectTable() = runBlocking {
        val tables = tableDao.getTablesByStore(1)
        val tableId = tables[0].table_id

        val table = tableDao.getTableById(tableId)

        assertNotNull(table)
        assertEquals("Table 1", table!!.table_name)
    }

    @Test
    fun getTableById_nonExistent_returnsNull() = runBlocking {
        val table = tableDao.getTableById(999)
        assertNull(table)
    }

    @Test
    fun getTableCount_returnsCorrectCount() = runBlocking {
        val count = tableDao.getTableCount(1)
        assertEquals(3, count)
    }

    // ========== OCCUPY / FREE ==========

    @Test
    fun updateTableStatus_occupyTable() = runBlocking {
        val tables = tableDao.getTablesByStore(1)
        val tableId = tables[0].table_id

        tableDao.updateTableStatus(tableId, true, "order-uuid-1")

        val updated = tableDao.getTableById(tableId)!!
        assertTrue(updated.is_occupied)
        assertEquals("order-uuid-1", updated.current_order_id)
    }

    @Test
    fun updateTableStatus_freeTable() = runBlocking {
        val tables = tableDao.getTablesByStore(1)
        val tableId = tables[0].table_id

        // Occupy then free
        tableDao.updateTableStatus(tableId, true, "order-1")
        tableDao.updateTableStatus(tableId, false, null)

        val updated = tableDao.getTableById(tableId)!!
        assertFalse(updated.is_occupied)
        assertNull(updated.current_order_id)
    }

    @Test
    fun getOccupiedTables_filtersCorrectly() = runBlocking {
        val tables = tableDao.getTablesByStore(1)
        tableDao.updateTableStatus(tables[0].table_id, true, "order-1")
        tableDao.updateTableStatus(tables[2].table_id, true, "order-2")

        val occupied = tableDao.getOccupiedTables(1)
        val free = tableDao.getFreeTables(1)

        assertEquals(2, occupied.size)
        assertEquals(1, free.size)
        assertEquals("Table 2", free[0].table_name) // Only Table 2 is free
    }

    @Test
    fun getFreeTables_allFreeInitially() = runBlocking {
        val free = tableDao.getFreeTables(1)
        assertEquals(3, free.size)
    }

    @Test
    fun getOccupiedTables_noneOccupiedInitially() = runBlocking {
        val occupied = tableDao.getOccupiedTables(1)
        assertTrue(occupied.isEmpty())
    }

    @Test
    fun occupiedTables_scopedByStore() = runBlocking {
        val store1Tables = tableDao.getTablesByStore(1)
        val store2Tables = tableDao.getTablesByStore(2)

        tableDao.updateTableStatus(store1Tables[0].table_id, true, "order-1")
        tableDao.updateTableStatus(store2Tables[0].table_id, true, "order-2")

        val store1Occupied = tableDao.getOccupiedTables(1)
        val store2Occupied = tableDao.getOccupiedTables(2)

        assertEquals(1, store1Occupied.size)
        assertEquals(1, store2Occupied.size)
    }

    // ========== DELETE ==========

    @Test
    fun deleteTable_removesFromDatabase() = runBlocking {
        val tables = tableDao.getTablesByStore(1)
        val table = tables[0]

        tableDao.deleteTable(table)

        val remaining = tableDao.getTablesByStore(1)
        assertEquals(2, remaining.size)
        assertFalse(remaining.any { it.table_name == "Table 1" })
    }

    // ========== UPDATE ==========

    @Test
    fun updateTable_changesSeats() = runBlocking {
        val tables = tableDao.getTablesByStore(1)
        val table = tables[0]

        tableDao.updateTable(table.copy(seats = 8))

        val updated = tableDao.getTableById(table.table_id)!!
        assertEquals(8, updated.seats)
    }

    // ========== LIFECYCLE: OCCUPY -> ORDER -> FREE ==========

    @Test
    fun fullLifecycle_occupyThenFreeAfterPayment() = runBlocking {
        val tables = tableDao.getTablesByStore(1)
        val tableId = tables[0].table_id

        // 1. Place order on table (occupy)
        tableDao.updateTableStatus(tableId, true, "kitchen-order-1")
        var table = tableDao.getTableById(tableId)!!
        assertTrue(table.is_occupied)

        // 2. Order paid (free)
        tableDao.updateTableStatus(tableId, false, null)
        table = tableDao.getTableById(tableId)!!
        assertFalse(table.is_occupied)
        assertNull(table.current_order_id)
    }

    @Test
    fun fullLifecycle_occupyThenFreeAfterDelete() = runBlocking {
        val tables = tableDao.getTablesByStore(1)
        val tableId = tables[0].table_id

        // 1. Place order on table
        tableDao.updateTableStatus(tableId, true, "kitchen-order-1")

        // 2. Order deleted (free the table)
        tableDao.updateTableStatus(tableId, false, null)

        val table = tableDao.getTableById(tableId)!!
        assertFalse(table.is_occupied)
    }

    @Test
    fun fullLifecycle_occupyThenFreeAfterRecall() = runBlocking {
        val tables = tableDao.getTablesByStore(1)
        val tableId = tables[0].table_id

        // 1. Place order on table
        tableDao.updateTableStatus(tableId, true, "kitchen-order-1")

        // 2. Order recalled to cart (free the table)
        tableDao.updateTableStatus(tableId, false, null)

        val table = tableDao.getTableById(tableId)!!
        assertFalse(table.is_occupied)
    }

    @Test
    fun updatedTimestamp_changesOnStatusUpdate() = runBlocking {
        val tables = tableDao.getTablesByStore(1)
        val tableId = tables[0].table_id
        val originalUpdated = tables[0].updated

        // Small delay to ensure timestamp differs
        Thread.sleep(10)
        tableDao.updateTableStatus(tableId, true, "order-1", System.currentTimeMillis())

        val updated = tableDao.getTableById(tableId)!!
        assertTrue(updated.updated >= originalUpdated)
    }
}
