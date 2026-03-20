package com.posterita.pos.android

import com.posterita.pos.android.data.local.entity.HoldOrder
import com.posterita.pos.android.domain.model.ShoppingCart
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.sql.Timestamp

/**
 * Regression tests for Hold Order save/restore flow.
 *
 * Covers Sprint 1 (saveHoldOrder data loss prevention) and Sprint 2
 * (centralized JSON serialization with all fields preserved).
 *
 * Verifies that when a cart is held and later recalled, ALL data is intact:
 * modifiers, notes, discounts, tips, orderType, quantities, prices.
 */
@RunWith(RobolectricTestRunner::class)
class HoldOrderFlowTest {

    private lateinit var cart: ShoppingCart
    private lateinit var mockProductDao: CartSerializationTest.FakeProductDao

    @Before
    fun setUp() {
        cart = TestFixtures.newCart()
        mockProductDao = CartSerializationTest.FakeProductDao(TestFixtures.ALL_PRODUCTS)
    }

    // ========== BASIC HOLD/RECALL ==========

    @Test
    fun holdAndRecall_preservesAllItems() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_COLA, TestFixtures.TAX_CACHE)

        val holdOrder = simulateHoldOrder(cart, "Test hold")

        val recalled = recallHoldOrder(holdOrder)

        assertEquals(3, recalled.getItemCount())
        assertEquals(cart.grandTotalAmount, recalled.grandTotalAmount, 0.01)
        assertEquals(cart.taxTotalAmount, recalled.taxTotalAmount, 0.01)
        assertEquals(cart.subTotalAmount, recalled.subTotalAmount, 0.01)
    }

    @Test
    fun holdAndRecall_preservesItemModifiers() = runBlocking {
        val item = TestFixtures.cartItem(
            TestFixtures.PRODUCT_BURGER,
            modifiers = "Extra Cheese, Bacon, No Onions"
        )
        cart.addOrUpdateLine(item)

        val holdOrder = simulateHoldOrder(cart, "Burger with mods")
        val recalled = recallHoldOrder(holdOrder)

        val recalledItem = recalled.cartItems.values.first()
        assertEquals("Extra Cheese, Bacon, No Onions", recalledItem.modifiers)
    }

    @Test
    fun holdAndRecall_preservesItemNotes() = runBlocking {
        val item = TestFixtures.cartItem(
            TestFixtures.PRODUCT_STEAK,
            note = "Medium rare, no salt"
        )
        cart.addOrUpdateLine(item)

        val holdOrder = simulateHoldOrder(cart, "Steak with note")
        val recalled = recallHoldOrder(holdOrder)

        val recalledItem = recalled.cartItems.values.first()
        assertEquals("Medium rare, no salt", recalledItem.note)
    }

    @Test
    fun holdAndRecall_preservesOrderNote() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.note = "Birthday party - table 5"

        val holdOrder = simulateHoldOrder(cart, "Party order")
        val recalled = recallHoldOrder(holdOrder)

        assertEquals("Birthday party - table 5", recalled.note)
    }

    @Test
    fun holdAndRecall_preservesTips() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_STEAK, TestFixtures.TAX_CACHE)
        cart.tipsAmount = 75.0
        cart.tipsPercentage = 15.0

        val holdOrder = simulateHoldOrder(cart, "Steak + tips")
        val recalled = recallHoldOrder(holdOrder)

        assertEquals(75.0, recalled.tipsAmount, 0.01)
        assertEquals(15.0, recalled.tipsPercentage, 0.01)
    }

    @Test
    fun holdAndRecall_preservesTakeAwayOrderType() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.orderType = "take_away"

        val holdOrder = simulateHoldOrder(cart, "Take away order")
        val recalled = recallHoldOrder(holdOrder)

        assertEquals("take_away", recalled.orderType)
    }

    @Test
    fun holdAndRecall_preservesDiscountOnTotalPercentage() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE)
        cart.discountOnTotalPercentage = 10.0
        cart.recalculateTotals()
        val discountedTotal = cart.grandTotalAmount

        val holdOrder = simulateHoldOrder(cart, "Discounted order")
        val recalled = recallHoldOrder(holdOrder)

        assertEquals(10.0, recalled.discountOnTotalPercentage, 0.01)
        assertEquals(discountedTotal, recalled.grandTotalAmount, 0.01)
    }

    @Test
    fun holdAndRecall_preservesDiscountOnTotalAmount() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_STEAK, TestFixtures.TAX_CACHE)
        cart.discountOnTotalAmount = 100.0
        cart.recalculateTotals()
        val discountedTotal = cart.grandTotalAmount

        val holdOrder = simulateHoldOrder(cart, "Fixed discount order")
        val recalled = recallHoldOrder(holdOrder)

        assertEquals(100.0, recalled.discountOnTotalAmount, 0.01)
        assertEquals(discountedTotal, recalled.grandTotalAmount, 0.01)
    }

    @Test
    fun holdAndRecall_preservesCustomPrice() = runBlocking {
        cart.addProductWithPrice(TestFixtures.PRODUCT_BURGER, 180.0, TestFixtures.TAX_CACHE)

        val holdOrder = simulateHoldOrder(cart, "Custom price")
        val recalled = recallHoldOrder(holdOrder)

        val item = recalled.cartItems.values.first()
        assertEquals(180.0, item.priceEntered, 0.01)
    }

    @Test
    fun holdAndRecall_preservesMultipleQuantity() = runBlocking {
        cart.addProductWithQty(TestFixtures.PRODUCT_FRIES, 4.0, TestFixtures.TAX_CACHE)

        val holdOrder = simulateHoldOrder(cart, "4x Fries")
        val recalled = recallHoldOrder(holdOrder)

        assertEquals(4.0, recalled.totalQty, 0.01)
        assertEquals(4.0, recalled.cartItems.values.first().qty, 0.01)
    }

    // ========== COMPLEX SCENARIOS ==========

    @Test
    fun holdAndRecall_fullRestaurantOrder() = runBlocking {
        // Simulate a realistic restaurant order with all bells and whistles
        val burger = TestFixtures.cartItem(
            TestFixtures.PRODUCT_BURGER, lineNo = "1", qty = 2.0,
            modifiers = "Extra Cheese", note = "One well done"
        )
        val steak = TestFixtures.cartItem(
            TestFixtures.PRODUCT_STEAK, lineNo = "2", qty = 1.0,
            modifiers = "Pepper Sauce", note = "Medium rare"
        )
        val fries = TestFixtures.cartItem(
            TestFixtures.PRODUCT_FRIES, lineNo = "3", qty = 2.0
        )
        val cola = TestFixtures.cartItem(
            TestFixtures.PRODUCT_COLA, lineNo = "4", qty = 3.0,
            note = "Extra ice"
        )

        cart.addOrUpdateLine(burger)
        cart.addOrUpdateLine(steak)
        cart.addOrUpdateLine(fries)
        cart.addOrUpdateLine(cola)
        cart.note = "Birthday celebration - bring cake at 8pm"
        cart.orderType = "dine_in"
        cart.tipsAmount = 100.0
        cart.discountOnTotalPercentage = 5.0
        cart.recalculateTotals()

        val holdOrder = simulateHoldOrder(cart, "Birthday table")
        val recalled = recallHoldOrder(holdOrder)

        // Verify all items
        assertEquals(4, recalled.getItemCount())

        // Verify item details
        val items = recalled.cartItems.values.toList()
        assertEquals("Extra Cheese", items.find { it.product.product_id == 101 }?.modifiers)
        assertEquals("Pepper Sauce", items.find { it.product.product_id == 104 }?.modifiers)
        assertEquals("Medium rare", items.find { it.product.product_id == 104 }?.note)
        assertEquals("Extra ice", items.find { it.product.product_id == 103 }?.note)

        // Verify cart-level state
        assertEquals("Birthday celebration - bring cake at 8pm", recalled.note)
        assertEquals("dine_in", recalled.orderType)
        assertEquals(100.0, recalled.tipsAmount, 0.01)
        assertEquals(5.0, recalled.discountOnTotalPercentage, 0.01)
    }

    @Test
    fun holdAndRecall_mixedTaxRates() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)  // 15%
        cart.addProduct(TestFixtures.PRODUCT_TAX_10, TestFixtures.TAX_CACHE)  // 10%
        cart.addProduct(TestFixtures.PRODUCT_WATER, TestFixtures.TAX_CACHE)   // 0%
        val originalTax = cart.taxTotalAmount
        val originalTotal = cart.grandTotalAmount

        val holdOrder = simulateHoldOrder(cart, "Mixed taxes")
        val recalled = recallHoldOrder(holdOrder)

        assertEquals(3, recalled.getItemCount())
        assertEquals(originalTax, recalled.taxTotalAmount, 0.01)
        assertEquals(originalTotal, recalled.grandTotalAmount, 0.01)
    }

    @Test
    fun holdAndRecall_taxInclusiveProduct() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_TAX_INCLUSIVE, TestFixtures.TAX_CACHE) // 115 incl
        val originalTotal = cart.grandTotalAmount

        val holdOrder = simulateHoldOrder(cart, "Tax inclusive")
        val recalled = recallHoldOrder(holdOrder)

        assertEquals(originalTotal, recalled.grandTotalAmount, 0.01)
    }

    // ========== KITCHEN HOLD ORDER (with table) ==========

    @Test
    fun kitchenHoldOrder_preservesTableInfo() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        val json = TestFixtures.kitchenOrderJson(
            cart, tableId = 2, tableName = "Table 2"
        )

        val holdOrder = TestFixtures.holdOrder(id = 1, json = json, description = "Table 2")

        val orderJson = holdOrder.json!!
        assertEquals(2, orderJson.getInt("tableId"))
        assertEquals("Table 2", orderJson.getString("tableName"))
        assertTrue(orderJson.getBoolean("isKitchenOrder"))
    }

    @Test
    fun kitchenHoldOrder_recallRestoresCartAndTableFreed() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE)
        val json = TestFixtures.kitchenOrderJson(
            cart, tableId = 1, tableName = "Table 1"
        )
        val holdOrder = TestFixtures.holdOrder(id = 1, json = json)

        val recalled = ShoppingCart()
        recalled.restoreFromJson(holdOrder.json!!, mockProductDao, TestFixtures.TAX_CACHE)

        // Cart should be restored
        assertEquals(2, recalled.getItemCount())

        // Table ID should be accessible from the JSON for freeing
        val tableId = holdOrder.json!!.optInt("tableId", 0)
        assertEquals(1, tableId)
    }

    // ========== EDGE CASES ==========

    @Test
    fun holdAndRecall_emptyCart() = runBlocking {
        val holdOrder = simulateHoldOrder(cart, "Empty")
        val recalled = recallHoldOrder(holdOrder)

        assertTrue(recalled.isEmpty())
        assertEquals(0.0, recalled.grandTotalAmount, 0.01)
    }

    @Test
    fun holdOrder_nullJson_recallsClearsCart() = runBlocking {
        val holdOrder = TestFixtures.holdOrder(id = 1, json = null)

        // Simulate KitchenOrdersActivity.recallOrder() with null JSON
        val recalled = ShoppingCart()
        val json = holdOrder.json
        if (json != null) {
            recalled.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)
        } else {
            recalled.clearCart()
        }

        assertTrue(recalled.isEmpty())
    }

    @Test
    fun holdOrder_description_preserved() {
        val holdOrder = TestFixtures.holdOrder(
            id = 1,
            json = cart.toJson(),
            description = "Walk-in customer"
        )

        assertEquals("Walk-in customer", holdOrder.description)
    }

    @Test
    fun holdOrder_timestamp_preserved() {
        val timestamp = 1710489600000L
        val holdOrder = TestFixtures.holdOrder(id = 1, timestamp = timestamp)

        assertEquals(Timestamp(timestamp), holdOrder.dateHold)
    }

    // ========== HELPERS ==========

    /** Simulate what CartActivity.saveHoldOrder() does. */
    private fun simulateHoldOrder(cart: ShoppingCart, description: String): HoldOrder {
        val json = cart.toJson()
        return TestFixtures.holdOrder(id = 1, json = json, description = description)
    }

    /** Simulate what HoldOrderActivity does on recall. */
    private suspend fun recallHoldOrder(holdOrder: HoldOrder): ShoppingCart {
        val recalled = ShoppingCart()
        val json = holdOrder.json
        if (json != null) {
            recalled.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)
        }
        return recalled
    }
}
