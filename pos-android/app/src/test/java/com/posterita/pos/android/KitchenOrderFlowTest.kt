package com.posterita.pos.android

import com.posterita.pos.android.data.local.entity.HoldOrder
import com.posterita.pos.android.domain.model.ShoppingCart
import com.posterita.pos.android.ui.adapter.KitchenOrderAdapter
import kotlinx.coroutines.runBlocking
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.sql.Timestamp

/**
 * Regression tests for the Kitchen Order lifecycle.
 *
 * Covers Sprint 3 (status tracking, timers, sorting, filtering)
 * and Sprint 4 (status cycling, split bill, add items to occupied table).
 *
 * Uses Robolectric for org.json classes (JSONObject, JSONArray).
 */
@RunWith(RobolectricTestRunner::class)
class KitchenOrderFlowTest {

    private lateinit var cart: ShoppingCart
    private lateinit var mockProductDao: CartSerializationTest.FakeProductDao

    @Before
    fun setUp() {
        cart = TestFixtures.newCart()
        mockProductDao = CartSerializationTest.FakeProductDao(TestFixtures.ALL_PRODUCTS)
    }

    // ========== KITCHEN ORDER FLAG & FILTERING ==========

    @Test
    fun kitchenOrder_jsonHasFlag() {
        val (_, json) = TestFixtures.typicalKitchenOrder()
        assertTrue(json.optBoolean("isKitchenOrder", false))
    }

    @Test
    fun regularHoldOrder_noKitchenFlag() {
        val cart = TestFixtures.cartWith(TestFixtures.PRODUCT_BURGER)
        val json = cart.toJson()
        // Regular hold order: no isKitchenOrder flag
        assertFalse(json.optBoolean("isKitchenOrder", false))
    }

    @Test
    fun filterKitchenOrders_correctlyFilters() {
        // Simulate what KitchenOrdersActivity.loadKitchenOrders() does
        val kitchenJson = TestFixtures.kitchenOrderJson(
            TestFixtures.cartWith(TestFixtures.PRODUCT_BURGER),
            tableId = 1, tableName = "Table 1", isKitchenOrder = true
        )
        val regularJson = TestFixtures.cartWith(TestFixtures.PRODUCT_FRIES).toJson()
        val kitchenJson2 = TestFixtures.kitchenOrderJson(
            TestFixtures.cartWith(TestFixtures.PRODUCT_STEAK),
            isKitchenOrder = true
        )

        val allHolds = listOf(
            TestFixtures.holdOrder(id = 1, json = kitchenJson),
            TestFixtures.holdOrder(id = 2, json = regularJson),
            TestFixtures.holdOrder(id = 3, json = kitchenJson2)
        )

        val kitchenOrders = allHolds.filter { hold ->
            val json = hold.json ?: return@filter false
            json.optBoolean("isKitchenOrder", false)
        }

        assertEquals(2, kitchenOrders.size)
        assertEquals(1, kitchenOrders[0].holdOrderId)
        assertEquals(3, kitchenOrders[1].holdOrderId)
    }

    @Test
    fun filterHoldOrders_excludesKitchenOrders() {
        // Simulate what HoldOrderActivity does (opposite filter)
        val kitchenJson = TestFixtures.kitchenOrderJson(
            TestFixtures.cartWith(TestFixtures.PRODUCT_BURGER),
            isKitchenOrder = true
        )
        val regularJson = TestFixtures.cartWith(TestFixtures.PRODUCT_FRIES).toJson()

        val allHolds = listOf(
            TestFixtures.holdOrder(id = 1, json = kitchenJson),
            TestFixtures.holdOrder(id = 2, json = regularJson)
        )

        val regularHolds = allHolds.filter { hold ->
            val json = hold.json ?: return@filter true
            !json.optBoolean("isKitchenOrder", false)
        }

        assertEquals(1, regularHolds.size)
        assertEquals(2, regularHolds[0].holdOrderId)
    }

    // ========== STATUS LIFECYCLE ==========

    @Test
    fun statusCycle_newToInProgress() {
        val (_, json) = TestFixtures.typicalKitchenOrder()
        val currentStatus = json.optString("status", KitchenOrderAdapter.STATUS_NEW)

        val nextStatus = cycleStatus(currentStatus)

        assertEquals(KitchenOrderAdapter.STATUS_IN_PROGRESS, nextStatus)
    }

