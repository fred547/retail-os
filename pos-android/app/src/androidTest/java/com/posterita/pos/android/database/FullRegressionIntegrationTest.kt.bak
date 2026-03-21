package com.posterita.pos.android.database

import android.content.Context
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.dao.HoldOrderDao
import com.posterita.pos.android.data.local.dao.ProductDao
import com.posterita.pos.android.data.local.dao.RestaurantTableDao
import com.posterita.pos.android.data.local.entity.HoldOrder
import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.local.entity.RestaurantTable
import com.posterita.pos.android.data.local.entity.Tax
import com.posterita.pos.android.domain.model.CartItem
import com.posterita.pos.android.domain.model.ShoppingCart
import com.posterita.pos.android.ui.adapter.KitchenOrderAdapter
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
 * Full end-to-end integration regression test.
 *
 * Uses a real in-memory Room database seeded with deterministic data
 * (same products, taxes, tables every run). Exercises the complete
 * restaurant POS workflow:
 *
 *   1. Add items to cart
 *   2. Hold order on a table (kitchen order)
 *   3. Change order status (NEW -> IN_PROGRESS -> READY)
 *   4. Split bill and pay partial
 *   5. Complete remaining items
 *   6. Recall a kitchen order
 *   7. Delete a kitchen order
 *   8. Add items to an occupied table
 *
 * This test class validates that all Sprint 1-4 features work together
 * correctly against a real Room database.
 */
@RunWith(AndroidJUnit4::class)
class FullRegressionIntegrationTest {

    private lateinit var db: AppDatabase
    private lateinit var holdOrderDao: HoldOrderDao
    private lateinit var productDao: ProductDao
    private lateinit var tableDao: RestaurantTableDao

    // Deterministic test data
    private val TAX_15 = Tax(tax_id = 1, rate = 15.0, name = "VAT 15%", taxcode = "VAT15")
    private val TAX_10 = Tax(tax_id = 2, rate = 10.0, name = "VAT 10%", taxcode = "VAT10")
    private val TAX_ZERO = Tax(tax_id = 3, rate = 0.0, name = "Zero", taxcode = "ZR")
    private val TAX_CACHE = mapOf(1 to TAX_15, 2 to TAX_10, 3 to TAX_ZERO)

    private val BURGER = Product(
        product_id = 101, name = "Classic Burger", sellingprice = 200.0,
        costprice = 80.0, tax_id = 1, istaxincluded = "N", isactive = "Y",
        iskitchenitem = "Y", productcategory_id = 10
    )
    private val FRIES = Product(
        product_id = 102, name = "French Fries", sellingprice = 75.0,
        costprice = 20.0, tax_id = 1, istaxincluded = "N", isactive = "Y",
        iskitchenitem = "Y", productcategory_id = 10
    )
    private val COLA = Product(
        product_id = 103, name = "Cola", sellingprice = 50.0,
        costprice = 15.0, tax_id = 1, istaxincluded = "N", isactive = "Y",
        iskitchenitem = "N", productcategory_id = 11
    )
    private val STEAK = Product(
        product_id = 104, name = "Grilled Steak", sellingprice = 500.0,
        costprice = 200.0, tax_id = 1, istaxincluded = "N", isactive = "Y",
        iskitchenitem = "Y", productcategory_id = 10
    )
    private val WATER = Product(
        product_id = 105, name = "Mineral Water", sellingprice = 30.0,
        costprice = 5.0, tax_id = 3, istaxincluded = "N", isactive = "Y",
        iskitchenitem = "N", productcategory_id = 11
    )

    private val TERMINAL_ID = 1
    private val STORE_ID = 1
    private val TILL_ID = 100

    @Before
    fun setUp() = runBlocking {
        val context = ApplicationProvider.getApplicationContext<Context>()
        db = Room.inMemoryDatabaseBuilder(context, AppDatabase::class.java)
            .allowMainThreadQueries()
            .build()
        holdOrderDao = db.holdOrderDao()
        productDao = db.productDao()
        tableDao = db.restaurantTableDao()

        // Seed products
        productDao.insertProducts(listOf(BURGER, FRIES, COLA, STEAK, WATER))

        // Seed tables
        tableDao.insertTable(RestaurantTable(table_name = "Table 1", store_id = STORE_ID, terminal_id = TERMINAL_ID, seats = 4))
        tableDao.insertTable(RestaurantTable(table_name = "Table 2", store_id = STORE_ID, terminal_id = TERMINAL_ID, seats = 6))
        tableDao.insertTable(RestaurantTable(table_name = "Table 3", store_id = STORE_ID, terminal_id = TERMINAL_ID, seats = 2))
    }

