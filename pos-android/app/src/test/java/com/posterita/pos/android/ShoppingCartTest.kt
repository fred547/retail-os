package com.posterita.pos.android

import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.local.entity.Tax
import com.posterita.pos.android.domain.model.CartItem
import com.posterita.pos.android.domain.model.CartType
import com.posterita.pos.android.domain.model.ShoppingCart
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

class ShoppingCartTest {

    private lateinit var cart: ShoppingCart
    private lateinit var taxCache: Map<Int, Tax>

    private fun createProduct(
        id: Int = 1,
        name: String = "Product $id",
        sellingPrice: Double = 100.0,
        costPrice: Double = 50.0,
        taxId: Int = 1,
        isTaxIncluded: String? = "N"
    ) = Product(
        product_id = id,
        name = name,
        sellingprice = sellingPrice,
        costprice = costPrice,
        tax_id = taxId,
        istaxincluded = isTaxIncluded
    )

    private fun createTax(
        id: Int = 1,
        rate: Double = 15.0
    ) = Tax(tax_id = id, rate = rate, name = "VAT", taxcode = "VAT15")

    @Before
    fun setUp() {
        cart = ShoppingCart()
        taxCache = mapOf(1 to createTax(id = 1, rate = 15.0))
    }

    // === ADD PRODUCT ===

    @Test
    fun addProduct_newProduct_addsToCart() {
        val product = createProduct(id = 1)
        cart.addProduct(product, taxCache)

        assertEquals(1, cart.getItemCount())
        assertFalse(cart.isEmpty())
    }

    @Test
    fun addProduct_existingProduct_incrementsQty() {
        val product = createProduct(id = 1)
        cart.addProduct(product, taxCache)
        cart.addProduct(product, taxCache)

        assertEquals(1, cart.getItemCount())
        val item = cart.cartItems.values.first()
        assertEquals(2.0, item.qty, 0.01)
    }

    @Test
    fun addProduct_differentProducts_addsBothToCart() {
        cart.addProduct(createProduct(id = 1), taxCache)
        cart.addProduct(createProduct(id = 2), taxCache)

        assertEquals(2, cart.getItemCount())
    }

    // === ADD PRODUCT WITH QTY ===

    @Test
    fun addProductWithQty_addsWithSpecifiedQty() {
        val product = createProduct(id = 1)
        cart.addProductWithQty(product, 5.0, taxCache)

        assertEquals(1, cart.getItemCount())
        assertEquals(5.0, cart.totalQty, 0.01)
    }

    // === REMOVE PRODUCT ===

    @Test
    fun removeProduct_existingLine_removesFromCart() {
        val product = createProduct(id = 1)
        cart.addProduct(product, taxCache)
        val lineNo = cart.cartItems.keys.first()

        cart.removeProduct(lineNo)

        assertTrue(cart.isEmpty())
        assertEquals(0.0, cart.grandTotalAmount, 0.01)
    }

    @Test
    fun removeProduct_nonExistentLine_noEffect() {
        val product = createProduct(id = 1)
        cart.addProduct(product, taxCache)

        cart.removeProduct("999")

        assertEquals(1, cart.getItemCount())
    }

    // === UPDATE PRODUCT QTY ===

    @Test
    fun updateProductQty_validQty_updatesItem() {
        val product = createProduct(id = 1)
        cart.addProduct(product, taxCache)
        val lineNo = cart.cartItems.keys.first()

        cart.updateProductQty(lineNo, 5.0)

        assertEquals(5.0, cart.cartItems[lineNo]!!.qty, 0.01)
        assertEquals(5.0, cart.totalQty, 0.01)
    }

    @Test
    fun updateProductQty_zeroQty_removesItem() {
        val product = createProduct(id = 1)
        cart.addProduct(product, taxCache)
        val lineNo = cart.cartItems.keys.first()

        cart.updateProductQty(lineNo, 0.0)

        assertTrue(cart.isEmpty())
    }

    @Test
    fun updateProductQty_negativeQty_removesItem() {
        val product = createProduct(id = 1)
        cart.addProduct(product, taxCache)
        val lineNo = cart.cartItems.keys.first()

        cart.updateProductQty(lineNo, -1.0)

        assertTrue(cart.isEmpty())
    }

    // === INCREASE / DECREASE QTY ===

    @Test
    fun increaseQty_incrementsByOne() {
        val product = createProduct(id = 1)
        cart.addProduct(product, taxCache)
        val lineNo = cart.cartItems.keys.first()

        cart.increaseQty(lineNo)

        assertEquals(2.0, cart.cartItems[lineNo]!!.qty, 0.01)
    }