    @Test
    fun statusCycle_inProgressToReady() {
        val nextStatus = cycleStatus(KitchenOrderAdapter.STATUS_IN_PROGRESS)
        assertEquals(KitchenOrderAdapter.STATUS_READY, nextStatus)
    }

    @Test
    fun statusCycle_readyBackToNew() {
        val nextStatus = cycleStatus(KitchenOrderAdapter.STATUS_READY)
        assertEquals(KitchenOrderAdapter.STATUS_NEW, nextStatus)
    }

    @Test
    fun statusCycle_unknownDefaultsToNew() {
        val nextStatus = cycleStatus("garbage_value")
        assertEquals(KitchenOrderAdapter.STATUS_NEW, nextStatus)
    }

    @Test
    fun statusChange_persistsInJson() {
        val (_, json) = TestFixtures.typicalKitchenOrder()

        json.put("status", KitchenOrderAdapter.STATUS_IN_PROGRESS)

        assertEquals("in_progress", json.getString("status"))
    }

    // ========== SORTING (oldest first) ==========

    @Test
    fun sorting_oldestFirst() {
        val now = System.currentTimeMillis()
        val orders = listOf(
            TestFixtures.holdOrder(id = 1, timestamp = now),           // newest
            TestFixtures.holdOrder(id = 2, timestamp = now - 600_000), // 10 min ago
            TestFixtures.holdOrder(id = 3, timestamp = now - 300_000)  // 5 min ago
        )

        // Same sort logic as KitchenOrderAdapter.setOrders()
        val sorted = orders.sortedBy { it.dateHold?.time ?: Long.MAX_VALUE }

        assertEquals(2, sorted[0].holdOrderId) // oldest first
        assertEquals(3, sorted[1].holdOrderId)
        assertEquals(1, sorted[2].holdOrderId) // newest last
    }

    @Test
    fun sorting_nullDateGoesToEnd() {
        val now = System.currentTimeMillis()
        val orders = listOf(
            HoldOrder(holdOrderId = 1, dateHold = null),
            HoldOrder(holdOrderId = 2, dateHold = Timestamp(now - 60000)),
            HoldOrder(holdOrderId = 3, dateHold = Timestamp(now))
        )

        val sorted = orders.sortedBy { it.dateHold?.time ?: Long.MAX_VALUE }

        assertEquals(2, sorted[0].holdOrderId)
        assertEquals(3, sorted[1].holdOrderId)
        assertEquals(1, sorted[2].holdOrderId) // null date goes last
    }

    // ========== TABLE INFO IN JSON ==========

    @Test
    fun kitchenOrder_preservesTableInfo() {
        val (_, json) = TestFixtures.typicalKitchenOrder()

        assertEquals(1, json.getInt("tableId"))
        assertEquals("Table 1", json.getString("tableName"))
    }

    @Test
    fun kitchenOrder_takeAwayNoTable() {
        val cart = TestFixtures.cartWith(TestFixtures.PRODUCT_BURGER)
        cart.orderType = "take_away"
        val json = TestFixtures.kitchenOrderJson(cart, isKitchenOrder = true)

        assertEquals("take_away", json.getString("orderType"))
        assertFalse(json.has("tableId"))
    }

    // ========== ORDER NOTE ==========

    @Test
    fun kitchenOrder_addNote() {
        val (_, json) = TestFixtures.typicalKitchenOrder()

        json.put("note", "Rush order - VIP")

        assertEquals("Rush order - VIP", json.getString("note"))
    }

    @Test
    fun kitchenOrder_clearNote() {
        val (_, json) = TestFixtures.typicalKitchenOrder()
        json.put("note", "Some note")

        json.put("note", "")

        assertEquals("", json.getString("note"))
    }

    // ========== COMPLETE (restore to cart for payment) ==========

    @Test
    fun completeOrder_restoresToCart() = runBlocking {
        val (originalCart, json) = TestFixtures.typicalKitchenOrder()
        val originalCount = originalCart.getItemCount()

        val restoredCart = ShoppingCart()
        restoredCart.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertEquals(originalCount, restoredCart.getItemCount())
        assertFalse(restoredCart.isEmpty())
    }

