package com.posterita.pos.android

import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.local.entity.Tax
import com.posterita.pos.android.domain.model.CartItem
import com.posterita.pos.android.domain.model.CartType
import com.posterita.pos.android.domain.model.ShoppingCart
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Tests for tax calculation edge cases across different tax modes,
 * rates, and product configurations.
 */
@RunWith(RobolectricTestRunner::class)
class TaxCalculationTest {

    private lateinit var cart: ShoppingCart

    @Before
    fun setUp() {
        cart = TestFixtures.newCart()
    }

    // ========== TAX-INCLUSIVE: tax extracted from selling price ==========

    @Test
    fun taxInclusive_taxExtractedFromPrice() {
        // Coffee: 115 tax-inclusive at 15%
        // lineNetAmt = 115, taxAmt = 115 * (1 - 100/115) = 15, lineAmt = 100
        cart.addProduct(TestFixtures.PRODUCT_TAX_INCLUSIVE, TestFixtures.TAX_CACHE)

        assertEquals(100.0, cart.subTotalAmount, 0.01)
        assertEquals(15.0, cart.taxTotalAmount, 0.01)
        assertEquals(115.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun taxInclusive_grandTotalEqualsSellingPrice() {
        // For tax-inclusive products, grand total should equal the selling price
        cart.addProduct(TestFixtures.PRODUCT_TAX_INCLUSIVE, TestFixtures.TAX_CACHE)

        assertEquals(
            TestFixtures.PRODUCT_TAX_INCLUSIVE.sellingprice,
            cart.grandTotalAmount,
            0.01
        )
    }

    @Test
    fun taxInclusive_multipleQty() {
        // 3 x Coffee at 115 tax-inclusive = 345 grand, 300 sub, 45 tax
        cart.addProductWithQty(TestFixtures.PRODUCT_TAX_INCLUSIVE, 3.0, TestFixtures.TAX_CACHE)

        assertEquals(300.0, cart.subTotalAmount, 0.01)
        assertEquals(45.0, cart.taxTotalAmount, 0.01)
        assertEquals(345.0, cart.grandTotalAmount, 0.01)
    }

    // ========== TAX-EXCLUSIVE: tax added on top ==========

    @Test
    fun taxExclusive_taxAddedOnTop() {
        // Burger: 200, 15% tax exclusive => tax = 30, grand = 230
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)

        assertEquals(200.0, cart.subTotalAmount, 0.01)
        assertEquals(30.0, cart.taxTotalAmount, 0.01)
        assertEquals(230.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun taxExclusive_grandTotalExceedsSellingPrice() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)

        assertTrue(cart.grandTotalAmount > TestFixtures.PRODUCT_BURGER.sellingprice)
    }

    // ========== ZERO TAX RATE ==========

    @Test
    fun zeroTaxRate_noTaxCharged() {
        // Water: 30, zero-rated
        cart.addProduct(TestFixtures.PRODUCT_WATER, TestFixtures.TAX_CACHE)

        assertEquals(30.0, cart.subTotalAmount, 0.01)
        assertEquals(0.0, cart.taxTotalAmount, 0.01)
        assertEquals(30.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun zeroTaxRate_subTotalEqualsGrandTotal() {
        cart.addProduct(TestFixtures.PRODUCT_WATER, TestFixtures.TAX_CACHE)

        assertEquals(cart.subTotalAmount, cart.grandTotalAmount, 0.01)
    }

    // ========== MULTIPLE PRODUCTS WITH DIFFERENT TAX RATES ==========

    @Test
    fun mixedTaxRates_correctAggregation() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)  // 200 + 30 (15%)
        cart.addProduct(TestFixtures.PRODUCT_TAX_10, TestFixtures.TAX_CACHE)  // 150 + 15 (10%)
        cart.addProduct(TestFixtures.PRODUCT_WATER, TestFixtures.TAX_CACHE)   // 30 + 0  (0%)

        assertEquals(380.0, cart.subTotalAmount, 0.01)   // 200 + 150 + 30
        assertEquals(45.0, cart.taxTotalAmount, 0.01)     // 30 + 15 + 0
        assertEquals(425.0, cart.grandTotalAmount, 0.01)  // 380 + 45
    }

    @Test
    fun mixedTaxRates_inclusiveAndExclusive() {
        // Tax-inclusive coffee (115 incl 15%) + Tax-exclusive burger (200 + 15%)
        cart.addProduct(TestFixtures.PRODUCT_TAX_INCLUSIVE, TestFixtures.TAX_CACHE) // sub=100, tax=15, grand=115
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)       // sub=200, tax=30, grand=230

        assertEquals(300.0, cart.subTotalAmount, 0.01)   // 100 + 200
        assertEquals(45.0, cart.taxTotalAmount, 0.01)     // 15 + 30
        assertEquals(345.0, cart.grandTotalAmount, 0.01)  // 115 + 230
    }

