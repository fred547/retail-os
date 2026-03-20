package com.posterita.pos.android

import com.google.gson.Gson
import com.posterita.pos.android.data.local.entity.*
import com.posterita.pos.android.data.remote.model.request.*
import com.posterita.pos.android.data.remote.model.response.CloudSyncResponse
import org.junit.Assert.*
import org.junit.Test

/**
 * Regression tests for cloud sync fixes.
 *
 * These tests verify that:
 * - Payment.orderId links payments to orders
 * - Order.subtotal is pushed in sync
 * - Payments are correctly mapped from entity to sync model
 * - Customers are correctly mapped from entity to sync model
 * - All new fields survive JSON round-trips
 * - Server response with stores/terminals is deserialized correctly
 */
class SyncRegressionTest {

    private val gson = Gson()

    // ======================== PAYMENT ENTITY ========================

    @Test
    fun `Payment entity includes orderId field`() {
        val payment = Payment(
            paymentId = 1,
            orderId = 42,
            documentNo = "POS-001",
            amount = 230.0,
            paymentType = "CASH"
        )
        assertEquals(42, payment.orderId)
    }

    @Test
    fun `Payment entity orderId defaults to zero`() {
        val payment = Payment(paymentId = 1)
        assertEquals(0, payment.orderId)
    }

    // ======================== ORDER SUBTOTAL ========================

    @Test
    fun `Order entity includes subtotal field`() {
        val order = Order(
            orderId = 1,
            subtotal = 200.0,
            taxTotal = 30.0,
            grandTotal = 230.0,
            uuid = "test-uuid"
        )
        assertEquals(200.0, order.subtotal, 0.01)
    }

    @Test
    fun `Order entity subtotal defaults to zero`() {
        val order = Order(orderId = 1)
        assertEquals(0.0, order.subtotal, 0.01)
    }

    @Test
    fun `SyncOrder includes subtotal in serialized JSON`() {
        val syncOrder = SyncOrder(
            orderId = 1,
            subtotal = 200.0,
            taxTotal = 30.0,
            grandTotal = 230.0,
            uuid = "test-uuid"
        )
        val json = gson.toJson(syncOrder)
        assertTrue("subtotal field missing from SyncOrder JSON", json.contains("\"subtotal\":200.0"))
    }

    @Test
    fun `SyncOrder subtotal field matches server contract`() {
        val syncOrder = SyncOrder(orderId = 1, subtotal = 150.0)
        val jsonObj = gson.toJsonTree(syncOrder).asJsonObject
        assertTrue("subtotal field missing", jsonObj.has("subtotal"))
        assertEquals(150.0, jsonObj.get("subtotal").asDouble, 0.01)
    }

    @Test
    fun `SyncOrder subtotal zero is preserved`() {
        val syncOrder = SyncOrder(orderId = 1, subtotal = 0.0)
        val json = gson.toJson(syncOrder)
        assertTrue("subtotal zero should be preserved", json.contains("\"subtotal\":0.0"))
    }

    // ======================== PAYMENT SYNC MODEL ========================

    @Test
    fun `SyncPayment orderId serializes correctly`() {
        val syncPayment = SyncPayment(
            paymentId = 1,
            orderId = 42,
            amount = 230.0,
            paymentType = "CASH"
        )
        val json = gson.toJson(syncPayment)
        assertTrue("order_id field missing", json.contains("\"order_id\":42"))
    }

    @Test
    fun `SyncPayment round-trips through JSON`() {
        val original = SyncPayment(
            paymentId = 1,
            orderId = 42,
            documentNo = "POS-001",
            tendered = 300.0,
            amount = 230.0,
            change = 70.0,
            paymentType = "CASH",
            datePaid = "2024-01-15T10:35:00Z",
            payAmt = 230.0,
            status = "CO",
            checkNumber = "CHK-001"
        )
        val json = gson.toJson(original)
        val restored = gson.fromJson(json, SyncPayment::class.java)

        assertEquals(original.paymentId, restored.paymentId)
        assertEquals(original.orderId, restored.orderId)
        assertEquals(original.documentNo, restored.documentNo)
        assertEquals(original.tendered, restored.tendered, 0.01)
        assertEquals(original.amount, restored.amount, 0.01)
        assertEquals(original.change, restored.change, 0.01)
        assertEquals(original.paymentType, restored.paymentType)
        assertEquals(original.datePaid, restored.datePaid)
        assertEquals(original.payAmt, restored.payAmt, 0.01)
        assertEquals(original.status, restored.status)
        assertEquals(original.checkNumber, restored.checkNumber)
    }

