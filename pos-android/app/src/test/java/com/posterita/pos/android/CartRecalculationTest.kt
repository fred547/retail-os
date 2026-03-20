package com.posterita.pos.android

import com.posterita.pos.android.domain.model.ShoppingCart
import kotlinx.coroutines.runBlocking
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Regression tests for cart recalculation after restore.
 *
 * Covers Sprint 2 fix: cart totals (sub, tax, grand, discount, cost)
 * must be correctly recalculated after restoreFromJson(), after
 * adding/removing items, and after applying discounts on total.
 */
@RunWith(RobolectricTestRunner::class)
class CartRecalculationTest {

    private lateinit var cart: ShoppingCart
    private lateinit var mockProductDao: CartSerializationTest.FakeProductDao

    @Before
    fun setUp() {
        cart = TestFixtures.newCart()
        mockProductDao = CartSerializationTest.FakeProductDao(TestFixtures.ALL_PRODUCTS)
    }

    // ========== BASIC RECALCULATION ==========

    @Test
    fun recalculate_singleItem_taxExclusive() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)

        // Burger: 200, 15% tax exclusive
        assertEquals(200.0, cart.subTotalAmount, 0.01)     // lineAmt
        assertEquals(30.0, cart.taxTotalAmount, 0.01)       // 200 * 15%
        assertEquals(230.0, cart.grandTotalAmount, 0.01)    // 200 + 30
        assertEquals(80.0, cart.costTotalAmount, 0.01)      // costprice * qty
        assertEquals(1.0, cart.totalQty, 0.01)
    }

    @Test
    fun recalculate_singleItem_taxInclusive() {
        cart.addProduct(TestFixtures.PRODUCT_TAX_INCLUSIVE, TestFixtures.TAX_CACHE)

        // Coffee: 115 tax-inclusive at 15%
        // lineNetAmt = 115, taxAmt = 115 * (1 - 100/115) = 15, lineAmt = 100
        assertEquals(100.0, cart.subTotalAmount, 0.01)
        assertEquals(15.0, cart.taxTotalAmount, 0.01)
        assertEquals(115.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun recalculate_singleItem_zeroTax() {
        cart.addProduct(TestFixtures.PRODUCT_WATER, TestFixtures.TAX_CACHE)

        // Water: 30, zero-rated
        assertEquals(30.0, cart.subTotalAmount, 0.01)
        assertEquals(0.0, cart.taxTotalAmount, 0.01)
        assertEquals(30.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun recalculate_multipleItems() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)  // 200 + 30 = 230
        cart.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE)   // 75 + 11.25 = 86.25
        cart.addProduct(TestFixtures.PRODUCT_COLA, TestFixtures.TAX_CACHE)    // 50 + 7.5 = 57.5

        assertEquals(325.0, cart.subTotalAmount, 0.01)     // 200 + 75 + 50
        assertEquals(48.75, cart.taxTotalAmount, 0.01)      // 30 + 11.25 + 7.5
        assertEquals(373.75, cart.grandTotalAmount, 0.01)   // 325 + 48.75
        assertEquals(3.0, cart.totalQty, 0.01)
    }

    @Test
    fun recalculate_multipleQty() {
        cart.addProductWithQty(TestFixtures.PRODUCT_BURGER, 3.0, TestFixtures.TAX_CACHE)

        // 3 * 200 = 600 + 15% = 690
        assertEquals(600.0, cart.subTotalAmount, 0.01)
        assertEquals(90.0, cart.taxTotalAmount, 0.01)
        assertEquals(690.0, cart.grandTotalAmount, 0.01)
        assertEquals(3.0, cart.totalQty, 0.01)
    }

    // ========== DISCOUNT ON TOTAL ==========

    @Test
    fun discountOnTotal_percentage() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE) // grand = 230
        cart.discountOnTotalPercentage = 10.0
        cart.recalculateTotals()

        // 10% of 230 = 23
        assertEquals(23.0, cart.discountTotalAmount, 0.01)
        assertEquals(207.0, cart.grandTotalAmount, 0.01) // 230 - 23
    }

    @Test
    fun discountOnTotal_fixedAmount() {
        cart.addProduct(TestFixtures.PRODUCT_STEAK, TestFixtures.TAX_CACHE) // 500 + 75 = 575
        cart.discountOnTotalAmount = 50.0
        cart.recalculateTotals()

        assertEquals(50.0, cart.discountTotalAmount, 0.01)
        assertEquals(525.0, cart.grandTotalAmount, 0.01) // 575 - 50
    }

    @Test
    fun discountOnTotal_fixedAmount_cannotExceedTotal() {
        cart.addProduct(TestFixtures.PRODUCT_WATER, TestFixtures.TAX_CACHE) // 30 (no tax)
        cart.discountOnTotalAmount = 100.0 // more than the total
        cart.recalculateTotals()

        // Discount capped at grand total
        assertEquals(30.0, cart.discountTotalAmount, 0.01) // min(100, 30)
        assertEquals(0.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun discountOnTotal_zeroPercentage_noDiscount() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE) // 230
        cart.discountOnTotalPercentage = 0.0
        cart.recalculateTotals()

        assertEquals(0.0, cart.discountTotalAmount, 0.01)
        assertEquals(230.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun discountOnTotal_preservedAfterRestore() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE)
        cart.discountOnTotalPercentage = 15.0
        cart.recalculateTotals()
        val originalDiscount = cart.discountTotalAmount
        val originalGrand = cart.grandTotalAmount

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertEquals(15.0, restored.discountOnTotalPercentage, 0.01)
        assertEquals(originalDiscount, restored.discountTotalAmount, 0.01)
        assertEquals(originalGrand, restored.grandTotalAmount, 0.01)
    }

    // ========== RECALCULATION AFTER MODIFICATIONS ==========

    @Test
    fun recalculate_afterAddingItem() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE) // 230
        val totalBefore = cart.grandTotalAmount

        cart.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE) // +86.25

        assertEquals(totalBefore + 86.25, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun recalculate_afterRemovingItem() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE)
        val lineNo = cart.cartItems.keys.first()

        cart.removeProduct(lineNo)

        assertEquals(1, cart.getItemCount())
        assertTrue(cart.grandTotalAmount > 0)
    }

    @Test
    fun recalculate_afterQtyChange() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE) // 230
        val lineNo = cart.cartItems.keys.first()

        cart.updateProductQty(lineNo, 3.0)

        // 3 * 200 + 3 * 30 = 690
        assertEquals(690.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun recalculate_afterPriceChange() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        val lineNo = cart.cartItems.keys.first()

        cart.updatePrice(lineNo, 150.0)

        // 150 + 15% = 172.5
        assertEquals(172.5, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun recalculate_afterTaxChange() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE) // 15% -> 30 tax
        val lineNo = cart.cartItems.keys.first()

        cart.updateTax(lineNo, TestFixtures.TAX_VAT_10)

        // 200 + 10% = 220
        assertEquals(220.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun recalculate_afterClearCart() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_STEAK, TestFixtures.TAX_CACHE)
        cart.discountOnTotalPercentage = 10.0
        cart.tipsAmount = 50.0
        cart.note = "Some note"
        cart.recalculateTotals()

        cart.clearCart()

        assertEquals(0.0, cart.grandTotalAmount, 0.01)
        assertEquals(0.0, cart.subTotalAmount, 0.01)
        assertEquals(0.0, cart.taxTotalAmount, 0.01)
        assertEquals(0.0, cart.costTotalAmount, 0.01)
        assertEquals(0.0, cart.totalQty, 0.01)
        assertEquals(0.0, cart.discountTotalAmount, 0.01)
        assertEquals(0.0, cart.tipsAmount, 0.01)
        assertEquals(0.0, cart.discountOnTotalPercentage, 0.01)
        assertNull(cart.note)
    }

    // ========== RECALCULATION AFTER RESTORE ==========

    @Test
    fun recalculate_afterRestore_matchesOriginal() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_COLA, TestFixtures.TAX_CACHE)
        val originalSub = cart.subTotalAmount
        val originalTax = cart.taxTotalAmount
        val originalGrand = cart.grandTotalAmount
        val originalCost = cart.costTotalAmount

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertEquals(originalSub, restored.subTotalAmount, 0.01)
        assertEquals(originalTax, restored.taxTotalAmount, 0.01)
        assertEquals(originalGrand, restored.grandTotalAmount, 0.01)
        assertEquals(originalCost, restored.costTotalAmount, 0.01)
    }

    @Test
    fun recalculate_afterRestore_canAddMoreItems() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        val json = cart.toJson()

        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)
        val totalAfterRestore = restored.grandTotalAmount

        // Add another product after restore
        restored.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE)

        assertEquals(2, restored.getItemCount())
        assertTrue(restored.grandTotalAmount > totalAfterRestore)
        // 230 (burger) + 86.25 (fries) = 316.25
        assertEquals(316.25, restored.grandTotalAmount, 0.01)
    }

    @Test
    fun recalculate_afterRestore_canApplyDiscount() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_STEAK, TestFixtures.TAX_CACHE) // 575
        val json = cart.toJson()

        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        // Apply discount after restore
        restored.discountOnTotalPercentage = 20.0
        restored.recalculateTotals()

        // 575 - 20% = 575 - 115 = 460
        assertEquals(460.0, restored.grandTotalAmount, 0.01)
    }

    // ========== MIXED TAX RATES RECALCULATION ==========

    @Test
    fun recalculate_mixedTaxRates_correctAggregation() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)  // 200 + 30
        cart.addProduct(TestFixtures.PRODUCT_TAX_10, TestFixtures.TAX_CACHE)  // 150 + 15
        cart.addProduct(TestFixtures.PRODUCT_WATER, TestFixtures.TAX_CACHE)   // 30 + 0

        assertEquals(380.0, cart.subTotalAmount, 0.01)      // 200 + 150 + 30
        assertEquals(45.0, cart.taxTotalAmount, 0.01)        // 30 + 15 + 0
        assertEquals(425.0, cart.grandTotalAmount, 0.01)     // 380 + 45
    }

    // ========== PRODUCT QTY MAP ==========

    @Test
    fun productQtyMap_tracksAfterRestore() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE) // qty = 2

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertEquals(2.0, restored.productQtyMap[101] ?: 0.0, 0.01)
    }

    @Test
    fun productQtyMap_clearedAfterClear() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)

        cart.clearCart()

        assertTrue(cart.productQtyMap.isEmpty())
    }

    // ========== LINE-LEVEL ITEM DISCOUNT ==========

    @Test
    fun itemDiscount_recalculatedCorrectly() {
        val item = TestFixtures.cartItem(
            TestFixtures.PRODUCT_BURGER,
            discount = 20.0  // 20% discount
        )
        cart.addOrUpdateLine(item)

        // Burger: 200, 20% off = 160, + 15% tax = 160 + 24 = 184
        assertEquals(40.0, cart.discountTotalAmount, 0.01)
        assertEquals(160.0, cart.subTotalAmount, 0.01)
        assertEquals(24.0, cart.taxTotalAmount, 0.01)
        assertEquals(184.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun itemDiscount_combinedWithTotalDiscount() {
        val item = TestFixtures.cartItem(
            TestFixtures.PRODUCT_BURGER,
            discount = 10.0  // 10% item discount
        )
        cart.addOrUpdateLine(item)
        cart.discountOnTotalPercentage = 5.0  // additional 5% on total
        cart.recalculateTotals()

        // Burger: 200, 10% off = 180, + 15% tax = 207
        // Then 5% total discount = 207 * 0.05 = 10.35
        // Grand = 207 - 10.35 = 196.65
        // Total discount = 20 (item) + 10.35 (total) = 30.35
        assertEquals(196.65, cart.grandTotalAmount, 0.01)
    }
}