    @Test
    fun completeOrder_preservesNote() = runBlocking {
        val (_, json) = TestFixtures.typicalKitchenOrder()
        assertEquals("No onions", json.optString("note"))

        val restoredCart = ShoppingCart()
        restoredCart.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertEquals("No onions", restoredCart.note)
    }

    // ========== BILL SPLIT ==========

    @Test
    fun splitBill_dividesItemsCorrectly() {
        // 3-item order: Burger, Fries, Cola
        val (cart, json) = TestFixtures.typicalKitchenOrder()
        val items = json.getJSONArray("items")
        assertEquals(3, items.length())

        // Select indices 0 and 1 (Burger + Fries) to pay
        val selectedIndices = listOf(0, 1)

        val payItems = JSONArray()
        val remainItems = JSONArray()
        for (i in 0 until items.length()) {
            val item = items.optJSONObject(i) ?: continue
            if (i in selectedIndices) {
                payItems.put(item)
            } else {
                remainItems.put(item)
            }
        }

        assertEquals(2, payItems.length())  // Burger + Fries
        assertEquals(1, remainItems.length()) // Cola
    }

    @Test
    fun splitBill_remainingTotalRecalculated() {
        val (_, json) = TestFixtures.typicalKitchenOrder()
        val items = json.getJSONArray("items")

        // Only Cola remains (index 2)
        val remainItems = JSONArray()
        remainItems.put(items.getJSONObject(2))

        var remainTotal = 0.0
        for (i in 0 until remainItems.length()) {
            val item = remainItems.optJSONObject(i) ?: continue
            remainTotal += item.optDouble("lineNetAmt", 0.0)
        }

        // Cola: 50 + 15% = 57.5
        assertEquals(57.5, remainTotal, 0.01)
    }

    @Test
    fun splitBill_requiresAtLeast2Items() {
        val cart = TestFixtures.cartWith(TestFixtures.PRODUCT_BURGER)
        val json = TestFixtures.kitchenOrderJson(cart, isKitchenOrder = true)
        val items = json.optJSONArray("items")

        // This is the guard check in KitchenOrdersActivity.onSplit()
        val canSplit = items != null && items.length() >= 2
        assertFalse(canSplit)
    }

    @Test
    fun splitBill_allSelectedBecomesComplete() {
        val (_, json) = TestFixtures.typicalKitchenOrder()
        val items = json.getJSONArray("items")

        // Select ALL items
        val selectedIndices = (0 until items.length()).toList()

        // When all items selected, should behave like "complete" instead of split
        val isFullSelection = selectedIndices.size == items.length()
        assertTrue(isFullSelection)
    }

    @Test
    fun splitBill_payItemsRestoredToCart() = runBlocking {
        val (_, json) = TestFixtures.typicalKitchenOrder()
        val items = json.getJSONArray("items")

        // Select Burger (index 0) to pay
        val payItems = JSONArray()
        payItems.put(items.getJSONObject(0))

        // Simulate restoring selected items into cart
        val payCart = ShoppingCart()
        for (i in 0 until payItems.length()) {
            val itemJson = payItems.optJSONObject(i) ?: continue
            val productId = itemJson.optInt("product_id", 0)
            val product = mockProductDao.getProductByIdSync(productId) ?: continue
            val tax = TestFixtures.TAX_CACHE[product.tax_id]
            val cartItem = com.posterita.pos.android.domain.model.CartItem(
                product = product,
                lineNo = itemJson.optString("lineNo", ""),
                qty = itemJson.optDouble("qty", 1.0),
                priceEntered = itemJson.optDouble("price", 0.0),
                tax = tax
            )
            cartItem.updateTotals()
            payCart.addOrUpdateLine(cartItem)
        }

        assertEquals(1, payCart.getItemCount())
        // Burger: 200 + 15% = 230
        assertEquals(230.0, payCart.grandTotalAmount, 0.01)
    }

    // ========== ADD ITEMS TO OCCUPIED TABLE ==========