    @After
    fun tearDown() {
        db.close()
    }

    // ================================================================
    // SCENARIO 1: Full dine-in kitchen order lifecycle
    // ================================================================

    @Test
    fun scenario_fullDineInKitchenOrder() = runBlocking {
        // --- Step 1: Build cart ---
        val cart = ShoppingCart()
        cart.addProduct(BURGER, TAX_CACHE)
        cart.addProduct(FRIES, TAX_CACHE)
        cart.addProduct(COLA, TAX_CACHE)
        cart.note = "Birthday table"
        cart.orderType = "dine_in"

        assertEquals(3, cart.getItemCount())
        assertEquals(373.75, cart.grandTotalAmount, 0.01)

        // --- Step 2: Send to kitchen (hold on table) ---
        val tables = tableDao.getTablesByStore(STORE_ID)
        val table = tables[0] // Table 1
        assertFalse(table.is_occupied)

        val json = cart.toJson().apply {
            put("isKitchenOrder", true)
            put("status", "new")
            put("tableId", table.table_id)
            put("tableName", table.table_name)
        }
        val holdId = holdOrderDao.insertHoldOrder(HoldOrder(
            dateHold = Timestamp(System.currentTimeMillis()),
            json = json,
            description = table.table_name,
            tillId = TILL_ID, terminalId = TERMINAL_ID, storeId = STORE_ID
        )).toInt()
        tableDao.updateTableStatus(table.table_id, true, holdId.toString())

        // Verify: table is occupied
        val occupiedTable = tableDao.getTableById(table.table_id)!!
        assertTrue(occupiedTable.is_occupied)

        // Verify: kitchen order exists
        val kitchenOrders = holdOrderDao.getHoldOrdersByTerminal(TERMINAL_ID)
            .filter { it.json?.optBoolean("isKitchenOrder", false) == true }
        assertEquals(1, kitchenOrders.size)

        // --- Step 3: Change status: NEW -> IN_PROGRESS ---
        val order = kitchenOrders[0]
        order.json!!.put("status", "in_progress")
        holdOrderDao.insertHoldOrder(order)

        val updated = holdOrderDao.getAllHoldOrders()[0]
        assertEquals("in_progress", updated.json!!.getString("status"))

        // --- Step 4: Change status: IN_PROGRESS -> READY ---
        updated.json!!.put("status", "ready")
        holdOrderDao.insertHoldOrder(updated)

        val ready = holdOrderDao.getAllHoldOrders()[0]
        assertEquals("ready", ready.json!!.getString("status"))

        // --- Step 5: Complete (restore to cart and pay) ---
        val completeCart = ShoppingCart()
        completeCart.restoreFromJson(ready.json!!, productDao, TAX_CACHE)

        assertEquals(3, completeCart.getItemCount())
        assertEquals(373.75, completeCart.grandTotalAmount, 0.01)
        assertEquals("Birthday table", completeCart.note)

        // Free table and delete hold
        tableDao.updateTableStatus(table.table_id, false, null)
        holdOrderDao.deleteHoldOrderById(ready.holdOrderId)

        val finalTable = tableDao.getTableById(table.table_id)!!
        assertFalse(finalTable.is_occupied)
        assertTrue(holdOrderDao.getAllHoldOrders().isEmpty())
    }

    // ================================================================
    // SCENARIO 2: Bill splitting
    // ================================================================

