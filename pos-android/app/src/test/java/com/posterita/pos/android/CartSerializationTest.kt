package com.posterita.pos.android

import com.posterita.pos.android.data.local.dao.ProductDao
import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.local.entity.Tax
import com.posterita.pos.android.domain.model.CartItem
import com.posterita.pos.android.domain.model.ShoppingCart
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Regression tests for CartItem.toJson() / ShoppingCart.toJson() / restoreFromJson().
 *
 * These tests verify the JSON serialization round-trip is lossless:
 *   cart -> toJson() -> restoreFromJson() -> identical cart state
 *
 * Covers Sprint 2 fix: centralized JSON serialization preserving modifiers,
 * notes, discounts, orderType, tips, and all item fields.
 */
@RunWith(RobolectricTestRunner::class)
class CartSerializationTest {

    private lateinit var cart: ShoppingCart
    private lateinit var mockProductDao: FakeProductDao

    @Before
    fun setUp() {
        cart = TestFixtures.newCart()
        mockProductDao = FakeProductDao(TestFixtures.ALL_PRODUCTS)
    }

    // ========== CartItem.toJson() ==========

    @Test
    fun cartItem_toJson_containsAllRequiredFields() {
        val item = TestFixtures.cartItem(
            TestFixtures.PRODUCT_BURGER,
            lineNo = "1",
            qty = 2.0,
            modifiers = "Extra Cheese, No Pickles",
            note = "Well done"
        )

        val json = item.toJson()

        assertEquals(101, json.getInt("product_id"))
        assertEquals("Classic Burger", json.getString("product_name"))
        assertEquals(2.0, json.getDouble("qty"), 0.01)
        assertEquals(200.0, json.getDouble("price"), 0.01)
        assertEquals("1", json.getString("lineNo"))
        assertEquals("Extra Cheese, No Pickles", json.getString("modifiers"))
        assertEquals("Well done", json.getString("note"))
        // Verify computed fields
        assertTrue(json.getDouble("taxAmt") > 0)
        assertTrue(json.getDouble("lineAmt") > 0)
        assertTrue(json.getDouble("lineNetAmt") > 0)
    }

    @Test
    fun cartItem_toJson_handlesNullModifiersAndNote() {
        val item = TestFixtures.cartItem(TestFixtures.PRODUCT_COLA)

        val json = item.toJson()

        assertEquals("", json.getString("modifiers"))
        assertEquals("", json.getString("note"))
    }

    @Test
    fun cartItem_toJson_preservesDiscountAmount() {
        val item = TestFixtures.cartItem(
            TestFixtures.PRODUCT_BURGER,
            discount = 10.0  // 10% discount
        )

        val json = item.toJson()

        assertTrue(json.getDouble("discountAmt") > 0)
        // 200 * 10% = 20 discount
        assertEquals(20.0, json.getDouble("discountAmt"), 0.01)
    }

    // ========== ShoppingCart.toJson() ==========

