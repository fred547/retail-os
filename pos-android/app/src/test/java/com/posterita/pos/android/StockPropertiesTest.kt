package com.posterita.pos.android

import com.posterita.pos.android.data.local.entity.Product
import org.junit.Assert.*
import org.junit.Test
import java.text.SimpleDateFormat
import java.util.*

/**
 * Tests for Product stock-related computed properties:
 * tracksStock, isLowStock, isOutOfStock, isExpired, isExpiringSoon,
 * and warehouse fields (shelf_location, batch_number, expiry_date).
 */
class StockPropertiesTest {

    // --- tracksStock ---

    @Test
    fun `tracksStock true when track_stock is 1`() {
        val product = stockProduct(trackStock = 1)
        assertTrue(product.tracksStock)
    }

    @Test
    fun `tracksStock false when track_stock is 0`() {
        val product = stockProduct(trackStock = 0)
        assertFalse(product.tracksStock)
    }

    // --- isOutOfStock ---

    @Test
    fun `isOutOfStock when qty is 0 and tracks stock`() {
        val product = stockProduct(qty = 0.0, trackStock = 1)
        assertTrue(product.isOutOfStock)
    }

    @Test
    fun `isOutOfStock when qty is negative`() {
        val product = stockProduct(qty = -5.0, trackStock = 1)
        assertTrue(product.isOutOfStock)
    }

    @Test
    fun `not isOutOfStock when qty is positive`() {
        val product = stockProduct(qty = 10.0, trackStock = 1)
        assertFalse(product.isOutOfStock)
    }

    @Test
    fun `not isOutOfStock when stock not tracked`() {
        val product = stockProduct(qty = 0.0, trackStock = 0)
        assertFalse(product.isOutOfStock)
    }

    // --- isLowStock ---

    @Test
    fun `isLowStock when qty below reorder point`() {
        val product = stockProduct(qty = 3.0, reorderPoint = 5.0, trackStock = 1)
        assertTrue(product.isLowStock)
    }

    @Test
    fun `isLowStock when qty equals reorder point`() {
        val product = stockProduct(qty = 5.0, reorderPoint = 5.0, trackStock = 1)
        assertTrue(product.isLowStock)
    }

    @Test
    fun `not isLowStock when qty above reorder point`() {
        val product = stockProduct(qty = 50.0, reorderPoint = 5.0, trackStock = 1)
        assertFalse(product.isLowStock)
    }

    @Test
    fun `not isLowStock when qty is zero (that is out of stock instead)`() {
        val product = stockProduct(qty = 0.0, reorderPoint = 5.0, trackStock = 1)
        assertFalse(product.isLowStock) // isOutOfStock takes precedence
    }

    @Test
    fun `not isLowStock when stock not tracked`() {
        val product = stockProduct(qty = 1.0, reorderPoint = 5.0, trackStock = 0)
        assertFalse(product.isLowStock)
    }

    @Test
    fun `not isLowStock when reorder point is zero`() {
        val product = stockProduct(qty = 10.0, reorderPoint = 0.0, trackStock = 1)
        assertFalse(product.isLowStock)
    }

    // --- isLowStock and isOutOfStock are mutually exclusive ---

    @Test
    fun `out of stock and low stock are mutually exclusive`() {
        // Out of stock
        val outOfStock = stockProduct(qty = 0.0, reorderPoint = 5.0, trackStock = 1)
        assertTrue(outOfStock.isOutOfStock)
        assertFalse(outOfStock.isLowStock)

        // Low stock
        val lowStock = stockProduct(qty = 3.0, reorderPoint = 5.0, trackStock = 1)
        assertFalse(lowStock.isOutOfStock)
        assertTrue(lowStock.isLowStock)

        // Normal stock
        val normal = stockProduct(qty = 50.0, reorderPoint = 5.0, trackStock = 1)
        assertFalse(normal.isOutOfStock)
        assertFalse(normal.isLowStock)
    }

    // --- isExpired ---

    @Test
    fun `isExpired when expiry is in the past`() {
        val product = stockProduct(expiryDate = "2020-01-01")
        assertTrue(product.isExpired)
    }

    @Test
    fun `not isExpired when expiry is far in the future`() {
        val product = stockProduct(expiryDate = "2099-12-31")
        assertFalse(product.isExpired)
    }

    @Test
    fun `not isExpired when no expiry date`() {
        val product = stockProduct(expiryDate = null)
        assertFalse(product.isExpired)
    }

    // --- isExpiringSoon ---