    // ======================== CUSTOMER SYNC MODEL ========================

    @Test
    fun `SyncCustomer maps all customer fields`() {
        val customer = SyncCustomer(
            customerId = 10,
            name = "Jane Doe",
            identifier = "CUS-010",
            phone1 = "+23012345678",
            mobile = "+23098765432",
            email = "jane@example.com",
            address1 = "456 Oak Ave",
            city = "Port Louis",
            country = "MU",
            creditLimit = 10000.0,
            balance = 500.0,
            isActive = "Y",
            loyaltyPoints = 1200,
            discountCodeId = 3
        )
        val json = gson.toJson(customer)
        val jsonObj = gson.toJsonTree(customer).asJsonObject

        // Verify all fields are present in the serialized output
        assertTrue(jsonObj.has("customer_id"))
        assertTrue(jsonObj.has("name"))
        assertTrue(jsonObj.has("identifier"))
        assertTrue(jsonObj.has("phone1"))
        assertTrue(jsonObj.has("mobile"))
        assertTrue(jsonObj.has("email"))
        assertTrue(jsonObj.has("address1"))
        assertTrue(jsonObj.has("city"))
        assertTrue(jsonObj.has("country"))
        assertTrue(jsonObj.has("credit_limit"))
        assertTrue(jsonObj.has("balance"))
        assertTrue(jsonObj.has("isactive"))
        assertTrue(jsonObj.has("loyalty_points"))
        assertTrue(jsonObj.has("discountcode_id"))

        assertEquals(10, jsonObj.get("customer_id").asInt)
        assertEquals(10000.0, jsonObj.get("credit_limit").asDouble, 0.01)
        assertEquals(1200, jsonObj.get("loyalty_points").asInt)
    }

    @Test
    fun `SyncCustomer round-trips through JSON`() {
        val original = SyncCustomer(
            customerId = 5,
            name = "Test Customer",
            creditLimit = 5000.0,
            balance = 250.0,
            loyaltyPoints = 500,
            discountCodeId = 2
        )
        val json = gson.toJson(original)
        val restored = gson.fromJson(json, SyncCustomer::class.java)

        assertEquals(original.customerId, restored.customerId)
        assertEquals(original.name, restored.name)
        assertEquals(original.creditLimit, restored.creditLimit, 0.01)
        assertEquals(original.balance, restored.balance, 0.01)
        assertEquals(original.loyaltyPoints, restored.loyaltyPoints)
        assertEquals(original.discountCodeId, restored.discountCodeId)
    }

    // ======================== FULL SYNC REQUEST WITH NEW FIELDS ========================

    @Test
    fun `full sync request includes payments and subtotal`() {
        val request = CloudSyncRequest(
            accountId = "ACC-001",
            terminalId = 1,
            storeId = 1,
            lastSyncAt = "2024-01-01T00:00:00Z",
            orders = listOf(
                SyncOrder(
                    orderId = 1,
                    subtotal = 200.0,
                    taxTotal = 30.0,
                    grandTotal = 230.0,
                    uuid = "order-uuid-1"
                )
            ),
            payments = listOf(
                SyncPayment(
                    paymentId = 1,
                    orderId = 1,
                    amount = 230.0,
                    paymentType = "CASH"
                )
            ),
            customers = listOf(
                SyncCustomer(
                    customerId = 10,
                    name = "Jane Doe"
                )
            )
        )

        val json = gson.toJson(request)
        val jsonObj = gson.toJsonTree(request).asJsonObject

        // Orders with subtotal
        val ordersArr = jsonObj.getAsJsonArray("orders")
        assertNotNull(ordersArr)
        assertEquals(1, ordersArr.size())
        val orderObj = ordersArr[0].asJsonObject
        assertTrue("order subtotal missing", orderObj.has("subtotal"))
        assertEquals(200.0, orderObj.get("subtotal").asDouble, 0.01)

        // Payments
        val paymentsArr = jsonObj.getAsJsonArray("payments")
        assertNotNull(paymentsArr)
        assertEquals(1, paymentsArr.size())
        val paymentObj = paymentsArr[0].asJsonObject
        assertTrue("payment order_id missing", paymentObj.has("order_id"))
        assertEquals(1, paymentObj.get("order_id").asInt)

        // Customers
        val customersArr = jsonObj.getAsJsonArray("customers")
        assertNotNull(customersArr)
        assertEquals(1, customersArr.size())
    }