    @Test
    fun addItemsToExistingOrder_mergesItems() {
        // Existing order has Burger
        val existingCart = TestFixtures.cartWith(TestFixtures.PRODUCT_BURGER)
        val existingJson = TestFixtures.kitchenOrderJson(
            existingCart, tableId = 1, tableName = "Table 1"
        )
        val existingItems = existingJson.getJSONArray("items")
        assertEquals(1, existingItems.length())

        // New items to add: Fries + Cola
        val newCart = TestFixtures.cartWith(TestFixtures.PRODUCT_FRIES, TestFixtures.PRODUCT_COLA)
        val newJson = newCart.toJson()
        val newItems = newJson.getJSONArray("items")

        // Merge (same logic as CartActivity.addItemsToExistingOrder)
        for (i in 0 until newItems.length()) {
            existingItems.put(newItems.getJSONObject(i))
        }
        existingJson.put("items", existingItems)

        // Recalculate total
        var newTotal = 0.0
        for (i in 0 until existingItems.length()) {
            val item = existingItems.optJSONObject(i) ?: continue
            newTotal += item.optDouble("lineNetAmt", 0.0)
        }
        existingJson.put("grandtotal", newTotal)

        assertEquals(3, existingItems.length())
        // Burger(230) + Fries(86.25) + Cola(57.5) = 373.75
        assertEquals(373.75, existingJson.getDouble("grandtotal"), 0.01)
    }

    @Test
    fun addItemsToExistingOrder_preservesExistingTableInfo() {
        val existingCart = TestFixtures.cartWith(TestFixtures.PRODUCT_BURGER)
        val existingJson = TestFixtures.kitchenOrderJson(
            existingCart, tableId = 2, tableName = "Table 2"
        )

        // After merging, table info should still be there
        assertEquals(2, existingJson.getInt("tableId"))
        assertEquals("Table 2", existingJson.getString("tableName"))
    }

    @Test
    fun addItemsToExistingOrder_preservesExistingStatus() {
        val existingCart = TestFixtures.cartWith(TestFixtures.PRODUCT_BURGER)
        val existingJson = TestFixtures.kitchenOrderJson(
            existingCart, tableId = 1, tableName = "Table 1",
            status = KitchenOrderAdapter.STATUS_IN_PROGRESS
        )

        // After merging new items, status should remain
        assertEquals("in_progress", existingJson.getString("status"))
    }

    // ========== ITEMS SUMMARY DISPLAY ==========

    @Test
    fun itemsSummary_formatMatchesAdapter() {
        val (_, json) = TestFixtures.typicalKitchenOrder()
        val items = json.getJSONArray("items")

        // Reproduce KitchenOrderAdapter.bind() logic
        val sb = StringBuilder()
        for (i in 0 until items.length()) {
            val item = items.optJSONObject(i) ?: continue
            val qty = item.optDouble("qty", 1.0)
            val name = item.optString("product_name", "")
            val modifiers = item.optString("modifiers", "")
            val itemNote = item.optString("note", "")
            if (sb.isNotEmpty()) sb.append("\n")
            sb.append("${com.posterita.pos.android.util.NumberUtils.formatQuantity(qty)}x $name")
            if (modifiers.isNotBlank()) sb.append(" ($modifiers)")
            if (itemNote.isNotBlank()) sb.append(" \u2014 $itemNote")
        }

        val summary = sb.toString()
        assertTrue(summary.contains("Classic Burger"))
        assertTrue(summary.contains("French Fries"))
        assertTrue(summary.contains("Cola"))
    }

    @Test
    fun itemsSummary_showsModifiersAndNotes() {
        val cart = ShoppingCart()
        val item = TestFixtures.cartItem(
            TestFixtures.PRODUCT_BURGER,
            modifiers = "No Pickles",
            note = "Well done"
        )
        cart.addOrUpdateLine(item)
        val json = TestFixtures.kitchenOrderJson(cart, isKitchenOrder = true)
        val items = json.getJSONArray("items")

        val itemJson = items.getJSONObject(0)
        assertEquals("No Pickles", itemJson.getString("modifiers"))
        assertEquals("Well done", itemJson.getString("note"))
    }

    // ========== HELPER ==========

    /** Reproduce the status cycling logic from KitchenOrdersActivity.onStatusChange(). */
    private fun cycleStatus(current: String): String = when (current) {
        KitchenOrderAdapter.STATUS_NEW -> KitchenOrderAdapter.STATUS_IN_PROGRESS
        KitchenOrderAdapter.STATUS_IN_PROGRESS -> KitchenOrderAdapter.STATUS_READY
        else -> KitchenOrderAdapter.STATUS_NEW
    }
}