    @Test
    fun `isExpiringSoon when expiry is within 30 days`() {
        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_YEAR, 15) // 15 days from now
        val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)
        val product = stockProduct(expiryDate = dateStr)
        assertTrue(product.isExpiringSoon)
    }

    @Test
    fun `not isExpiringSoon when expiry is beyond 30 days`() {
        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_YEAR, 60) // 60 days from now
        val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)
        val product = stockProduct(expiryDate = dateStr)
        assertFalse(product.isExpiringSoon)
    }

    @Test
    fun `not isExpiringSoon when no expiry date`() {
        val product = stockProduct(expiryDate = null)
        assertFalse(product.isExpiringSoon)
    }

    @Test
    fun `isExpiringSoon today is included`() {
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        val product = stockProduct(expiryDate = today)
        assertTrue(product.isExpiringSoon)
    }

    @Test
    fun `isExpiringSoon at exactly 30 days is included`() {
        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_YEAR, 30)
        val dateStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)
        val product = stockProduct(expiryDate = dateStr)
        assertTrue(product.isExpiringSoon)
    }

    // --- Warehouse Fields ---

    @Test
    fun `shelf location stored`() {
        val product = stockProduct(shelfLocation = "A-3-2")
        assertEquals("A-3-2", product.shelf_location)
    }

    @Test
    fun `batch number stored`() {
        val product = stockProduct(batchNumber = "BATCH-2026-Q1")
        assertEquals("BATCH-2026-Q1", product.batch_number)
    }

    @Test
    fun `shelf location null by default`() {
        val product = stockProduct()
        assertNull(product.shelf_location)
    }

    @Test
    fun `batch number null by default`() {
        val product = stockProduct()
        assertNull(product.batch_number)
    }

    // --- Stock Display on POS Grid ---

    @Test
    fun `product with plenty of stock shows normal`() {
        val product = stockProduct(qty = 100.0, reorderPoint = 10.0, trackStock = 1)
        assertFalse(product.isLowStock)
        assertFalse(product.isOutOfStock)
    }

    @Test
    fun `untracked product never shows stock alerts`() {
        val product = stockProduct(qty = 0.0, reorderPoint = 100.0, trackStock = 0, expiryDate = "2020-01-01")
        assertFalse(product.isOutOfStock)
        assertFalse(product.isLowStock)
        // Note: isExpired still works independently of track_stock
        assertTrue(product.isExpired)
    }

    // --- Cart integration with stock validation ---

    @Test
    fun `adding out of stock product to cart still works (warning only)`() {
        val product = TestFixtures.PRODUCT_BURGER.copy(quantity_on_hand = 0.0, track_stock = 1)
        assertTrue(product.isOutOfStock)

        // Cart should still accept the product (offline-first, warning only)
        val cart = TestFixtures.newCart()
        cart.addProduct(product, TestFixtures.TAX_CACHE)
        assertEquals(1, cart.getItemCount())
    }

    @Test
    fun `product qty map tracks added quantities for stock check`() {
        val cart = TestFixtures.newCart()
        val product = TestFixtures.PRODUCT_BURGER.copy(quantity_on_hand = 5.0, track_stock = 1)

        cart.addProduct(product, TestFixtures.TAX_CACHE)
        cart.addProduct(product, TestFixtures.TAX_CACHE) // qty = 2

        assertEquals(2.0, cart.productQtyMap[product.product_id]!!, 0.01)
    }

    // --- Edge Cases ---

    @Test
    fun `expiry date with time component still works`() {
        val product = stockProduct(expiryDate = "2020-01-01T23:59:59Z")
        assertTrue(product.isExpired) // substring(0,10) = "2020-01-01"
    }

    @Test
    fun `malformed expiry date does not crash`() {
        val product = stockProduct(expiryDate = "bad-date")
        // Should not throw, just return false
        assertFalse(product.isExpired)
        assertFalse(product.isExpiringSoon)
    }

    // --- Helpers ---

    private fun stockProduct(
        qty: Double = 0.0,
        reorderPoint: Double = 0.0,
        trackStock: Int = 1,
        shelfLocation: String? = null,
        batchNumber: String? = null,
        expiryDate: String? = null
    ) = TestFixtures.PRODUCT_BURGER.copy(
        quantity_on_hand = qty,
        reorder_point = reorderPoint,
        track_stock = trackStock,
        shelf_location = shelfLocation,
        batch_number = batchNumber,
        expiry_date = expiryDate
    )
}
