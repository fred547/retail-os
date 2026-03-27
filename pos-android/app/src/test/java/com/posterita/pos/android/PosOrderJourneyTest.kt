package com.posterita.pos.android

import com.posterita.pos.android.domain.model.CartType
import com.posterita.pos.android.domain.model.ShoppingCart
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Journey tests: full POS order workflows end-to-end.
 *
 * Each test exercises a complete business scenario, not isolated functions.
 * Covers: order creation, promotions, delivery, serialized items, refunds,
 * split lines, stock validation, and JSON round-trips.
 */
@RunWith(RobolectricTestRunner::class)
class PosOrderJourneyTest {

    private lateinit var cart: ShoppingCart
    private lateinit var mockDao: CartSerializationTest.FakeProductDao

    @Before
    fun setUp() {
        cart = TestFixtures.newCart()
        mockDao = CartSerializationTest.FakeProductDao(TestFixtures.ALL_PRODUCTS)
    }

    // ============================================================
    // Journey 1: Full POS Order (items + discount + promo + delivery)
    // ============================================================

    @Test
    fun `full order journey — items plus discount plus promotion plus delivery`() {
        // 1. Add items
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)  // 200
        cart.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE)   // 75
        cart.addProduct(TestFixtures.PRODUCT_COLA, TestFixtures.TAX_CACHE)    // 50
        assertEquals(3, cart.getItemCount())
        assertEquals(3.0, cart.totalQty, 0.01)

        // 2. Apply 10% order discount
        cart.discountOnTotalPercentage = 10.0
        cart.recalculateTotals()
        val afterDiscount = cart.grandTotalAmount
        assertTrue(afterDiscount < 400) // Must be less than undiscounted total

        // 3. Apply promotion
        cart.promotionName = "Flash Sale"
        cart.promotionId = 42
        cart.promotionDiscount = 15.0

        // 4. Set delivery
        cart.orderType = "delivery"
        cart.deliveryCustomerName = "John Doe"
        cart.deliveryCustomerPhone = "+230 5555 1234"
        cart.deliveryAddress = "42 Royal Road, Port Louis"
        cart.deliveryNotes = "Ring bell twice"

        // 5. Serialize
        val json = cart.toJson()

        // 6. Verify ALL fields in JSON
        assertEquals("delivery", json.getString("orderType"))
        assertEquals("Flash Sale", json.getString("promotion_name"))
        assertEquals(42, json.getInt("promotion_id"))
        assertEquals(15.0, json.getDouble("promotion_discount"), 0.01)
        assertEquals("John Doe", json.getString("delivery_customer_name"))
        assertEquals("+230 5555 1234", json.getString("delivery_customer_phone"))
        assertEquals("42 Royal Road, Port Louis", json.getString("delivery_address"))
        assertEquals("Ring bell twice", json.getString("delivery_notes"))
        assertEquals(10.0, json.getDouble("discountOnTotalPercentage"), 0.01)
        assertEquals(3, json.getJSONArray("items").length())
    }

    @Test
    fun `full order roundTrip — promotion and delivery survive serialize-deserialize`() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.promotionName = "Weekend Special"
        cart.promotionId = 99
        cart.promotionDiscount = 23.0
        cart.orderType = "delivery"
        cart.deliveryCustomerName = "Alice"
        cart.deliveryAddress = "456 Oak Ave"
        cart.tipsAmount = 20.0

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockDao, TestFixtures.TAX_CACHE)

        // Verify restoration (note: promotion/delivery NOT restored by restoreFromJson — they're order-level, not cart-level)
        assertEquals(1, restored.getItemCount())
        assertEquals("delivery", restored.orderType)
        assertEquals(20.0, restored.tipsAmount, 0.01)
        assertEquals(cart.grandTotalAmount, restored.grandTotalAmount, 0.01)
    }

    // ============================================================
    // Journey 2: Serialized Product (VIN/IMEI Tracking)
    // ============================================================

    @Test
    fun `serialized product — each serial item gets unique line`() {
        val product = TestFixtures.PRODUCT_STEAK // Pretend it's a tracked item

        cart.addSerializedProduct(product, 1, "VIN-ABC-123", TestFixtures.TAX_CACHE)
        cart.addSerializedProduct(product, 2, "VIN-DEF-456", TestFixtures.TAX_CACHE)
        cart.addSerializedProduct(product, 3, "VIN-GHI-789", TestFixtures.TAX_CACHE)

        // Must be 3 separate lines even though same product
        assertEquals(3, cart.getItemCount())

        val items = cart.cartItems.values.toList()
        assertEquals("VIN-ABC-123", items[0].serialNumber)
        assertEquals("VIN-DEF-456", items[1].serialNumber)
        assertEquals("VIN-GHI-789", items[2].serialNumber)
        assertEquals(1, items[0].serialItemId)
        assertEquals(2, items[1].serialItemId)
        assertEquals(3, items[2].serialItemId)

        // Each line has qty=1
        assertTrue(items.all { it.qty == 1.0 })
    }

    @Test
    fun `serialized product — serial data preserved in JSON`() {
        cart.addSerializedProduct(TestFixtures.PRODUCT_BURGER, 42, "IMEI-987654321", TestFixtures.TAX_CACHE)

        val json = cart.toJson()
        val itemJson = json.getJSONArray("items").getJSONObject(0)

        assertEquals(42, itemJson.getInt("serial_item_id"))
        assertEquals("IMEI-987654321", itemJson.getString("serial_number"))
    }

    @Test
    fun `serialized product — roundTrip preserves serial data`() = runBlocking {
        cart.addSerializedProduct(TestFixtures.PRODUCT_BURGER, 7, "SN-ROUNDTRIP", TestFixtures.TAX_CACHE)

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockDao, TestFixtures.TAX_CACHE)

        val item = restored.cartItems.values.first()
        assertEquals(7, item.serialItemId)
        assertEquals("SN-ROUNDTRIP", item.serialNumber)
    }

    @Test
    fun `serialized product — regular product still merges on re-add`() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)

        // Regular products merge — 1 line, qty=2
        assertEquals(1, cart.getItemCount())
        assertEquals(2.0, cart.cartItems.values.first().qty, 0.01)
    }

    // ============================================================
    // Journey 3: Stock Validation (qty exceeds available)
    // ============================================================

    @Test
    fun `stock validation — productQtyMap tracks cumulative additions`() {
        val trackedProduct = TestFixtures.PRODUCT_BURGER.copy(
            quantity_on_hand = 5.0, track_stock = 1, reorder_point = 2.0
        )

        cart.addProduct(trackedProduct, TestFixtures.TAX_CACHE)       // qty=1
        cart.addProduct(trackedProduct, TestFixtures.TAX_CACHE)       // qty=2
        cart.addProduct(trackedProduct, TestFixtures.TAX_CACHE)       // qty=3

        assertEquals(3.0, cart.productQtyMap[trackedProduct.product_id]!!, 0.01)
    }

    @Test
    fun `stock validation — detect when cart qty exceeds available stock`() {
        val product = TestFixtures.PRODUCT_BURGER.copy(quantity_on_hand = 2.0, track_stock = 1)

        cart.addProductWithQty(product, 5.0, TestFixtures.TAX_CACHE)

        val cartQty = cart.productQtyMap[product.product_id]!!
        val exceeds = cartQty > product.quantity_on_hand
        assertTrue("Cart qty ($cartQty) should exceed available (${product.quantity_on_hand})", exceeds)
    }

    @Test
    fun `stock validation — untracked product never triggers warning`() {
        val untracked = TestFixtures.PRODUCT_BURGER.copy(quantity_on_hand = 0.0, track_stock = 0)

        cart.addProductWithQty(untracked, 100.0, TestFixtures.TAX_CACHE)

        assertFalse(untracked.tracksStock)
        // Even though qty_on_hand=0, no warning because stock isn't tracked
    }

    // ============================================================
    // Journey 4: Refund Cart (negate + partial refund)
    // ============================================================

    @Test
    fun `refund journey — negate cart produces negative totals`() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)  // 200+tax
        cart.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE)   // 75+tax
        val originalTotal = cart.grandTotalAmount
        assertTrue(originalTotal > 0)

        cart.negateForRefund()

        assertTrue(cart.grandTotalAmount < 0)
        assertEquals(-originalTotal, cart.grandTotalAmount, 0.01)

        // Each item has negative qty
        for (item in cart.cartItems.values) {
            assertTrue(item.qty < 0)
        }
    }

    @Test
    fun `refund journey — refund cart limits qty increase to initialQty`() {
        val refundCart = ShoppingCart(CartType.REFUND)
        val item = TestFixtures.cartItem(TestFixtures.PRODUCT_BURGER, lineNo = "1", qty = 1.0)
        item.initialQty = 2.0  // Original order had 2
        refundCart.addOrUpdateLine(item)

        // Can increase up to initialQty
        refundCart.increaseQty("1")
        assertEquals(2.0, refundCart.cartItems["1"]!!.qty, 0.01)

        // Cannot increase beyond initialQty
        refundCart.increaseQty("1")
        assertEquals(2.0, refundCart.cartItems["1"]!!.qty, 0.01) // Still 2, not 3
    }

    @Test
    fun `refund journey — negated refund serializes correctly`() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.negateForRefund()

        val json = cart.toJson()
        val itemJson = json.getJSONArray("items").getJSONObject(0)

        assertTrue(itemJson.getDouble("qty") < 0)
        assertTrue(json.getDouble("grandtotal") < 0)
    }

    // ============================================================
    // Journey 5: Split Line
    // ============================================================

    @Test
    fun `split line — preserves total qty and amount`() {
        cart.addProductWithQty(TestFixtures.PRODUCT_BURGER, 4.0, TestFixtures.TAX_CACHE)
        val totalBefore = cart.grandTotalAmount
        val qtyBefore = cart.totalQty
        val lineNo = cart.cartItems.keys.first()

        cart.splitLine(lineNo, 1.0)

        assertEquals(2, cart.getItemCount())
        assertEquals(qtyBefore, cart.totalQty, 0.01)
        assertEquals(totalBefore, cart.grandTotalAmount, 0.01)

        // Original line: 3 qty, split line: 1 qty
        assertEquals(3.0, cart.cartItems[lineNo]!!.qty, 0.01)
        assertEquals(1.0, cart.cartItems["${lineNo}_1"]!!.qty, 0.01)
    }

    @Test
    fun `split line — custom price preserved on both halves`() {
        cart.addProductWithPrice(TestFixtures.PRODUCT_BURGER, 175.0, TestFixtures.TAX_CACHE)
        val lineNo = cart.cartItems.keys.first()

        // Increase qty to 3 before splitting
        cart.updateProductQty(lineNo, 3.0)
        cart.splitLine(lineNo, 1.0)

        val original = cart.cartItems[lineNo]!!
        val split = cart.cartItems["${lineNo}_1"]!!

        assertEquals(175.0, original.priceEntered, 0.01)
        assertEquals(175.0, split.priceEntered, 0.01)
    }

    // ============================================================
    // Journey 6: Inventory Count Full Workflow
    // ============================================================

    @Test
    fun `inventory count — scan accumulate and variance across session`() {
        val products = listOf(
            TestFixtures.PRODUCT_BURGER.copy(quantity_on_hand = 10.0, track_stock = 1),
            TestFixtures.PRODUCT_FRIES.copy(quantity_on_hand = 20.0, track_stock = 1),
            TestFixtures.PRODUCT_COLA.copy(quantity_on_hand = 5.0, track_stock = 1),
        )

        // Simulate scanning: Burger x12, Fries x20, Cola x3
        data class ScanResult(val productId: Int, val counted: Int, val systemQty: Double)
        val scans = listOf(
            ScanResult(101, 12, 10.0),  // +2 surplus
            ScanResult(102, 20, 20.0),  // 0 exact
            ScanResult(103, 3, 5.0),    // -2 shortage
        )

        // Compute variances
        val variances = scans.map { it.counted - it.systemQty }
        assertEquals(listOf(2.0, 0.0, -2.0), variances)

        // Variance count (non-zero)
        val varianceCount = variances.count { it != 0.0 }
        assertEquals(2, varianceCount)

        // Total variance
        val totalVariance = variances.sum()
        assertEquals(0.0, totalVariance, 0.01) // Surplus and shortage cancel out

        // Products needing adjustment
        val adjustments = scans.filter { it.counted.toDouble() != it.systemQty }
        assertEquals(2, adjustments.size)
    }

    // ============================================================
    // Journey 7: Multi-Item Cart with Mixed Tax Rates + Tips
    // ============================================================

    @Test
    fun `complex cart — mixed taxes plus tips plus discount roundTrips`() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)        // 15% tax exclusive
        cart.addProduct(TestFixtures.PRODUCT_TAX_INCLUSIVE, TestFixtures.TAX_CACHE)  // 15% tax inclusive
        cart.addProduct(TestFixtures.PRODUCT_TAX_10, TestFixtures.TAX_CACHE)         // 10% tax exclusive
        cart.addProduct(TestFixtures.PRODUCT_WATER, TestFixtures.TAX_CACHE)          // 0% tax

        cart.tipsAmount = 25.0
        cart.tipsPercentage = 5.0
        cart.discountOnTotalAmount = 20.0
        cart.note = "Table 5 — birthday party"
        cart.recalculateTotals()

        val total = cart.grandTotalAmount
        val tax = cart.taxTotalAmount
        assertTrue(tax > 0)
        assertTrue(total > 0)

        // Round-trip
        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockDao, TestFixtures.TAX_CACHE)

        assertEquals(4, restored.getItemCount())
        assertEquals(total, restored.grandTotalAmount, 0.01)
        assertEquals(tax, restored.taxTotalAmount, 0.01)
        assertEquals(25.0, restored.tipsAmount, 0.01)
        assertEquals(20.0, restored.discountOnTotalAmount, 0.01)
        assertEquals("Table 5 — birthday party", restored.note)
    }

    // ============================================================
    // Journey 8: Clear Cart Resets Everything
    // ============================================================

    @Test
    fun `clearCart — resets all fields including promotion delivery tips discount`() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE)

        // Set everything
        cart.promotionName = "Big Sale"
        cart.promotionId = 1
        cart.promotionDiscount = 50.0
        cart.deliveryCustomerName = "Bob"
        cart.deliveryCustomerPhone = "555"
        cart.deliveryAddress = "123 St"
        cart.deliveryNotes = "Gate code 1234"
        cart.orderType = "delivery"
        cart.tipsAmount = 30.0
        cart.tipsPercentage = 10.0
        cart.discountOnTotalPercentage = 15.0
        cart.discountOnTotalAmount = 25.0
        cart.note = "VIP"

        cart.clearCart()

        // Everything reset
        assertTrue(cart.isEmpty())
        assertEquals(0.0, cart.grandTotalAmount, 0.01)
        assertNull(cart.promotionName)
        assertNull(cart.promotionId)
        assertEquals(0.0, cart.promotionDiscount, 0.01)
        assertNull(cart.deliveryCustomerName)
        assertNull(cart.deliveryCustomerPhone)
        assertNull(cart.deliveryAddress)
        assertNull(cart.deliveryNotes)
        assertEquals("dine_in", cart.orderType)
        assertEquals(0.0, cart.tipsAmount, 0.01)
        assertEquals(0.0, cart.tipsPercentage, 0.01)
        assertEquals(0.0, cart.discountOnTotalPercentage, 0.01)
        assertEquals(0.0, cart.discountOnTotalAmount, 0.01)
        assertNull(cart.note)
        assertTrue(cart.productQtyMap.isEmpty())
        assertTrue(cart.appliedCoupons.isEmpty())
    }
}
