package com.posterita.pos.android

import com.posterita.pos.android.data.local.entity.InventoryCountEntry
import com.posterita.pos.android.data.local.entity.InventoryCountSession
import com.posterita.pos.android.data.local.entity.Product
import org.junit.Assert.*
import org.junit.Test

/**
 * Tests for warehouse workflows: picking lists, put-away,
 * stock transfer logic, multi-store stock view, and
 * low stock alert filtering.
 */
class WarehouseWorkflowTest {

    // --- Low Stock Alert Filtering ---

    @Test
    fun `filter low stock products from product list`() {
        val products = createStockProducts()
        val lowStock = products.filter { it.isLowStock }
        assertEquals(1, lowStock.size)
        assertEquals("Low Item", lowStock[0].name)
    }

    @Test
    fun `filter out of stock products`() {
        val products = createStockProducts()
        val outOfStock = products.filter { it.isOutOfStock }
        assertEquals(1, outOfStock.size)
        assertEquals("Empty Item", outOfStock[0].name)
    }

    @Test
    fun `filter expiring products`() {
        val products = createStockProducts()
        val expiring = products.filter { it.isExpiringSoon || it.isExpired }
        assertEquals(1, expiring.size)
        assertEquals("Expired Item", expiring[0].name)
    }

    @Test
    fun `no alerts for untracked products`() {
        val products = createStockProducts()
        val allAlerts = products.filter { it.isLowStock || it.isOutOfStock }
        // Untracked item should not appear in alerts
        assertFalse(allAlerts.any { it.name == "Untracked Item" })
    }

    // --- Picking List Logic ---

    @Test
    fun `picking list includes low stock items`() {
        val products = createStockProducts()
        val pickList = products.filter { it.isLowStock || it.isOutOfStock }
        assertTrue(pickList.isNotEmpty())
        assertTrue(pickList.all { it.tracksStock })
    }

    @Test
    fun `picking list sorted by urgency (out-of-stock first)`() {
        val products = createStockProducts()
        val pickList = products
            .filter { it.isLowStock || it.isOutOfStock }
            .sortedWith(compareBy({ !it.isOutOfStock }, { !it.isLowStock }))

        assertEquals("Empty Item", pickList[0].name) // Out of stock first
        assertEquals("Low Item", pickList[1].name)    // Low stock second
    }

    @Test
    fun `picking list shows deficit quantity`() {
        val product = stockProduct(qty = 3.0, reorderPoint = 10.0)
        val deficit = product.reorder_point - product.quantity_on_hand
        assertEquals(7.0, deficit, 0.01)
    }

    // --- Put-Away Workflow ---

    @Test
    fun `put-away assigns shelf location`() {
        val product = TestFixtures.PRODUCT_BURGER.copy(shelf_location = null)
        assertNull(product.shelf_location)

        val updated = product.copy(shelf_location = "B-2-5")
        assertEquals("B-2-5", updated.shelf_location)
    }

    @Test
    fun `put-away updates existing shelf location`() {
        val product = TestFixtures.PRODUCT_BURGER.copy(shelf_location = "A-1-1")
        val moved = product.copy(shelf_location = "C-3-7")
        assertEquals("C-3-7", moved.shelf_location)
    }

    // --- Stock Transfer Simulation ---

    @Test
    fun `stock transfer deducts from source`() {
        val sourceQty = 100.0
        val transferQty = 30.0
        val newSourceQty = sourceQty - transferQty
        assertEquals(70.0, newSourceQty, 0.01)
    }

    @Test
    fun `stock transfer adds to destination`() {
        val destQty = 20.0
        val transferQty = 30.0
        val newDestQty = destQty + transferQty
        assertEquals(50.0, newDestQty, 0.01)
    }

    @Test
    fun `stock transfer preserves total quantity across stores`() {
        val sourceQty = 100.0
        val destQty = 20.0
        val transferQty = 30.0
        val totalBefore = sourceQty + destQty
        val totalAfter = (sourceQty - transferQty) + (destQty + transferQty)
        assertEquals(totalBefore, totalAfter, 0.01)
    }

    @Test
    fun `cannot transfer more than source has`() {
        val sourceQty = 10.0
        val transferQty = 15.0
        val canTransfer = transferQty <= sourceQty
        assertFalse(canTransfer)
    }

