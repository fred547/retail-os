package com.posterita.pos.android.database

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.dao.HoldOrderDao
import com.posterita.pos.android.data.local.entity.HoldOrder
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.sql.Timestamp

/**
 * Instrumented tests for HoldOrderDao (Room database).
 *
 * Uses an in-memory database that is destroyed after each test,
 * ensuring deterministic state for every run.
 *
 * Covers:
 * - CRUD operations (insert, query, delete)
 * - Terminal-scoped queries
 * - JSON field persistence (modifiers, notes, kitchen flags, status)
 * - Kitchen order filtering at the DAO level
 */
@RunWith(AndroidJUnit4::class)
class HoldOrderDaoTest {

    private lateinit var db: AppDatabase
    private lateinit var holdOrderDao: HoldOrderDao

    @Before
    fun setUp() {
        val context = ApplicationProvider.getApplicationContext<Context>()
        db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        holdOrderDao = db.holdOrderDao()
    }

    @After
    fun tearDown() {
        db.close()
    }

    // ========== INSERT & QUERY ==========

    @Test
    fun insertHoldOrder_returnsId() = runBlocking {
        val order = createHoldOrder("Test order")
        val id = holdOrderDao.insertHoldOrder(order)
        assertTrue(id > 0)
    }

    @Test
    fun getAllHoldOrders_returnsInserted() = runBlocking {
        holdOrderDao.insertHoldOrder(createHoldOrder("Order 1"))
        holdOrderDao.insertHoldOrder(createHoldOrder("Order 2"))

        val orders = holdOrderDao.getAllHoldOrders()
        assertEquals(2, orders.size)
    }

    @Test
    fun getHoldOrdersByTerminal_filtersCorrectly() = runBlocking {
        holdOrderDao.insertHoldOrder(createHoldOrder("Terminal 1", terminalId = 1))
        holdOrderDao.insertHoldOrder(createHoldOrder("Terminal 2", terminalId = 2))
        holdOrderDao.insertHoldOrder(createHoldOrder("Terminal 1b", terminalId = 1))

        val terminal1Orders = holdOrderDao.getHoldOrdersByTerminal(1)
        val terminal2Orders = holdOrderDao.getHoldOrdersByTerminal(2)

        assertEquals(2, terminal1Orders.size)
        assertEquals(1, terminal2Orders.size)
    }

    @Test
    fun getHoldOrdersByTerminal_emptyForNonExistent() = runBlocking {
        holdOrderDao.insertHoldOrder(createHoldOrder("Order", terminalId = 1))

        val orders = holdOrderDao.getHoldOrdersByTerminal(999)
        assertTrue(orders.isEmpty())
    }

    // ========== DELETE ==========

    @Test
    fun deleteHoldOrder_removesOrder() = runBlocking {
        val order = createHoldOrder("To delete")
        val id = holdOrderDao.insertHoldOrder(order).toInt()

        val orders = holdOrderDao.getAllHoldOrders()
        assertEquals(1, orders.size)

        holdOrderDao.deleteHoldOrder(orders[0])

        val remaining = holdOrderDao.getAllHoldOrders()
        assertTrue(remaining.isEmpty())
    }

    @Test
    fun deleteHoldOrderById_removesCorrectOrder() = runBlocking {
        val id1 = holdOrderDao.insertHoldOrder(createHoldOrder("Keep")).toInt()
        val id2 = holdOrderDao.insertHoldOrder(createHoldOrder("Delete")).toInt()

        holdOrderDao.deleteHoldOrderById(id2)

        val remaining = holdOrderDao.getAllHoldOrders()
        assertEquals(1, remaining.size)
        assertEquals(id1, remaining[0].holdOrderId)
    }

    // ========== JSON PERSISTENCE ==========

    @Test
    fun jsonField_persistedAndRetrieved() = runBlocking {
        val json = JSONObject().apply {
            put("note", "Test note")
            put("orderType", "dine_in")
            put("grandtotal", 250.0)
        }
        holdOrderDao.insertHoldOrder(createHoldOrder("With JSON", json = json))

        val orders = holdOrderDao.getAllHoldOrders()
        val retrieved = orders[0].json!!

        assertEquals("Test note", retrieved.getString("note"))
        assertEquals("dine_in", retrieved.getString("orderType"))
        assertEquals(250.0, retrieved.getDouble("grandtotal"), 0.01)
    }

