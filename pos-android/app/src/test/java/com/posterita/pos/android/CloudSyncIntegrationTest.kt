package com.posterita.pos.android

import com.google.gson.Gson
import com.posterita.pos.android.data.remote.model.request.*
import com.posterita.pos.android.data.remote.model.response.CloudSyncResponse
import org.junit.Assert.*
import org.junit.Test

/**
 * Integration tests verifying end-to-end data flow:
 * Android creates data -> serializes to JSON -> server would deserialize ->
 * server responds -> Android deserializes response.
 *
 * These tests validate the full round-trip WITHOUT network calls.
 */
class CloudSyncIntegrationTest {

    private val gson = Gson()

    @Test
    fun `full order sync round-trip preserves all financial data`() {
        // 1. Create a realistic order
        val order = SyncOrder(
            orderId = 42,
            customerId = 5,
            salesRepId = 2,
            tillId = 100,
            terminalId = 1,
            storeId = 1,
            orderType = "dine_in",
            documentNo = "POS-042",
            docStatus = "CO",
            isPaid = true,
            taxTotal = 34.50,
            grandTotal = 264.50,
            qtyTotal = 4.0,
            dateOrdered = "2024-03-15T12:30:00.000Z",
            uuid = "550e8400-e29b-41d4-a716-446655440000",
            currency = "MUR",
            tips = 15.0,
            note = "Birthday celebration"
        )

        // 2. Serialize to JSON (what Android sends)
        val orderJson = gson.toJson(order)

        // 3. Deserialize back (simulating what happens after network transit)
        val restored = gson.fromJson(orderJson, SyncOrder::class.java)

        // 4. Verify every field survived
        assertEquals(42, restored.orderId)
        assertEquals(5, restored.customerId)
        assertEquals(2, restored.salesRepId)
        assertEquals(100, restored.tillId)
        assertEquals("dine_in", restored.orderType)
        assertEquals("POS-042", restored.documentNo)
        assertEquals("CO", restored.docStatus)
        assertTrue(restored.isPaid)
        assertEquals(34.50, restored.taxTotal, 0.001)
        assertEquals(264.50, restored.grandTotal, 0.001)
        assertEquals(4.0, restored.qtyTotal, 0.001)
        assertEquals(15.0, restored.tips, 0.001)
        assertEquals("Birthday celebration", restored.note)
        assertEquals("550e8400-e29b-41d4-a716-446655440000", restored.uuid)
    }

    @Test
    fun `full till sync round-trip preserves all financial data`() {
        val till = SyncTill(
            tillId = 100,
            storeId = 1,
            terminalId = 1,
            openBy = 1,
            closeBy = 1,
            openingAmt = 500.0,
            closingAmt = 2750.0,
            dateOpened = "2024-03-15T08:00:00.000Z",
            dateClosed = "2024-03-15T22:00:00.000Z",
            uuid = "till-uuid-100",
            documentNo = "TILL-100",
            vouchers = "V001,V002",
            adjustmentTotal = 100.0,
            cashAmt = 1500.0,
            cardAmt = 1150.0,
            subtotal = 2400.0,
            taxTotal = 350.0,
            grandTotal = 2750.0,
            forexCurrency = "EUR",
            forexAmt = 50.0
        )

        val json = gson.toJson(till)
        val restored = gson.fromJson(json, SyncTill::class.java)

        assertEquals(100, restored.tillId)
        assertEquals(500.0, restored.openingAmt, 0.001)
        assertEquals(2750.0, restored.closingAmt, 0.001)
        assertEquals(100.0, restored.adjustmentTotal, 0.001)
        assertEquals(1500.0, restored.cashAmt, 0.001)
        assertEquals(1150.0, restored.cardAmt, 0.001)
        assertEquals(2400.0, restored.subtotal, 0.001)
        assertEquals(350.0, restored.taxTotal, 0.001)
        assertEquals(2750.0, restored.grandTotal, 0.001)
        assertEquals("EUR", restored.forexCurrency)
        assertEquals(50.0, restored.forexAmt, 0.001)
    }

    @Test
    fun `full sync request with orders, lines, payments, and tills`() {
        val request = CloudSyncRequest(
            accountId = "ACC-001",
            terminalId = 1,
            storeId = 1,
            lastSyncAt = "2024-03-15T00:00:00.000Z",
            orders = listOf(
                SyncOrder(orderId = 1, grandTotal = 230.0, uuid = "o-1", isPaid = true),
                SyncOrder(orderId = 2, grandTotal = 150.0, uuid = "o-2", isPaid = true)
            ),
            orderLines = listOf(
                SyncOrderLine(orderLineId = 1, orderId = 1, productId = 101, qtyEntered = 2.0, lineAmt = 400.0),
                SyncOrderLine(orderLineId = 2, orderId = 1, productId = 102, qtyEntered = 1.0, lineAmt = 75.0),
                SyncOrderLine(orderLineId = 3, orderId = 2, productId = 103, qtyEntered = 3.0, lineAmt = 150.0)
            ),
            payments = listOf(
                SyncPayment(paymentId = 1, orderId = 1, amount = 230.0, paymentType = "CASH"),
                SyncPayment(paymentId = 2, orderId = 2, amount = 150.0, paymentType = "CARD")
            ),
            tills = listOf(
                SyncTill(tillId = 100, uuid = "t-1", grandTotal = 380.0, cashAmt = 230.0, cardAmt = 150.0)
            )
        )

        val json = gson.toJson(request)
        val restored = gson.fromJson(json, CloudSyncRequest::class.java)

        assertEquals("ACC-001", restored.accountId)
        assertEquals(2, restored.orders?.size)
        assertEquals(3, restored.orderLines?.size)
        assertEquals(2, restored.payments?.size)
        assertEquals(1, restored.tills?.size)

        // Verify line-order relationships
        val linesForOrder1 = restored.orderLines?.filter { it.orderId == 1 }
        assertEquals(2, linesForOrder1?.size)
    }