    @Test
    fun `full sync request round-trips with all new fields`() {
        val original = CloudSyncRequest(
            accountId = "ACC-001",
            terminalId = 1,
            storeId = 1,
            lastSyncAt = "2024-01-01T00:00:00Z",
            orders = listOf(SyncOrder(orderId = 1, subtotal = 200.0, grandTotal = 230.0, uuid = "o-1")),
            payments = listOf(SyncPayment(paymentId = 1, orderId = 1, amount = 230.0)),
            customers = listOf(SyncCustomer(customerId = 1, name = "John", loyaltyPoints = 100))
        )
        val json = gson.toJson(original)
        val restored = gson.fromJson(json, CloudSyncRequest::class.java)

        assertEquals(200.0, restored.orders!![0].subtotal, 0.01)
        assertEquals(1, restored.payments!![0].orderId)
        assertEquals(100, restored.customers!![0].loyaltyPoints)
    }

    // ======================== RESPONSE WITH STORES/TERMINALS ========================

    @Test
    fun `CloudSyncResponse deserializes stores and terminals`() {
        val json = """
        {
            "success": true,
            "server_time": "2024-01-15T18:00:00Z",
            "stores": [{"store_id": 1, "name": "Main Store", "currency": "MUR"}],
            "terminals": [{"terminal_id": 1, "store_id": 1, "name": "POS 1", "prefix": "A"}],
            "orders_synced": 0,
            "tills_synced": 0
        }
        """.trimIndent()

        val response = gson.fromJson(json, CloudSyncResponse::class.java)

        assertNotNull(response.stores)
        assertEquals(1, response.stores?.size)
        val store = response.stores!![0]
        assertEquals(1.0, (store["store_id"] as Number).toDouble(), 0.01)
        assertEquals("Main Store", store["name"])
        assertEquals("MUR", store["currency"])

        assertNotNull(response.terminals)
        assertEquals(1, response.terminals?.size)
        val terminal = response.terminals!![0]
        assertEquals(1.0, (terminal["terminal_id"] as Number).toDouble(), 0.01)
        assertEquals("POS 1", terminal["name"])
    }

    // ======================== SPLIT PAYMENT REGRESSION ========================

    @Test
    fun `multiple payments for same order serialize correctly`() {
        val payments = listOf(
            SyncPayment(paymentId = 1, orderId = 42, amount = 150.0, paymentType = "CASH"),
            SyncPayment(paymentId = 2, orderId = 42, amount = 80.0, paymentType = "CARD")
        )
        val request = CloudSyncRequest(
            accountId = "ACC-001",
            terminalId = 1,
            storeId = 1,
            lastSyncAt = "2024-01-01T00:00:00Z",
            payments = payments
        )
        val json = gson.toJson(request)
        val jsonObj = gson.toJsonTree(request).asJsonObject

        val paymentsArr = jsonObj.getAsJsonArray("payments")
        assertEquals(2, paymentsArr.size())

        // Both reference the same order
        assertEquals(42, paymentsArr[0].asJsonObject.get("order_id").asInt)
        assertEquals(42, paymentsArr[1].asJsonObject.get("order_id").asInt)

        // Different payment types
        assertEquals("CASH", paymentsArr[0].asJsonObject.get("payment_type").asString)
        assertEquals("CARD", paymentsArr[1].asJsonObject.get("payment_type").asString)
    }

    // ======================== SERVER CONTRACT: SUBTOTAL IN ORDER ========================

    @Test
    fun `SyncOrder JSON field names include subtotal for server contract`() {
        val order = SyncOrder(
            orderId = 1,
            subtotal = 200.0,
            taxTotal = 30.0,
            grandTotal = 230.0,
            qtyTotal = 3.0,
            uuid = "test"
        )
        val jsonObj = gson.toJsonTree(order).asJsonObject

        // Server reads: order.subtotal ?? 0
        val serverFields = listOf(
            "order_id", "subtotal", "tax_total", "grand_total", "qty_total", "uuid"
        )
        for (field in serverFields) {
            assertTrue("SyncOrder JSON missing field '$field'", jsonObj.has(field))
        }
    }
}