    @Test
    fun scenario_billSplitting() = runBlocking {
        // --- Setup: 3-item kitchen order on Table 2 ---
        val cart = ShoppingCart()
        cart.addProduct(STEAK, TAX_CACHE)   // 575
        cart.addProduct(BURGER, TAX_CACHE)  // 230
        cart.addProduct(COLA, TAX_CACHE)    // 57.5
        val originalTotal = cart.grandTotalAmount // 862.5

        val tables = tableDao.getTablesByStore(STORE_ID)
        val table = tables[1] // Table 2

        val json = cart.toJson().apply {
            put("isKitchenOrder", true)
            put("status", "in_progress")
            put("tableId", table.table_id)
            put("tableName", table.table_name)
        }
        val holdId = holdOrderDao.insertHoldOrder(HoldOrder(
            dateHold = Timestamp(System.currentTimeMillis()),
            json = json, description = table.table_name,
            tillId = TILL_ID, terminalId = TERMINAL_ID, storeId = STORE_ID
        )).toInt()
        tableDao.updateTableStatus(table.table_id, true, holdId.toString())

        // --- Split: Pay Steak only, keep Burger + Cola ---
        val holdOrder = holdOrderDao.getAllHoldOrders()[0]
        val items = holdOrder.json!!.getJSONArray("items")
        assertEquals(3, items.length())

        // Select index 0 (Steak) to pay
        val payItems = JSONArray().apply { put(items.getJSONObject(0)) }
        val remainItems = JSONArray().apply {
            put(items.getJSONObject(1)) // Burger
            put(items.getJSONObject(2)) // Cola
        }

        // Load pay items into cart
        val payCart = ShoppingCart()
        for (i in 0 until payItems.length()) {
            val itemJson = payItems.getJSONObject(i)
            val product = productDao.getProductByIdSync(itemJson.getInt("product_id"))!!
            val tax = TAX_CACHE[product.tax_id]
            val cartItem = CartItem(
                product = product,
                lineNo = itemJson.getString("lineNo"),
                qty = itemJson.getDouble("qty"),
                priceEntered = itemJson.getDouble("price"),
                tax = tax
            )
            cartItem.updateTotals()
            payCart.addOrUpdateLine(cartItem)
        }
        assertEquals(575.0, payCart.grandTotalAmount, 0.01) // Steak

        // Update hold order with remaining items
        var remainTotal = 0.0
        for (i in 0 until remainItems.length()) {
            remainTotal += remainItems.getJSONObject(i).getDouble("lineNetAmt")
        }
        val updatedJson = JSONObject(holdOrder.json.toString()).apply {
            put("items", remainItems)
            put("grandtotal", remainTotal)
        }
        holdOrderDao.insertHoldOrder(holdOrder.copy(json = updatedJson))

        // Verify split result
        val afterSplit = holdOrderDao.getAllHoldOrders()[0]
        assertEquals(2, afterSplit.json!!.getJSONArray("items").length())
        assertEquals(287.5, afterSplit.json!!.getDouble("grandtotal"), 0.01) // 230 + 57.5

        // --- Complete remaining items ---
        val remainCart = ShoppingCart()
        remainCart.restoreFromJson(afterSplit.json!!, productDao, TAX_CACHE)
        assertEquals(2, remainCart.getItemCount())
        assertEquals(287.5, remainCart.grandTotalAmount, 0.01)

        // Free table and delete
        tableDao.updateTableStatus(table.table_id, false, null)
        holdOrderDao.deleteHoldOrderById(afterSplit.holdOrderId)

        assertFalse(tableDao.getTableById(table.table_id)!!.is_occupied)
    }

    // ================================================================
    // SCENARIO 3: Add items to occupied table
    // ================================================================

    @Test
    fun scenario_addItemsToOccupiedTable() = runBlocking {
        // --- Setup: Burger on Table 1 ---
        val cart1 = ShoppingCart()
        cart1.addProduct(BURGER, TAX_CACHE) // 230

        val tables = tableDao.getTablesByStore(STORE_ID)
        val table = tables[0]

        val json = cart1.toJson().apply {
            put("isKitchenOrder", true)
            put("status", "new")
            put("tableId", table.table_id)
            put("tableName", table.table_name)
        }
        val holdId = holdOrderDao.insertHoldOrder(HoldOrder(
            dateHold = Timestamp(System.currentTimeMillis()),
            json = json, description = table.table_name,
            tillId = TILL_ID, terminalId = TERMINAL_ID, storeId = STORE_ID
        )).toInt()
        tableDao.updateTableStatus(table.table_id, true, holdId.toString())

        // Verify table is occupied
        assertTrue(tableDao.getTableById(table.table_id)!!.is_occupied)

        // --- Add Fries + Cola to existing order ---
        val existingOrder = holdOrderDao.getAllHoldOrders()[0]
        val existingJson = existingOrder.json!!
        val existingItems = existingJson.getJSONArray("items")
        assertEquals(1, existingItems.length()) // Just Burger

        // New cart with additional items
        val cart2 = ShoppingCart()
        cart2.addProduct(FRIES, TAX_CACHE)  // 86.25
        cart2.addProduct(COLA, TAX_CACHE)   // 57.5
        val newItems = cart2.toJson().getJSONArray("items")

        // Merge
        for (i in 0 until newItems.length()) {
            existingItems.put(newItems.getJSONObject(i))
        }
        existingJson.put("items", existingItems)

        // Recalculate total
        var newTotal = 0.0
        for (i in 0 until existingItems.length()) {
            newTotal += existingItems.getJSONObject(i).getDouble("lineNetAmt")
        }
        existingJson.put("grandtotal", newTotal)

        holdOrderDao.insertHoldOrder(existingOrder.copy(json = existingJson))

        // Verify merged order
        val merged = holdOrderDao.getAllHoldOrders()[0]
        assertEquals(3, merged.json!!.getJSONArray("items").length())
        assertEquals(373.75, merged.json!!.getDouble("grandtotal"), 0.01)

        // Table info preserved
        assertEquals(table.table_id, merged.json!!.getInt("tableId"))
        assertTrue(merged.json!!.getBoolean("isKitchenOrder"))
    }