    @Test
    fun jsonField_preservesItems() = runBlocking {
        val items = JSONArray().apply {
            put(JSONObject().apply {
                put("product_id", 101)
                put("product_name", "Burger")
                put("qty", 2.0)
                put("price", 200.0)
                put("modifiers", "Extra Cheese")
                put("note", "Well done")
            })
            put(JSONObject().apply {
                put("product_id", 102)
                put("product_name", "Fries")
                put("qty", 1.0)
                put("price", 75.0)
                put("modifiers", "")
                put("note", "")
            })
        }
        val json = JSONObject().apply {
            put("items", items)
            put("grandtotal", 575.0)
        }
        holdOrderDao.insertHoldOrder(createHoldOrder("Items test", json = json))

        val orders = holdOrderDao.getAllHoldOrders()
        val retrieved = orders[0].json!!
        val retrievedItems = retrieved.getJSONArray("items")

        assertEquals(2, retrievedItems.length())
        assertEquals("Burger", retrievedItems.getJSONObject(0).getString("product_name"))
        assertEquals("Extra Cheese", retrievedItems.getJSONObject(0).getString("modifiers"))
        assertEquals("Well done", retrievedItems.getJSONObject(0).getString("note"))
    }

    @Test
    fun jsonField_preservesKitchenOrderFlag() = runBlocking {
        val json = JSONObject().apply {
            put("isKitchenOrder", true)
            put("status", "new")
            put("tableId", 1)
            put("tableName", "Table 1")
        }
        holdOrderDao.insertHoldOrder(createHoldOrder("Kitchen order", json = json))

        val orders = holdOrderDao.getAllHoldOrders()
        val retrieved = orders[0].json!!

        assertTrue(retrieved.getBoolean("isKitchenOrder"))
        assertEquals("new", retrieved.getString("status"))
        assertEquals(1, retrieved.getInt("tableId"))
        assertEquals("Table 1", retrieved.getString("tableName"))
    }

    @Test
    fun jsonField_preservesStatusChange() = runBlocking {
        val json = JSONObject().apply {
            put("isKitchenOrder", true)
            put("status", "new")
        }
        val id = holdOrderDao.insertHoldOrder(createHoldOrder("Status test", json = json)).toInt()

        // Update status (same as KitchenOrdersActivity.onStatusChange)
        val orders = holdOrderDao.getAllHoldOrders()
        val order = orders[0]
        order.json!!.put("status", "in_progress")
        holdOrderDao.insertHoldOrder(order) // REPLACE

        val updated = holdOrderDao.getAllHoldOrders()
        assertEquals("in_progress", updated[0].json!!.getString("status"))
    }

    @Test
    fun jsonField_preservesDiscountFields() = runBlocking {
        val json = JSONObject().apply {
            put("discountOnTotalPercentage", 15.0)
            put("discountOnTotalAmount", 50.0)
            put("tipsAmount", 25.0)
            put("tipsPercentage", 10.0)
        }
        holdOrderDao.insertHoldOrder(createHoldOrder("Discount test", json = json))

        val orders = holdOrderDao.getAllHoldOrders()
        val retrieved = orders[0].json!!

        assertEquals(15.0, retrieved.getDouble("discountOnTotalPercentage"), 0.01)
        assertEquals(50.0, retrieved.getDouble("discountOnTotalAmount"), 0.01)
        assertEquals(25.0, retrieved.getDouble("tipsAmount"), 0.01)
        assertEquals(10.0, retrieved.getDouble("tipsPercentage"), 0.01)
    }

    // ========== KITCHEN ORDER FILTERING ==========