    @Test
    fun `sync response with pulled data deserializes all entity types`() {
        val responseJson = """
        {
            "success": true,
            "server_time": "2024-03-15T22:00:00.000Z",
            "products": [
                {"product_id": 101, "name": "Burger", "sellingprice": 200.0, "tax_id": 1, "isactive": "Y", "istaxincluded": "N"}
            ],
            "product_categories": [
                {"productcategory_id": 10, "name": "Food", "isactive": "Y", "position": 0}
            ],
            "taxes": [
                {"tax_id": 1, "name": "VAT 15%", "rate": 15.0, "isactive": "Y"}
            ],
            "modifiers": [
                {"modifier_id": 1, "name": "Extra Cheese", "sellingprice": 25.0, "product_id": 101}
            ],
            "customers": [
                {"customer_id": 1, "name": "John Doe", "phone1": "+23012345678", "isactive": "Y"}
            ],
            "users": [
                {"user_id": 1, "username": "admin", "firstname": "Admin", "role": "owner", "isactive": "Y"}
            ],
            "discount_codes": [
                {"discountcode_id": 1, "name": "10% OFF", "percentage": 10.0, "isactive": "Y"}
            ],
            "preferences": [
                {"preference_id": 1, "showreceiptlogo": "Y", "opencashdrawer": "Y"}
            ],
            "restaurant_tables": [
                {"table_id": 1, "table_name": "Table 1", "store_id": 1, "seats": 4, "is_occupied": false}
            ],
            "stores": [
                {"store_id": 1, "name": "Main Store", "currency": "MUR"}
            ],
            "terminals": [
                {"terminal_id": 1, "name": "POS-1", "store_id": 1}
            ],
            "orders_synced": 2,
            "order_lines_synced": 3,
            "payments_synced": 2,
            "tills_synced": 1,
            "errors": []
        }
        """.trimIndent()

        val response = gson.fromJson(responseJson, CloudSyncResponse::class.java)

        assertTrue(response.success)
        assertEquals(1, response.products?.size)
        assertEquals(1, response.productCategories?.size)
        assertEquals(1, response.taxes?.size)
        assertEquals(1, response.modifiers?.size)
        assertEquals(1, response.customers?.size)
        assertEquals(1, response.users?.size)
        assertEquals(1, response.discountCodes?.size)
        assertEquals(1, response.preferences?.size)
        assertEquals(1, response.restaurantTables?.size)
        assertEquals(1, response.stores?.size)
        assertEquals(1, response.terminals?.size)
        assertEquals(2, response.ordersSynced)
        assertEquals(3, response.orderLinesSynced)

        // Verify product fields are accessible from the map
        val product = response.products!![0]
        assertEquals(101.0, (product["product_id"] as Number).toDouble(), 0.001)
        assertEquals("Burger", product["name"])
        assertEquals(200.0, (product["sellingprice"] as Number).toDouble(), 0.001)
    }

    @Test
    fun `refund order with negative amounts round-trips correctly`() {
        val refundOrder = SyncOrder(
            orderId = 99,
            grandTotal = -230.0,
            taxTotal = -30.0,
            qtyTotal = -2.0,
            tips = 0.0,
            docStatus = "VO",
            isPaid = true,
            uuid = "refund-uuid-1"
        )

        val json = gson.toJson(refundOrder)
        val restored = gson.fromJson(json, SyncOrder::class.java)

        assertEquals(-230.0, restored.grandTotal, 0.001)
        assertEquals(-30.0, restored.taxTotal, 0.001)
        assertEquals(-2.0, restored.qtyTotal, 0.001)
        assertEquals(0.0, restored.tips, 0.001)
    }

    @Test
    fun `sync request with zero-amount till preserves zeros`() {
        // Opening a till with $0 float is valid
        val till = SyncTill(
            tillId = 200,
            openingAmt = 0.0,
            closingAmt = 0.0,
            cashAmt = 0.0,
            cardAmt = 0.0,
            subtotal = 0.0,
            taxTotal = 0.0,
            grandTotal = 0.0,
            adjustmentTotal = 0.0,
            forexAmt = 0.0,
            uuid = "empty-till-uuid"
        )

        val json = gson.toJson(till)
        val restored = gson.fromJson(json, SyncTill::class.java)

        assertEquals(0.0, restored.openingAmt, 0.001)
        assertEquals(0.0, restored.closingAmt, 0.001)
        assertEquals(0.0, restored.cashAmt, 0.001)
        assertEquals(0.0, restored.grandTotal, 0.001)
    }
}