    @Test
    fun cart_toJson_containsAllItems() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_COLA, TestFixtures.TAX_CACHE)

        val json = cart.toJson()
        val items = json.getJSONArray("items")

        assertEquals(3, items.length())
    }

    @Test
    fun cart_toJson_preservesNote() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.note = "Birthday celebration"

        val json = cart.toJson()

        assertEquals("Birthday celebration", json.getString("note"))
    }

    @Test
    fun cart_toJson_preservesOrderType() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.orderType = "take_away"

        val json = cart.toJson()

        assertEquals("take_away", json.getString("orderType"))
    }

    @Test
    fun cart_toJson_preservesTips() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.tipsAmount = 25.0
        cart.tipsPercentage = 10.0

        val json = cart.toJson()

        assertEquals(25.0, json.getDouble("tipsAmount"), 0.01)
        assertEquals(10.0, json.getDouble("tipsPercentage"), 0.01)
    }

    @Test
    fun cart_toJson_preservesDiscountOnTotal() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.discountOnTotalPercentage = 15.0
        cart.discountOnTotalAmount = 30.0

        val json = cart.toJson()

        assertEquals(15.0, json.getDouble("discountOnTotalPercentage"), 0.01)
        assertEquals(30.0, json.getDouble("discountOnTotalAmount"), 0.01)
    }

    @Test
    fun cart_toJson_preservesGrandTotal() {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE) // 200 + 30 = 230
        cart.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE)  // 75 + 11.25 = 86.25

        val json = cart.toJson()

        assertEquals(cart.grandTotalAmount, json.getDouble("grandtotal"), 0.01)
    }

    // ========== Round-trip: toJson() -> restoreFromJson() ==========

    @Test
    fun roundTrip_singleItemCart() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        val originalTotal = cart.grandTotalAmount
        val originalSubTotal = cart.subTotalAmount
        val originalTax = cart.taxTotalAmount

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertEquals(1, restored.getItemCount())
        assertEquals(originalTotal, restored.grandTotalAmount, 0.01)
        assertEquals(originalSubTotal, restored.subTotalAmount, 0.01)
        assertEquals(originalTax, restored.taxTotalAmount, 0.01)
    }

    @Test
    fun roundTrip_multiItemCart() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_FRIES, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_COLA, TestFixtures.TAX_CACHE)
        val originalItemCount = cart.getItemCount()
        val originalTotal = cart.grandTotalAmount

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertEquals(originalItemCount, restored.getItemCount())
        assertEquals(originalTotal, restored.grandTotalAmount, 0.01)
    }

    @Test
    fun roundTrip_preservesModifiersAndNotes() = runBlocking {
        val item = TestFixtures.cartItem(
            TestFixtures.PRODUCT_BURGER,
            lineNo = "1",
            qty = 1.0,
            modifiers = "Extra Cheese, Bacon",
            note = "Medium rare"
        )
        cart.addOrUpdateLine(item)

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        val restoredItem = restored.cartItems.values.first()
        assertEquals("Extra Cheese, Bacon", restoredItem.modifiers)
        assertEquals("Medium rare", restoredItem.note)
    }

    @Test
    fun roundTrip_preservesOrderNote() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.note = "VIP customer, extra care"

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertEquals("VIP customer, extra care", restored.note)
    }

    @Test
    fun roundTrip_preservesTakeAwayOrderType() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.orderType = "take_away"

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertEquals("take_away", restored.orderType)
    }

    @Test
    fun roundTrip_preservesTipsFields() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.tipsAmount = 50.0
        cart.tipsPercentage = 15.0

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertEquals(50.0, restored.tipsAmount, 0.01)
        assertEquals(15.0, restored.tipsPercentage, 0.01)
    }

    @Test
    fun roundTrip_preservesDiscountOnTotalPercentage() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)
        cart.discountOnTotalPercentage = 20.0
        cart.recalculateTotals()
        val discountedTotal = cart.grandTotalAmount

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertEquals(20.0, restored.discountOnTotalPercentage, 0.01)
        assertEquals(discountedTotal, restored.grandTotalAmount, 0.01)
    }

    @Test
    fun roundTrip_preservesDiscountOnTotalAmount() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_STEAK, TestFixtures.TAX_CACHE) // 500 + tax
        cart.discountOnTotalAmount = 50.0
        cart.recalculateTotals()
        val discountedTotal = cart.grandTotalAmount

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertEquals(50.0, restored.discountOnTotalAmount, 0.01)
        assertEquals(discountedTotal, restored.grandTotalAmount, 0.01)
    }

    @Test
    fun roundTrip_multipleQty() = runBlocking {
        cart.addProductWithQty(TestFixtures.PRODUCT_BURGER, 3.0, TestFixtures.TAX_CACHE)
        val originalQty = cart.totalQty

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertEquals(originalQty, restored.totalQty, 0.01)
        assertEquals(3.0, restored.cartItems.values.first().qty, 0.01)
    }

    @Test
    fun roundTrip_mixedTaxRates() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_BURGER, TestFixtures.TAX_CACHE)  // 15% tax
        cart.addProduct(TestFixtures.PRODUCT_TAX_10, TestFixtures.TAX_CACHE)  // 10% tax
        cart.addProduct(TestFixtures.PRODUCT_WATER, TestFixtures.TAX_CACHE)   // 0% tax
        val originalTax = cart.taxTotalAmount
        val originalTotal = cart.grandTotalAmount

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertEquals(originalTax, restored.taxTotalAmount, 0.01)
        assertEquals(originalTotal, restored.grandTotalAmount, 0.01)
    }

    @Test
    fun roundTrip_taxInclusiveProduct() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_TAX_INCLUSIVE, TestFixtures.TAX_CACHE) // 115 tax-inclusive
        val originalTotal = cart.grandTotalAmount
        val originalTax = cart.taxTotalAmount

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertEquals(originalTotal, restored.grandTotalAmount, 0.01)
        assertEquals(originalTax, restored.taxTotalAmount, 0.01)
    }

    @Test
    fun roundTrip_emptyCart() = runBlocking {
        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertTrue(restored.isEmpty())
        assertEquals(0.0, restored.grandTotalAmount, 0.01)
    }

    @Test
    fun roundTrip_customPriceProduct() = runBlocking {
        cart.addProductWithPrice(TestFixtures.PRODUCT_BURGER, 175.0, TestFixtures.TAX_CACHE)

        val json = cart.toJson()
        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        val restoredItem = restored.cartItems.values.first()
        assertEquals(175.0, restoredItem.priceEntered, 0.01)
    }

    @Test
    fun restoreFromJson_skipsUnknownProducts() = runBlocking {
        // Build JSON with a product ID that doesn't exist in the dao
        val json = JSONObject().apply {
            val items = org.json.JSONArray()
            items.put(JSONObject().apply {
                put("product_id", 999)  // non-existent
                put("qty", 1.0)
                put("price", 100.0)
                put("lineNo", "1")
            })
            items.put(JSONObject().apply {
                put("product_id", 101)  // exists (burger)
                put("qty", 1.0)
                put("price", 200.0)
                put("lineNo", "2")
            })
            put("items", items)
            put("orderType", "dine_in")
        }

        val restored = ShoppingCart()
        restored.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        // Only the valid product should be restored
        assertEquals(1, restored.getItemCount())
    }

    @Test
    fun restoreFromJson_clearsExistingCartFirst() = runBlocking {
        cart.addProduct(TestFixtures.PRODUCT_STEAK, TestFixtures.TAX_CACHE)
        cart.addProduct(TestFixtures.PRODUCT_WATER, TestFixtures.TAX_CACHE)
        assertEquals(2, cart.getItemCount())

        // Restore a cart with only 1 item
        val singleItemCart = TestFixtures.cartWith(TestFixtures.PRODUCT_BURGER)
        val json = singleItemCart.toJson()

        cart.restoreFromJson(json, mockProductDao, TestFixtures.TAX_CACHE)

        assertEquals(1, cart.getItemCount())
    }

    // ========== FakeProductDao (stub for unit tests) ==========

    /**
     * Simple in-memory ProductDao that returns products from a predefined list.
     * Only implements the methods needed by restoreFromJson().
     */
    class FakeProductDao(private val products: List<Product>) : ProductDao {
        override suspend fun insertProducts(products: List<Product>) {}
        override fun getProductById(productId: Int) = throw UnsupportedOperationException()
        override suspend fun getProductByIdSync(productId: Int): Product? =
            products.find { it.product_id == productId }
        override fun getAllProducts() = throw UnsupportedOperationException()
        override fun searchProductsByName(searchTerm: String) = throw UnsupportedOperationException()
        override suspend fun getProductByUpc(upc: String): Product? = null
        override fun getProductsByCategoryId(categoryId: Int) = throw UnsupportedOperationException()
        override fun searchProducts(searchTerm: String) = throw UnsupportedOperationException()
        override suspend fun getAllProductsSync(): List<Product> = products
        override suspend fun insertProduct(product: Product): Long = 0L
        override suspend fun updateProduct(product: Product) {}
        override suspend fun deleteProduct(product: Product) {}
        override suspend fun getMaxProductId(): Int? = products.maxOfOrNull { it.product_id }
        override suspend fun updateProductPrice(productId: Int, price: Double, taxAmount: Double, needsReview: String?, setByUserId: Int) {}
        override suspend fun getProductsNeedingPriceReview(): List<Product> = emptyList()
        override suspend fun countProductsNeedingPriceReview(): Int = 0
        override suspend fun clearPriceReviewFlag(productId: Int) {}
        override suspend fun clearAllPriceReviewFlags() {}
    }
}