    // ================================================================
    // SCENARIO 4: Hold order (non-kitchen) recall
    // ================================================================

    @Test
    fun scenario_regularHoldOrderRecall() = runBlocking {
        // --- Hold a regular (non-kitchen) order ---
        val cart = ShoppingCart()
        cart.addProduct(STEAK, TAX_CACHE)
        cart.addProduct(WATER, TAX_CACHE)
        cart.note = "Customer will return in 30 minutes"
        cart.tipsAmount = 50.0

        val json = cart.toJson() // No isKitchenOrder flag
        holdOrderDao.insertHoldOrder(HoldOrder(
            dateHold = Timestamp(System.currentTimeMillis()),
            json = json, description = "Walk-in customer",
            tillId = TILL_ID, terminalId = TERMINAL_ID, storeId = STORE_ID
        ))

        // Verify it's NOT a kitchen order
        val allOrders = holdOrderDao.getHoldOrdersByTerminal(TERMINAL_ID)
        val regularOrders = allOrders.filter { hold ->
            val j = hold.json ?: return@filter true
            !j.optBoolean("isKitchenOrder", false)
        }
        assertEquals(1, regularOrders.size)

        // --- Recall ---
        val recalled = ShoppingCart()
        recalled.restoreFromJson(regularOrders[0].json!!, productDao, TAX_CACHE)

        assertEquals(2, recalled.getItemCount())
        assertEquals("Customer will return in 30 minutes", recalled.note)
        assertEquals(50.0, recalled.tipsAmount, 0.01)

        // Delete after recall
        holdOrderDao.deleteHoldOrderById(regularOrders[0].holdOrderId)
        assertTrue(holdOrderDao.getAllHoldOrders().isEmpty())
    }

    // ================================================================
    // SCENARIO 5: Multiple kitchen orders + regular holds mixed
    // ================================================================

    @Test
    fun scenario_mixedOrderTypes() = runBlocking {
        val tables = tableDao.getTablesByStore(STORE_ID)

        // Kitchen order on Table 1
        val cart1 = ShoppingCart().apply { addProduct(BURGER, TAX_CACHE) }
        holdOrderDao.insertHoldOrder(HoldOrder(
            dateHold = Timestamp(System.currentTimeMillis()),
            json = cart1.toJson().apply {
                put("isKitchenOrder", true)
                put("tableId", tables[0].table_id)
            },
            description = "Table 1", terminalId = TERMINAL_ID, storeId = STORE_ID
        ))
        tableDao.updateTableStatus(tables[0].table_id, true, "1")

        // Kitchen order on Table 3
        val cart2 = ShoppingCart().apply { addProduct(STEAK, TAX_CACHE) }
        holdOrderDao.insertHoldOrder(HoldOrder(
            dateHold = Timestamp(System.currentTimeMillis()),
            json = cart2.toJson().apply {
                put("isKitchenOrder", true)
                put("tableId", tables[2].table_id)
            },
            description = "Table 3", terminalId = TERMINAL_ID, storeId = STORE_ID
        ))
        tableDao.updateTableStatus(tables[2].table_id, true, "2")

        // Regular hold order (no table)
        val cart3 = ShoppingCart().apply { addProduct(COLA, TAX_CACHE) }
        holdOrderDao.insertHoldOrder(HoldOrder(
            dateHold = Timestamp(System.currentTimeMillis()),
            json = cart3.toJson(), // No isKitchenOrder
            description = "Walk-in", terminalId = TERMINAL_ID, storeId = STORE_ID
        ))

        // Verify counts
        val allOrders = holdOrderDao.getHoldOrdersByTerminal(TERMINAL_ID)
        assertEquals(3, allOrders.size)

        val kitchenOrders = allOrders.filter {
            it.json?.optBoolean("isKitchenOrder", false) == true
        }
        val regularOrders = allOrders.filter {
            val j = it.json ?: return@filter true
            !j.optBoolean("isKitchenOrder", false)
        }

        assertEquals(2, kitchenOrders.size)
        assertEquals(1, regularOrders.size)

        // Verify table state
        assertEquals(2, tableDao.getOccupiedTables(STORE_ID).size)
        assertEquals(1, tableDao.getFreeTables(STORE_ID).size)
    }