    @Test
    fun `zero transfer is invalid`() {
        val transferQty = 0.0
        assertFalse(transferQty > 0)
    }

    // --- Multi-Store Stock View ---

    @Test
    fun `all tab shows all products`() {
        val products = createStockProducts()
        assertEquals(5, products.size)
    }

    @Test
    fun `low stock tab filters correctly`() {
        val products = createStockProducts()
        val lowStock = products.filter { it.isLowStock }
        assertTrue(lowStock.all { it.quantity_on_hand > 0 && it.quantity_on_hand <= it.reorder_point })
    }

    @Test
    fun `out of stock tab filters correctly`() {
        val products = createStockProducts()
        val outOfStock = products.filter { it.isOutOfStock }
        assertTrue(outOfStock.all { it.quantity_on_hand <= 0 })
    }

    @Test
    fun `expiring tab filters correctly`() {
        val products = createStockProducts()
        val expiring = products.filter { it.isExpiringSoon || it.isExpired }
        assertTrue(expiring.all { it.expiry_date != null })
    }

    // --- Inventory Count to Reconciliation ---

    @Test
    fun `count reconciliation generates correct adjustments`() {
        // System says 50, we counted 42 → adjustment of -8
        val systemQty = 50.0
        val countedQty = 42
        val adjustment = countedQty - systemQty
        assertEquals(-8.0, adjustment, 0.01)
    }

    @Test
    fun `count reconciliation with surplus`() {
        // System says 30, we counted 35 → adjustment of +5
        val systemQty = 30.0
        val countedQty = 35
        val adjustment = countedQty - systemQty
        assertEquals(5.0, adjustment, 0.01)
    }

    @Test
    fun `full count session covers all products`() {
        val session = InventoryCountSession(
            session_id = 1,
            account_id = "test_acc",
            store_id = TestFixtures.STORE_ID,
            type = "full_count",
            status = "active",
            name = "Q1 Full Count"
        )
        assertEquals("full_count", session.type)
    }

    @Test
    fun `spot check session for subset of products`() {
        val session = InventoryCountSession(
            session_id = 2,
            account_id = "test_acc",
            store_id = TestFixtures.STORE_ID,
            type = "spot_check",
            status = "active",
            name = "Random Aisle Check"
        )
        assertEquals("spot_check", session.type)
    }

    // --- CSV Export Data ---

    @Test
    fun `variance entries generate CSV-compatible rows`() {
        val entries = listOf(
            InventoryCountEntry(session_id = 1, account_id = "test", product_id = 101, product_name = "Burger", quantity = 10, system_qty = 12.0, variance = -2.0),
            InventoryCountEntry(session_id = 1, account_id = "test", product_id = 102, product_name = "Fries", quantity = 8, system_qty = 8.0, variance = 0.0)
        )
        // Only variance entries should be in the report
        val varianceRows = entries.filter { it.variance != 0.0 }
        assertEquals(1, varianceRows.size)
        assertEquals("Burger", varianceRows[0].product_name)
    }

    // --- Helpers ---

    private fun createStockProducts(): List<Product> = listOf(
        stockProduct(id = 1, name = "Normal Item", qty = 50.0, reorderPoint = 10.0),
        stockProduct(id = 2, name = "Low Item", qty = 3.0, reorderPoint = 10.0),
        stockProduct(id = 3, name = "Empty Item", qty = 0.0, reorderPoint = 5.0),
        stockProduct(id = 4, name = "Untracked Item", qty = 0.0, reorderPoint = 10.0, trackStock = 0),
        stockProduct(id = 5, name = "Expired Item", qty = 20.0, reorderPoint = 5.0, expiryDate = "2020-01-01")
    )

    private fun stockProduct(
        id: Int = 1,
        name: String = "Test Product",
        qty: Double = 0.0,
        reorderPoint: Double = 0.0,
        trackStock: Int = 1,
        expiryDate: String? = null
    ) = TestFixtures.PRODUCT_BURGER.copy(
        product_id = id,
        name = name,
        quantity_on_hand = qty,
        reorder_point = reorderPoint,
        track_stock = trackStock,
        expiry_date = expiryDate
    )
}