    @Test
    fun decreaseQty_moreThanOne_decrementsByOne() {
        val product = createProduct(id = 1)
        cart.addProduct(product, taxCache)
        val lineNo = cart.cartItems.keys.first()
        cart.increaseQty(lineNo) // now qty = 2

        cart.decreaseQty(lineNo)

        assertEquals(1.0, cart.cartItems[lineNo]!!.qty, 0.01)
    }

    @Test
    fun decreaseQty_atOne_removesItem() {
        val product = createProduct(id = 1)
        cart.addProduct(product, taxCache)
        val lineNo = cart.cartItems.keys.first()

        cart.decreaseQty(lineNo)

        assertTrue(cart.isEmpty())
    }

    // === SPLIT LINE ===

    @Test
    fun splitLine_splitsIntoTwo() {
        val product = createProduct(id = 1)
        cart.addProductWithQty(product, 5.0, taxCache)
        val lineNo = cart.cartItems.keys.first()

        cart.splitLine(lineNo, 2.0)

        assertEquals(2, cart.getItemCount())
        assertEquals(5.0, cart.totalQty, 0.01)
    }

    @Test
    fun splitLine_splitFullQty_noEffect() {
        val product = createProduct(id = 1)
        cart.addProductWithQty(product, 5.0, taxCache)
        val lineNo = cart.cartItems.keys.first()

        cart.splitLine(lineNo, 5.0)

        assertEquals(1, cart.getItemCount()) // Should not split
    }

    // === UPDATE PRICE ===

    @Test
    fun updatePrice_changesItemPrice() {
        val product = createProduct(id = 1, sellingPrice = 100.0)
        cart.addProduct(product, taxCache)
        val lineNo = cart.cartItems.keys.first()

        cart.updatePrice(lineNo, 50.0)

        assertEquals(50.0, cart.cartItems[lineNo]!!.priceEntered, 0.01)
    }

    // === CLEAR CART ===

    @Test
    fun clearCart_removesAllItems() {
        cart.addProduct(createProduct(id = 1), taxCache)
        cart.addProduct(createProduct(id = 2), taxCache)
        cart.note = "Test note"
        cart.tipsAmount = 10.0

        cart.clearCart()

        assertTrue(cart.isEmpty())
        assertEquals(0.0, cart.grandTotalAmount, 0.01)
        assertEquals(0.0, cart.totalQty, 0.01)
        assertEquals(0.0, cart.tipsAmount, 0.01)
        assertNull(cart.note)
    }

    // === RECALCULATE TOTALS ===

    @Test
    fun recalculateTotals_correctAggregation() {
        // Product 1: 100 + 15% tax = 115
        cart.addProduct(createProduct(id = 1, sellingPrice = 100.0), taxCache)
        // Product 2: 200 + 15% tax = 230
        cart.addProduct(createProduct(id = 2, sellingPrice = 200.0), taxCache)

        assertEquals(2.0, cart.totalQty, 0.01)
        assertEquals(300.0, cart.subTotalAmount, 0.01)   // 100 + 200
        assertEquals(45.0, cart.taxTotalAmount, 0.01)     // 15 + 30
        assertEquals(345.0, cart.grandTotalAmount, 0.01)  // 300 + 45
    }

    @Test
    fun recalculateTotals_afterRemovingItem() {
        cart.addProduct(createProduct(id = 1, sellingPrice = 100.0), taxCache)
        cart.addProduct(createProduct(id = 2, sellingPrice = 200.0), taxCache)
        val firstLineNo = cart.cartItems.keys.first()

        cart.removeProduct(firstLineNo)

        assertEquals(1.0, cart.totalQty, 0.01)
        assertEquals(200.0, cart.subTotalAmount, 0.01)
    }

    // === NEGATE FOR REFUND ===

    @Test
    fun negateForRefund_makesQtyNegative() {
        cart.addProduct(createProduct(id = 1, sellingPrice = 100.0), taxCache)
        cart.addProduct(createProduct(id = 2, sellingPrice = 50.0), taxCache)

        cart.negateForRefund()

        for (item in cart.cartItems.values) {
            assertTrue(item.qty < 0)
        }
        assertTrue(cart.totalQty < 0)
    }

    // === PRODUCT QTY MAP ===

    @Test
    fun productQtyMap_tracksQuantitiesByProductId() {
        val product = createProduct(id = 1)
        cart.addProduct(product, taxCache)
        cart.addProduct(product, taxCache) // qty = 2

        assertEquals(2.0, cart.productQtyMap[1] ?: 0.0, 0.01)
    }