    @Test
    fun kitchenOrderFilter_separatesFromRegularHolds() = runBlocking {
        // Kitchen order
        val kitchenJson = JSONObject().apply {
            put("isKitchenOrder", true)
            put("status", "new")
        }
        holdOrderDao.insertHoldOrder(createHoldOrder("Kitchen", json = kitchenJson))

        // Regular hold order
        val regularJson = JSONObject().apply {
            put("note", "regular hold")
        }
        holdOrderDao.insertHoldOrder(createHoldOrder("Regular", json = regularJson))

        val allOrders = holdOrderDao.getHoldOrdersByTerminal(1)

        // Filter same way as KitchenOrdersActivity
        val kitchenOrders = allOrders.filter { hold ->
            val json = hold.json ?: return@filter false
            json.optBoolean("isKitchenOrder", false)
        }

        // Filter same way as HoldOrderActivity
        val regularOrders = allOrders.filter { hold ->
            val json = hold.json ?: return@filter true
            !json.optBoolean("isKitchenOrder", false)
        }

        assertEquals(1, kitchenOrders.size)
        assertEquals(1, regularOrders.size)
        assertEquals("Kitchen", kitchenOrders[0].description)
        assertEquals("Regular", regularOrders[0].description)
    }

    // ========== TIMESTAMP PERSISTENCE ==========

    @Test
    fun timestampField_persistedAndRetrieved() = runBlocking {
        val timestamp = Timestamp(1710489600000L)
        val order = HoldOrder(
            dateHold = timestamp,
            json = JSONObject(),
            description = "Timestamp test",
            tillId = 100,
            terminalId = 1,
            storeId = 1
        )
        holdOrderDao.insertHoldOrder(order)

        val orders = holdOrderDao.getAllHoldOrders()
        assertEquals(timestamp, orders[0].dateHold)
    }

    @Test
    fun nullTimestamp_handledCorrectly() = runBlocking {
        val order = HoldOrder(
            dateHold = null,
            json = JSONObject(),
            description = "No timestamp",
            terminalId = 1
        )
        holdOrderDao.insertHoldOrder(order)

        val orders = holdOrderDao.getAllHoldOrders()
        assertNull(orders[0].dateHold)
    }

    // ========== SPLIT BILL DB OPERATIONS ==========

    @Test
    fun splitBill_updateExistingOrder() = runBlocking {
        // Insert original 3-item order
        val items = JSONArray().apply {
            put(itemJson(101, "Burger", 1.0, 200.0, 230.0))
            put(itemJson(102, "Fries", 1.0, 75.0, 86.25))
            put(itemJson(103, "Cola", 1.0, 50.0, 57.5))
        }
        val json = JSONObject().apply {
            put("items", items)
            put("grandtotal", 373.75)
            put("isKitchenOrder", true)
            put("tableId", 1)
        }
        val id = holdOrderDao.insertHoldOrder(createHoldOrder("Table 1", json = json)).toInt()

        // Split: remove Burger (pay now), keep Fries + Cola on table
        val orders = holdOrderDao.getAllHoldOrders()
        val order = orders[0]
        val remainItems = JSONArray().apply {
            put(itemJson(102, "Fries", 1.0, 75.0, 86.25))
            put(itemJson(103, "Cola", 1.0, 50.0, 57.5))
        }
        val updatedJson = JSONObject(order.json.toString()).apply {
            put("items", remainItems)
            put("grandtotal", 143.75) // 86.25 + 57.5
        }
        holdOrderDao.insertHoldOrder(order.copy(json = updatedJson))

        // Verify
        val updated = holdOrderDao.getAllHoldOrders()
        assertEquals(1, updated.size) // Still 1 order
        assertEquals(2, updated[0].json!!.getJSONArray("items").length())
        assertEquals(143.75, updated[0].json!!.getDouble("grandtotal"), 0.01)
    }

    // ========== HELPERS ==========

    private fun createHoldOrder(
        description: String,
        terminalId: Int = 1,
        json: JSONObject? = JSONObject()
    ) = HoldOrder(
        dateHold = Timestamp(System.currentTimeMillis()),
        json = json,
        description = description,
        tillId = 100,
        terminalId = terminalId,
        storeId = 1
    )

    private fun itemJson(
        productId: Int,
        name: String,
        qty: Double,
        price: Double,
        lineNetAmt: Double
    ) = JSONObject().apply {
        put("product_id", productId)
        put("product_name", name)
        put("qty", qty)
        put("price", price)
        put("lineNetAmt", lineNetAmt)
        put("lineAmt", price * qty)
        put("taxAmt", lineNetAmt - price * qty)
        put("discountAmt", 0.0)
        put("modifiers", "")
        put("note", "")
        put("lineNo", productId.toString())
    }
}
