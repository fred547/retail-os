package com.posterita.pos.android

import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.local.entity.Tax
import com.posterita.pos.android.domain.model.CartItem
import com.posterita.pos.android.domain.model.ShoppingCart
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Tests for discount calculations on cart items and cart totals.
 * Covers percentage discounts, line-level discounts, combined discount+tax scenarios.
 */
@RunWith(RobolectricTestRunner::class)
class DiscountCalculationTest {

    private lateinit var cart: ShoppingCart

    @Before
    fun setUp() {
        cart = TestFixtures.newCart()
    }

    // ========== PERCENTAGE DISCOUNT ON ITEM ==========

    @Test
    fun percentageDiscount_appliedToLineItem() {
        val item = TestFixtures.cartItem(
            product = TestFixtures.PRODUCT_BURGER, // 200.0 + 15% tax
            discount = 10.0 // 10% discount
        )
        cart.addOrUpdateLine(item)

        // 200 * 0.90 = 180 base, + 15% tax = 27, total = 207
        assertEquals(180.0, cart.subTotalAmount, 0.01)
        assertEquals(27.0, cart.taxTotalAmount, 0.01)
        assertEquals(207.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun percentageDiscount_zeroPercent_noEffect() {
        val item = TestFixtures.cartItem(
            product = TestFixtures.PRODUCT_BURGER,
            discount = 0.0
        )
        cart.addOrUpdateLine(item)

        // No discount: 200 + 30 tax = 230
        assertEquals(200.0, cart.subTotalAmount, 0.01)
        assertEquals(30.0, cart.taxTotalAmount, 0.01)
        assertEquals(230.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun percentageDiscount_100Percent_freeItem() {
        val item = TestFixtures.cartItem(
            product = TestFixtures.PRODUCT_BURGER,
            discount = 100.0
        )
        cart.addOrUpdateLine(item)

        assertEquals(0.0, cart.subTotalAmount, 0.01)
        assertEquals(0.0, cart.taxTotalAmount, 0.01)
        assertEquals(0.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun percentageDiscount_50Percent() {
        val item = TestFixtures.cartItem(
            product = TestFixtures.PRODUCT_BURGER,
            discount = 50.0
        )
        cart.addOrUpdateLine(item)

        // 200 * 0.50 = 100, + 15% tax = 15, total = 115
        assertEquals(100.0, cart.subTotalAmount, 0.01)
        assertEquals(15.0, cart.taxTotalAmount, 0.01)
        assertEquals(115.0, cart.grandTotalAmount, 0.01)
    }

    // ========== DISCOUNT WITH MULTIPLE ITEMS ==========

    @Test
    fun discount_onlyAffectsDiscountedItem() {
        // Add fries without discount first
        cart.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE)

        // Add burger with 10% discount using a non-conflicting lineNo
        val discountedItem = TestFixtures.cartItem(
            product = TestFixtures.PRODUCT_BURGER,
            lineNo = "99",
            discount = 10.0
        )
        cart.addOrUpdateLine(discountedItem)

        // Burger: 200 * 0.90 = 180 + 27 tax = 207
        // Fries: 75 + 11.25 tax = 86.25
        // Total: 255 + 38.25 = 293.25
        assertEquals(255.0, cart.subTotalAmount, 0.01)
        assertEquals(38.25, cart.taxTotalAmount, 0.01)
        assertEquals(293.25, cart.grandTotalAmount, 0.01)
    }

    // ========== DISCOUNT WITH QUANTITY ==========

    @Test
    fun discount_appliedToAllQuantity() {
        val item = TestFixtures.cartItem(
            product = TestFixtures.PRODUCT_BURGER,
            qty = 3.0,
            discount = 10.0
        )
        cart.addOrUpdateLine(item)

        // 3 × (200 * 0.90) = 540 base, + 15% tax = 81, total = 621
        assertEquals(540.0, cart.subTotalAmount, 0.01)
        assertEquals(81.0, cart.taxTotalAmount, 0.01)
        assertEquals(621.0, cart.grandTotalAmount, 0.01)
    }

    // ========== DISCOUNT WITH ZERO-RATED TAX ==========

    @Test
    fun discount_withZeroTax() {
        val item = TestFixtures.cartItem(
            product = TestFixtures.PRODUCT_WATER, // 30.0, zero-rated
            discount = 20.0
        )
        cart.addOrUpdateLine(item)

        // 30 * 0.80 = 24, no tax
        assertEquals(24.0, cart.subTotalAmount, 0.01)
        assertEquals(0.0, cart.taxTotalAmount, 0.01)
        assertEquals(24.0, cart.grandTotalAmount, 0.01)
    }

    // ========== DISCOUNT WITH TAX-INCLUSIVE ==========

    @Test
    fun discount_withTaxInclusiveProduct() {
        val item = TestFixtures.cartItem(
            product = TestFixtures.PRODUCT_TAX_INCLUSIVE, // 115 tax-inclusive at 15%
            discount = 10.0
        )
        cart.addOrUpdateLine(item)

        // Tax-inclusive: base = 100, tax = 15, selling = 115
        // With 10% discount on price: 115 * 0.90 = 103.50
        // Extracted tax from 103.50: 103.50 * 15/115 = 13.50
        // Base: 103.50 - 13.50 = 90.0
        assertEquals(90.0, cart.subTotalAmount, 0.01)
        assertEquals(13.50, cart.taxTotalAmount, 0.01)
        assertEquals(103.50, cart.grandTotalAmount, 0.01)
    }

    // ========== CART TIPS ==========

    @Test
    fun tips_storedSeparately() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE) // 200 + 30 = 230
        cart.tipsAmount = 20.0

        // Tips are stored separately, NOT added to grandTotalAmount
        assertEquals(230.0, cart.grandTotalAmount, 0.01)
        assertEquals(20.0, cart.tipsAmount, 0.01)
        // Total to charge customer = grandTotalAmount + tipsAmount
        assertEquals(250.0, cart.grandTotalAmount + cart.tipsAmount, 0.01)
    }

    @Test
    fun tips_zeroTips_noEffect() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.tipsAmount = 0.0

        assertEquals(230.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun tips_clearedOnCartClear() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.tipsAmount = 20.0
        cart.clearCart()

        assertEquals(0.0, cart.tipsAmount, 0.01)
        assertEquals(0.0, cart.grandTotalAmount, 0.01)
    }
}