    // === EMPTY / COUNT ===

    @Test
    fun isEmpty_emptyCart_true() {
        assertTrue(cart.isEmpty())
    }

    @Test
    fun isEmpty_nonEmptyCart_false() {
        cart.addProduct(createProduct(id = 1), taxCache)
        assertFalse(cart.isEmpty())
    }

    @Test
    fun getItemCount_returnsCorrectCount() {
        assertEquals(0, cart.getItemCount())
        cart.addProduct(createProduct(id = 1), taxCache)
        assertEquals(1, cart.getItemCount())
        cart.addProduct(createProduct(id = 2), taxCache)
        assertEquals(2, cart.getItemCount())
    }

    // === COST TOTAL ===

    @Test
    fun costTotal_aggregatesCostPrices() {
        // Product1: cost=50, qty=1 -> 50
        cart.addProduct(createProduct(id = 1, costPrice = 50.0), taxCache)
        // Product2: cost=30, qty=1 -> 30
        cart.addProduct(createProduct(id = 2, costPrice = 30.0), taxCache)

        assertEquals(80.0, cart.costTotalAmount, 0.01) // 50 + 30
    }

    // === REFUND CART TYPE ===

    @Test
    fun refundCart_increaseQty_limitedByInitialQty() {
        val refundCart = ShoppingCart(CartType.REFUND)
        val product = createProduct(id = 1)
        val item = CartItem(product = product, lineNo = "1", qty = 1.0, priceEntered = 100.0, initialQty = 2.0)
        item.updateTotals()
        refundCart.addOrUpdateLine(item)

        refundCart.increaseQty("1")

        assertEquals(2.0, refundCart.cartItems["1"]!!.qty, 0.01)

        // Should not go beyond initialQty
        refundCart.increaseQty("1")
        assertEquals(2.0, refundCart.cartItems["1"]!!.qty, 0.01)
    }

    // === ADD OR UPDATE LINE ===

    @Test
    fun addOrUpdateLine_addsNewLine() {
        val product = createProduct(id = 1)
        val item = CartItem(product = product, lineNo = "1", qty = 3.0, priceEntered = 100.0)
        item.updateTotals()

        cart.addOrUpdateLine(item)

        assertEquals(1, cart.getItemCount())
        assertEquals(3.0, cart.totalQty, 0.01)
    }

    @Test
    fun addOrUpdateLine_updatesExistingLine() {
        val product = createProduct(id = 1)
        cart.addProduct(product, taxCache)
        val lineNo = cart.cartItems.keys.first()
        val existingItem = cart.cartItems[lineNo]!!

        val updated = existingItem.copy(qty = 10.0)
        cart.addOrUpdateLine(updated)

        assertEquals(1, cart.getItemCount())
        assertEquals(10.0, cart.totalQty, 0.01)
    }

    // === REMOVE LINE ===

    @Test
    fun removeLine_removesItem() {
        cart.addProduct(createProduct(id = 1), taxCache)
        val lineNo = cart.cartItems.keys.first()

        cart.removeLine(lineNo)

        assertTrue(cart.isEmpty())
    }

    // === UPDATE TAX ===

    @Test
    fun updateTax_changesToNewTax() {
        cart.addProduct(createProduct(id = 1, sellingPrice = 100.0), taxCache)
        val lineNo = cart.cartItems.keys.first()

        val newTax = createTax(id = 2, rate = 20.0)
        cart.updateTax(lineNo, newTax)

        val item = cart.cartItems[lineNo]!!
        assertEquals(20.0, item.taxAmt, 0.01) // 100 * 20% = 20
    }

    @Test
    fun updateTax_removesTax() {
        cart.addProduct(createProduct(id = 1, sellingPrice = 100.0), taxCache)
        val lineNo = cart.cartItems.keys.first()

        cart.updateTax(lineNo, null)

        val item = cart.cartItems[lineNo]!!
        assertEquals(0.0, item.taxAmt, 0.01)
        assertEquals(100.0, item.lineNetAmt, 0.01) // No tax
    }

    // === ADD PRODUCT WITH PRICE ===

    @Test
    fun addProductWithPrice_usesCustomPrice() {
        val product = createProduct(id = 1, sellingPrice = 100.0)
        cart.addProductWithPrice(product, 75.0, taxCache)

        val item = cart.cartItems.values.first()
        assertEquals(75.0, item.priceEntered, 0.01)
    }
}