    @Test
    fun mixedTaxRates_allThreeTypes() {
        // Inclusive + exclusive + zero-rated
        cart.addProduct(TestFixtures.PRODUCT_TAX_INCLUSIVE, TestFixtures.TAX_CACHE) // sub=100, tax=15
        cart.addProduct(TestFixtures.PRODUCT_TAX_10, TestFixtures.TAX_CACHE)       // sub=150, tax=15
        cart.addProduct(TestFixtures.PRODUCT_WATER, TestFixtures.TAX_CACHE)        // sub=30,  tax=0

        assertEquals(280.0, cart.subTotalAmount, 0.01)   // 100 + 150 + 30
        assertEquals(30.0, cart.taxTotalAmount, 0.01)     // 15 + 15 + 0
        assertEquals(310.0, cart.grandTotalAmount, 0.01)  // 115 + 165 + 30
    }

    // ========== TAX RECALCULATION AFTER PRICE CHANGE ==========

    @Test
    fun taxRecalculation_afterPriceChange() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE) // 200 + 30 = 230
        val lineNo = cart.cartItems.keys.first()

        cart.updatePrice(lineNo, 100.0)

        // 100 + 15% = 115
        assertEquals(100.0, cart.subTotalAmount, 0.01)
        assertEquals(15.0, cart.taxTotalAmount, 0.01)
        assertEquals(115.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun taxRecalculation_afterPriceIncrease() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE) // 200 + 30 = 230
        val lineNo = cart.cartItems.keys.first()

        cart.updatePrice(lineNo, 300.0)

        // 300 + 15% = 345
        assertEquals(300.0, cart.subTotalAmount, 0.01)
        assertEquals(45.0, cart.taxTotalAmount, 0.01)
        assertEquals(345.0, cart.grandTotalAmount, 0.01)
    }

    // ========== TAX RECALCULATION AFTER QUANTITY CHANGE ==========

    @Test
    fun taxRecalculation_afterQuantityIncrease() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE) // 200 + 30 = 230
        val lineNo = cart.cartItems.keys.first()

        cart.updateProductQty(lineNo, 5.0)

        // 5 * 200 = 1000, tax = 150, grand = 1150
        assertEquals(1000.0, cart.subTotalAmount, 0.01)
        assertEquals(150.0, cart.taxTotalAmount, 0.01)
        assertEquals(1150.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun taxRecalculation_afterQuantityDecrease() {
        cart.addProductWithQty(TestFixtures.PRODUCT_FRIES, 4.0, TestFixtures.TAX_CACHE)
        val lineNo = cart.cartItems.keys.first()

        cart.updateProductQty(lineNo, 2.0)

        // 2 * 75 = 150, tax = 22.5, grand = 172.5
        assertEquals(150.0, cart.subTotalAmount, 0.01)
        assertEquals(22.5, cart.taxTotalAmount, 0.01)
        assertEquals(172.5, cart.grandTotalAmount, 0.01)
    }

    // ========== TAX AMOUNT ROUNDING ==========

    @Test
    fun taxRounding_twoDecimalPlaces() {
        // Create a product where tax calculation produces more than 2 decimal places
        // 33.33 * 15% = 4.9995 => should round to 5.00
        val oddPriceProduct = Product(
            product_id = 200,
            name = "Odd Price Item",
            sellingprice = 33.33,
            costprice = 10.0,
            tax_id = 1,
            istaxincluded = "N",
            isactive = "Y",
            productcategory_id = 10
        )
        cart.addProduct(oddPriceProduct, TestFixtures.TAX_CACHE)

        // Tax = 33.33 * 15% = 4.9995 => rounded to 5.00
        assertEquals(5.0, cart.taxTotalAmount, 0.01)
        assertEquals(38.33, cart.grandTotalAmount, 0.01) // 33.33 + 5.00
    }

    @Test
    fun taxRounding_subCentAccuracy() {
        // 7.77 * 10% = 0.777 => should round to 0.78
        val product = Product(
            product_id = 201,
            name = "Sub Cent Item",
            sellingprice = 7.77,
            costprice = 3.0,
            tax_id = 2, // 10% tax
            istaxincluded = "N",
            isactive = "Y",
            productcategory_id = 10
        )
        cart.addProduct(product, TestFixtures.TAX_CACHE)

        assertEquals(0.78, cart.taxTotalAmount, 0.01)
        assertEquals(8.55, cart.grandTotalAmount, 0.01) // 7.77 + 0.78
    }

    // ========== PRODUCT WITH NO TAX (tax_id = 0) ==========

    @Test
    fun noTaxId_zeroTaxCharged() {
        val noTaxProduct = Product(
            product_id = 210,
            name = "No Tax Product",
            sellingprice = 50.0,
            costprice = 20.0,
            tax_id = 0, // no tax_id
            istaxincluded = "N",
            isactive = "Y",
            productcategory_id = 10
        )
        cart.addProduct(noTaxProduct, TestFixtures.TAX_CACHE)

        // tax_id=0 is not in the tax cache, so tax should be null => rate 0
        assertEquals(50.0, cart.subTotalAmount, 0.01)
        assertEquals(0.0, cart.taxTotalAmount, 0.01)
        assertEquals(50.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun noTaxId_mixedWithTaxedProducts() {
        val noTaxProduct = Product(
            product_id = 211,
            name = "Exempt Item",
            sellingprice = 40.0,
            costprice = 15.0,
            tax_id = 0,
            istaxincluded = "N",
            isactive = "Y",
            productcategory_id = 10
        )
        cart.addProduct(noTaxProduct, TestFixtures.TAX_CACHE)     // 40 + 0
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE) // 200 + 30

        assertEquals(240.0, cart.subTotalAmount, 0.01)
        assertEquals(30.0, cart.taxTotalAmount, 0.01)
        assertEquals(270.0, cart.grandTotalAmount, 0.01)
    }

    // ========== TAX ON REFUND ITEMS (negative quantities) ==========

    @Test
    fun refundCart_negativeTotals() {
        val cart = ShoppingCart(CartType.REFUND)
        val item = CartItem(
            product = TestFixtures.PRODUCT_BURGER,
            lineNo = "1",
            qty = -1.0,
            priceEntered = TestFixtures.PRODUCT_BURGER.sellingprice,
            tax = TestFixtures.TAX_VAT_15,
            initialQty = 1.0
        )
        item.updateTotals()
        cart.addOrUpdateLine(item)

        // qty=-1, price=200, lineAmt = -200, tax = -30, lineNetAmt = -230
        assertEquals(-200.0, cart.subTotalAmount, 0.01)
        assertEquals(-30.0, cart.taxTotalAmount, 0.01)
        assertEquals(-230.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun negateForRefund_reversesSigns() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE)

        val originalGrand = cart.grandTotalAmount
        cart.negateForRefund()

        assertEquals(-originalGrand, cart.grandTotalAmount, 0.01)
        assertTrue(cart.taxTotalAmount < 0)
        assertTrue(cart.subTotalAmount < 0)
    }

    // ========== LARGE QUANTITY x SMALL PRICE ==========

    @Test
    fun largeQuantity_smallPrice_taxAccuracy() {
        // 1000 x 0.99 = 990, 15% tax = 148.5
        val cheapProduct = Product(
            product_id = 220,
            name = "Penny Item",
            sellingprice = 0.99,
            costprice = 0.30,
            tax_id = 1,
            istaxincluded = "N",
            isactive = "Y",
            productcategory_id = 10
        )
        cart.addProductWithQty(cheapProduct, 1000.0, TestFixtures.TAX_CACHE)

        assertEquals(990.0, cart.subTotalAmount, 0.01)
        assertEquals(148.5, cart.taxTotalAmount, 0.01)
        assertEquals(1138.5, cart.grandTotalAmount, 0.01)
    }

    // ========== SMALL QUANTITY x LARGE PRICE ==========

    @Test
    fun smallQuantity_largePrice_taxAccuracy() {
        // 1 x 9999.99 = 9999.99, 15% tax = 1500.00
        val expensiveProduct = Product(
            product_id = 230,
            name = "Luxury Item",
            sellingprice = 9999.99,
            costprice = 5000.0,
            tax_id = 1,
            istaxincluded = "N",
            isactive = "Y",
            productcategory_id = 10
        )
        cart.addProduct(expensiveProduct, TestFixtures.TAX_CACHE)

        assertEquals(9999.99, cart.subTotalAmount, 0.01)
        assertEquals(1500.0, cart.taxTotalAmount, 0.01)
        assertEquals(11499.99, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun smallQuantity_largePrice_10percentTax() {
        val expensiveProduct = Product(
            product_id = 231,
            name = "Premium Item",
            sellingprice = 50000.0,
            costprice = 20000.0,
            tax_id = 2, // 10%
            istaxincluded = "N",
            isactive = "Y",
            productcategory_id = 10
        )
        cart.addProduct(expensiveProduct, TestFixtures.TAX_CACHE)

        assertEquals(50000.0, cart.subTotalAmount, 0.01)
        assertEquals(5000.0, cart.taxTotalAmount, 0.01)
        assertEquals(55000.0, cart.grandTotalAmount, 0.01)
    }

    // ========== TAX RATE CHANGE ON LINE ==========

    @Test
    fun taxRateChange_updatesCorrectly() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE) // 15% -> 30 tax
        val lineNo = cart.cartItems.keys.first()

        // Change from 15% to 10%
        cart.updateTax(lineNo, TestFixtures.TAX_VAT_10)

        assertEquals(200.0, cart.subTotalAmount, 0.01)
        assertEquals(20.0, cart.taxTotalAmount, 0.01)
        assertEquals(220.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun taxRateChange_toZero() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE) // 15% -> 30 tax
        val lineNo = cart.cartItems.keys.first()

        cart.updateTax(lineNo, TestFixtures.TAX_ZERO)

        assertEquals(200.0, cart.subTotalAmount, 0.01)
        assertEquals(0.0, cart.taxTotalAmount, 0.01)
        assertEquals(200.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun taxRateChange_toNull() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE) // 15% -> 30 tax
        val lineNo = cart.cartItems.keys.first()

        cart.updateTax(lineNo, null)

        assertEquals(200.0, cart.subTotalAmount, 0.01)
        assertEquals(0.0, cart.taxTotalAmount, 0.01)
        assertEquals(200.0, cart.grandTotalAmount, 0.01)
    }
}