    // ================================================================
    // SCENARIO 6: Delete kitchen order frees table
    // ================================================================

    @Test
    fun scenario_deleteKitchenOrderFreesTable() = runBlocking {
        val tables = tableDao.getTablesByStore(STORE_ID)
        val table = tables[0]

        // Create kitchen order
        val cart = ShoppingCart().apply { addProduct(BURGER, TAX_CACHE) }
        val json = cart.toJson().apply {
            put("isKitchenOrder", true)
            put("tableId", table.table_id)
        }
        val holdId = holdOrderDao.insertHoldOrder(HoldOrder(
            dateHold = Timestamp(System.currentTimeMillis()),
            json = json, description = table.table_name,
            tillId = TILL_ID, terminalId = TERMINAL_ID, storeId = STORE_ID
        )).toInt()
        tableDao.updateTableStatus(table.table_id, true, holdId.toString())

        assertTrue(tableDao.getTableById(table.table_id)!!.is_occupied)

        // Delete order
        val order = holdOrderDao.getAllHoldOrders()[0]
        val tableId = order.json!!.optInt("tableId", 0)
        if (tableId > 0) {
            tableDao.updateTableStatus(tableId, false, null)
        }
        holdOrderDao.deleteHoldOrderById(order.holdOrderId)

        // Verify cleanup
        assertFalse(tableDao.getTableById(table.table_id)!!.is_occupied)
        assertTrue(holdOrderDao.getAllHoldOrders().isEmpty())
    }

    // ================================================================
    // SCENARIO 7: Order with modifiers, notes, and discount
    // ================================================================

    @Test
    fun scenario_fullFeaturedOrderPreservation() = runBlocking {
        val cart = ShoppingCart()

        // Burger with modifiers and note
        val burgerItem = CartItem(
            product = BURGER, lineNo = "1", qty = 2.0,
            priceEntered = 200.0, tax = TAX_15
        ).apply {
            modifiers = "Extra Cheese, Bacon"
            note = "One well done, one medium"
            updateTotals()
        }
        cart.addOrUpdateLine(burgerItem)

        // Steak with modifier
        val steakItem = CartItem(
            product = STEAK, lineNo = "2", qty = 1.0,
            priceEntered = 500.0, tax = TAX_15
        ).apply {
            modifiers = "Pepper Sauce"
            note = "Medium rare"
            updateTotals()
        }
        cart.addOrUpdateLine(steakItem)

        cart.note = "VIP table - birthday celebration"
        cart.orderType = "dine_in"
        cart.discountOnTotalPercentage = 10.0
        cart.tipsAmount = 100.0
        cart.recalculateTotals()

        // Save as kitchen order
        val json = cart.toJson().apply {
            put("isKitchenOrder", true)
            put("status", "new")
            put("tableId", 1)
            put("tableName", "Table 1")
        }
        holdOrderDao.insertHoldOrder(HoldOrder(
            dateHold = Timestamp(System.currentTimeMillis()),
            json = json, description = "Table 1",
            tillId = TILL_ID, terminalId = TERMINAL_ID, storeId = STORE_ID
        ))

        // Recall and verify everything is preserved
        val order = holdOrderDao.getAllHoldOrders()[0]
        val restoredCart = ShoppingCart()
        restoredCart.restoreFromJson(order.json!!, productDao, TAX_CACHE)

        // Items
        assertEquals(2, restoredCart.getItemCount())
        val items = restoredCart.cartItems.values.toList()
        val burgerRestored = items.find { it.product.product_id == 101 }!!
        val steakRestored = items.find { it.product.product_id == 104 }!!

        assertEquals(2.0, burgerRestored.qty, 0.01)
        assertEquals("Extra Cheese, Bacon", burgerRestored.modifiers)
        assertEquals("One well done, one medium", burgerRestored.note)
        assertEquals("Pepper Sauce", steakRestored.modifiers)
        assertEquals("Medium rare", steakRestored.note)

        // Cart-level
        assertEquals("VIP table - birthday celebration", restoredCart.note)
        assertEquals("dine_in", restoredCart.orderType)
        assertEquals(10.0, restoredCart.discountOnTotalPercentage, 0.01)
        assertEquals(100.0, restoredCart.tipsAmount, 0.01)

        // Totals should match (with discount applied)
        assertEquals(cart.grandTotalAmount, restoredCart.grandTotalAmount, 0.01)
    }
}
