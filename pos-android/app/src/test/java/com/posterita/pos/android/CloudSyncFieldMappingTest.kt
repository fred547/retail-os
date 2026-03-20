package com.posterita.pos.android

import com.google.gson.Gson
import com.posterita.pos.android.data.remote.model.request.*
import com.posterita.pos.android.data.remote.model.response.CloudSyncResponse
import org.junit.Assert.*
import org.junit.Test

/**
 * Tests that the Android sync request/response models correctly serialize/deserialize
 * field names to match the cloud API contract.
 *
 * These tests catch silent data loss from field name mismatches between
 * Android (camelCase Kotlin) and Cloud (snake_case Supabase/JSON).
 */
class CloudSyncFieldMappingTest {

    private val gson = Gson()

    // ======================== REQUEST SERIALIZATION ========================

    @Test
    fun `CloudSyncRequest serializes with snake_case field names`() {
        val request = CloudSyncRequest(
            accountId = "ACC-001",
            terminalId = 1,
            storeId = 2,
            lastSyncAt = "2024-01-01T00:00:00Z"
        )
        val json = gson.toJson(request)
        assertTrue("account_id field missing", json.contains("\"account_id\""))
        assertTrue("terminal_id field missing", json.contains("\"terminal_id\""))
        assertTrue("store_id field missing", json.contains("\"store_id\""))
        assertTrue("last_sync_at field missing", json.contains("\"last_sync_at\""))
        // Verify camelCase is NOT in the JSON
        assertFalse("accountId should not appear", json.contains("\"accountId\""))
        assertFalse("terminalId should not appear", json.contains("\"terminalId\""))
    }

    @Test
    fun `SyncOrder serializes all financial fields`() {
        val order = SyncOrder(
            orderId = 1,
            customerId = 5,
            salesRepId = 2,
            tillId = 100,
            terminalId = 1,
            storeId = 1,
            orderType = "dine_in",
            documentNo = "POS-001",
            docStatus = "CO",
            isPaid = true,
            taxTotal = 30.0,
            grandTotal = 230.0,
            qtyTotal = 3.0,
            dateOrdered = "2024-01-15T10:30:00Z",
            uuid = "uuid-1",
            currency = "MUR",
            tips = 10.0,
            note = "Test",
            couponids = "C1,C2"
        )
        val json = gson.toJson(order)

        // All fields must use snake_case per @SerializedName annotations
        assertTrue(json.contains("\"order_id\":1"))
        assertTrue(json.contains("\"customer_id\":5"))
        assertTrue(json.contains("\"sales_rep_id\":2"))
        assertTrue(json.contains("\"till_id\":100"))
        assertTrue(json.contains("\"terminal_id\":1"))
        assertTrue(json.contains("\"store_id\":1"))
        assertTrue(json.contains("\"order_type\":\"dine_in\""))
        assertTrue(json.contains("\"document_no\":\"POS-001\""))
        assertTrue(json.contains("\"doc_status\":\"CO\""))
        assertTrue(json.contains("\"is_paid\":true"))
        assertTrue(json.contains("\"tax_total\":30.0"))
        assertTrue(json.contains("\"grand_total\":230.0"))
        assertTrue(json.contains("\"qty_total\":3.0"))
        assertTrue(json.contains("\"date_ordered\""))
        assertTrue(json.contains("\"uuid\":\"uuid-1\""))
        assertTrue(json.contains("\"currency\":\"MUR\""))
        assertTrue(json.contains("\"tips\":10.0"))
        assertTrue(json.contains("\"note\":\"Test\""))
        assertTrue(json.contains("\"couponids\":\"C1,C2\""))
    }

    @Test
    fun `SyncOrder preserves zero values for financial fields`() {
        val order = SyncOrder(
            orderId = 1,
            taxTotal = 0.0,
            grandTotal = 0.0,
            tips = 0.0,
            qtyTotal = 0.0
        )
        val json = gson.toJson(order)
        // Zero must be preserved, not omitted
        assertTrue(json.contains("\"tax_total\":0.0"))
        assertTrue(json.contains("\"grand_total\":0.0"))
        assertTrue(json.contains("\"tips\":0.0"))
    }

    @Test
    fun `SyncOrderLine serializes with correct field names`() {
        val line = SyncOrderLine(
            orderLineId = 1,
            orderId = 1,
            productId = 101,
            productCategoryId = 10,
            taxId = 1,
            qtyEntered = 2.0,
            lineAmt = 400.0,
            lineNetAmt = 460.0,
            priceEntered = 200.0,
            costAmt = 160.0,
            productName = "Burger",
            productDescription = "Classic beef"
        )
        val json = gson.toJson(line)
        assertTrue(json.contains("\"orderline_id\":1"))
        assertTrue(json.contains("\"order_id\":1"))
        assertTrue(json.contains("\"product_id\":101"))
        assertTrue(json.contains("\"productcategory_id\":10"))
        assertTrue(json.contains("\"tax_id\":1"))
        assertTrue(json.contains("\"qtyentered\":2.0"))
        assertTrue(json.contains("\"lineamt\":400.0"))
        assertTrue(json.contains("\"linenetamt\":460.0"))
        assertTrue(json.contains("\"priceentered\":200.0"))
        assertTrue(json.contains("\"costamt\":160.0"))
        assertTrue(json.contains("\"productname\":\"Burger\""))
        assertTrue(json.contains("\"productdescription\":\"Classic beef\""))
    }

    @Test
    fun `SyncTill serializes all financial fields`() {
        val till = SyncTill(
            tillId = 100,
            storeId = 1,
            terminalId = 1,
            openBy = 1,
            closeBy = 1,
            openingAmt = 500.0,
            closingAmt = 1250.0,
            dateOpened = "2024-01-15T08:00:00Z",
            dateClosed = "2024-01-15T18:00:00Z",
            uuid = "till-uuid-1",
            documentNo = "TILL-001",
            adjustmentTotal = 50.0,
            cashAmt = 750.0,
            cardAmt = 500.0,
            subtotal = 1200.0,
            taxTotal = 50.0,
            grandTotal = 1250.0,
            forexCurrency = "USD",
            forexAmt = 25.0
        )
        val json = gson.toJson(till)

        assertTrue(json.contains("\"till_id\":100"))
        assertTrue(json.contains("\"store_id\":1"))
        assertTrue(json.contains("\"terminal_id\":1"))
        assertTrue(json.contains("\"open_by\":1"))
        assertTrue(json.contains("\"close_by\":1"))
        assertTrue(json.contains("\"opening_amt\":500.0"))
        assertTrue(json.contains("\"closing_amt\":1250.0"))
        assertTrue(json.contains("\"uuid\":\"till-uuid-1\""))
        assertTrue(json.contains("\"documentno\":\"TILL-001\""))
        assertTrue(json.contains("\"adjustmenttotal\":50.0"))
        assertTrue(json.contains("\"cashamt\":750.0"))
        assertTrue(json.contains("\"cardamt\":500.0"))
        assertTrue(json.contains("\"subtotal\":1200.0"))
        assertTrue(json.contains("\"taxtotal\":50.0"))
        assertTrue(json.contains("\"grandtotal\":1250.0"))
        assertTrue(json.contains("\"forexcurrency\":\"USD\""))
        assertTrue(json.contains("\"forexamt\":25.0"))
    }

    @Test
    fun `SyncTill preserves zero amounts`() {
        val till = SyncTill(
            tillId = 1,
            openingAmt = 0.0,
            closingAmt = 0.0,
            cashAmt = 0.0,
            cardAmt = 0.0,
            subtotal = 0.0,
            taxTotal = 0.0,
            grandTotal = 0.0,
            adjustmentTotal = 0.0,
            forexAmt = 0.0
        )
        val json = gson.toJson(till)
        assertTrue(json.contains("\"opening_amt\":0.0"))
        assertTrue(json.contains("\"closing_amt\":0.0"))
        assertTrue(json.contains("\"cashamt\":0.0"))
        assertTrue(json.contains("\"grandtotal\":0.0"))
    }

    @Test
    fun `SyncPayment serializes with correct field names`() {
        val payment = SyncPayment(
            paymentId = 1,
            orderId = 1,
            documentNo = "PAY-001",
            tendered = 300.0,
            amount = 230.0,
            change = 70.0,
            paymentType = "CASH",
            datePaid = "2024-01-15T10:35:00Z",
            payAmt = 230.0,
            status = "COMPLETED",
            checkNumber = "CHK-001"
        )
        val json = gson.toJson(payment)
        assertTrue(json.contains("\"payment_id\":1"))
        assertTrue(json.contains("\"order_id\":1"))
        assertTrue(json.contains("\"document_no\":\"PAY-001\""))
        assertTrue(json.contains("\"tendered\":300.0"))
        assertTrue(json.contains("\"amount\":230.0"))
        assertTrue(json.contains("\"change\":70.0"))
        assertTrue(json.contains("\"payment_type\":\"CASH\""))
        assertTrue(json.contains("\"pay_amt\":230.0"))
        assertTrue(json.contains("\"checknumber\":\"CHK-001\""))
    }

    @Test
    fun `SyncCustomer serializes with correct field names`() {
        val customer = SyncCustomer(
            customerId = 1,
            name = "John Doe",
            phone1 = "+23012345678",
            email = "john@example.com",
            creditLimit = 5000.0,
            balance = 100.0,
            isActive = "Y",
            loyaltyPoints = 250,
            discountCodeId = 1
        )
        val json = gson.toJson(customer)
        assertTrue(json.contains("\"customer_id\":1"))
        assertTrue(json.contains("\"name\":\"John Doe\""))
        assertTrue(json.contains("\"credit_limit\":5000.0"))
        assertTrue(json.contains("\"balance\":100.0"))
        assertTrue(json.contains("\"isactive\":\"Y\""))
        assertTrue(json.contains("\"loyalty_points\":250"))
        assertTrue(json.contains("\"discountcode_id\":1"))
    }

    // ======================== RESPONSE DESERIALIZATION ========================

    @Test
    fun `CloudSyncResponse deserializes all pull arrays`() {
        val json = """
        {
            "success": true,
            "server_time": "2024-01-15T18:00:00Z",
            "products": [{"product_id": 1, "name": "Burger", "sellingprice": 200.0}],
            "product_categories": [{"productcategory_id": 1, "name": "Food"}],
            "taxes": [{"tax_id": 1, "name": "VAT", "rate": 15.0}],
            "modifiers": [],
            "customers": [{"customer_id": 1, "name": "John"}],
            "preferences": [],
            "users": [{"user_id": 1, "username": "admin"}],
            "discount_codes": [],
            "restaurant_tables": [{"table_id": 1, "table_name": "T1"}],
            "stores": [],
            "terminals": [],
            "orders_synced": 5,
            "order_lines_synced": 12,
            "payments_synced": 5,
            "tills_synced": 1,
            "errors": []
        }
        """.trimIndent()

        val response = gson.fromJson(json, CloudSyncResponse::class.java)

        assertTrue(response.success)
        assertEquals("2024-01-15T18:00:00Z", response.serverTime)
        assertEquals(1, response.products?.size)
        assertEquals(1, response.productCategories?.size)
        assertEquals(1, response.taxes?.size)
        assertEquals(0, response.modifiers?.size)
        assertEquals(1, response.customers?.size)
        assertEquals(1, response.users?.size)
        assertEquals(1, response.restaurantTables?.size)
        assertEquals(0, response.discountCodes?.size)
        assertEquals(0, response.stores?.size)
        assertEquals(0, response.terminals?.size)
        assertEquals(5, response.ordersSynced)
        assertEquals(12, response.orderLinesSynced)
        assertEquals(5, response.paymentsSynced)
        assertEquals(1, response.tillsSynced)
        assertEquals(0, response.errors?.size)
    }

    @Test
    fun `CloudSyncResponse handles null arrays gracefully`() {
        val json = """{"success": true, "server_time": "2024-01-01T00:00:00Z"}"""
        val response = gson.fromJson(json, CloudSyncResponse::class.java)

        assertTrue(response.success)
        assertNull(response.products)
        assertNull(response.productCategories)
        assertNull(response.taxes)
        assertEquals(0, response.ordersSynced)
    }

    @Test
    fun `CloudSyncResponse preserves error messages`() {
        val json = """
        {
            "success": false,
            "errors": ["Order uuid-1: duplicate key", "Till till-2: FK violation"],
            "orders_synced": 3,
            "tills_synced": 0
        }
        """.trimIndent()
        val response = gson.fromJson(json, CloudSyncResponse::class.java)
        assertFalse(response.success)
        assertEquals(2, response.errors?.size)
        assertEquals("Order uuid-1: duplicate key", response.errors?.get(0))
    }

    @Test
    fun `CloudSyncResponse handles unknown fields without crashing`() {
        val json = """
        {
            "success": true,
            "server_time": "2024-01-01T00:00:00Z",
            "some_future_field": "value",
            "another_new_array": [1, 2, 3]
        }
        """.trimIndent()
        // Gson ignores unknown fields by default
        val response = gson.fromJson(json, CloudSyncResponse::class.java)
        assertTrue(response.success)
    }

    @Test
    fun `CloudSyncResponse deserializes error field for non-200 responses`() {
        val json = """
        {
            "success": false,
            "error": "Invalid account_id"
        }
        """.trimIndent()
        val response = gson.fromJson(json, CloudSyncResponse::class.java)
        assertFalse(response.success)
        assertEquals("Invalid account_id", response.error)
    }

    // ======================== ROUND-TRIP TESTS ========================

    @Test
    fun `full sync request round-trips through JSON correctly`() {
        val original = CloudSyncRequest(
            accountId = "ACC-001",
            terminalId = 1,
            storeId = 2,
            lastSyncAt = "2024-01-01T00:00:00Z",
            orders = listOf(SyncOrder(orderId = 1, grandTotal = 230.0, uuid = "o-1")),
            orderLines = listOf(SyncOrderLine(orderLineId = 1, orderId = 1, productId = 101)),
            payments = listOf(SyncPayment(paymentId = 1, orderId = 1, amount = 230.0)),
            tills = listOf(SyncTill(tillId = 100, uuid = "t-1")),
            customers = listOf(SyncCustomer(customerId = 1, name = "John"))
        )
        val json = gson.toJson(original)
        val restored = gson.fromJson(json, CloudSyncRequest::class.java)

        assertEquals(original.accountId, restored.accountId)
        assertEquals(original.terminalId, restored.terminalId)
        assertEquals(original.storeId, restored.storeId)
        assertEquals(original.lastSyncAt, restored.lastSyncAt)
        assertEquals(original.orders?.size, restored.orders?.size)
        assertEquals(original.orders?.get(0)?.grandTotal, restored.orders?.get(0)?.grandTotal)
        assertEquals(original.orders?.get(0)?.uuid, restored.orders?.get(0)?.uuid)
        assertEquals(original.orderLines?.size, restored.orderLines?.size)
        assertEquals(original.orderLines?.get(0)?.productId, restored.orderLines?.get(0)?.productId)
        assertEquals(original.payments?.size, restored.payments?.size)
        assertEquals(original.payments?.get(0)?.amount, restored.payments?.get(0)?.amount)
        assertEquals(original.tills?.size, restored.tills?.size)
        assertEquals(original.tills?.get(0)?.uuid, restored.tills?.get(0)?.uuid)
        assertEquals(original.customers?.size, restored.customers?.size)
        assertEquals(original.customers?.get(0)?.name, restored.customers?.get(0)?.name)
    }

    @Test
    fun `SyncOrder with null optional fields serializes without errors`() {
        val order = SyncOrder(
            orderId = 1,
            orderType = null,
            documentNo = null,
            docStatus = null,
            dateOrdered = null,
            uuid = null,
            currency = null,
            note = null,
            couponids = null,
            json = null
        )
        val json = gson.toJson(order)
        // Should not throw and should contain the required orderId
        assertTrue(json.contains("\"order_id\":1"))
    }

    @Test
    fun `SyncTill with null optional fields serializes without errors`() {
        val till = SyncTill(
            tillId = 1,
            dateOpened = null,
            dateClosed = null,
            uuid = null,
            documentNo = null,
            vouchers = null,
            forexCurrency = null,
            json = null
        )
        val json = gson.toJson(till)
        assertTrue(json.contains("\"till_id\":1"))
    }

    @Test
    fun `SyncCustomer serializes all address fields`() {
        val customer = SyncCustomer(
            customerId = 1,
            identifier = "CUS-001",
            phone1 = "+23011111111",
            phone2 = "+23022222222",
            mobile = "+23033333333",
            address1 = "123 Main St",
            address2 = "Suite 4",
            city = "Port Louis",
            state = "PL",
            zip = "11001",
            country = "MU"
        )
        val json = gson.toJson(customer)
        assertTrue(json.contains("\"identifier\":\"CUS-001\""))
        assertTrue(json.contains("\"phone1\":\"+23011111111\""))
        assertTrue(json.contains("\"phone2\":\"+23022222222\""))
        assertTrue(json.contains("\"mobile\":\"+23033333333\""))
        assertTrue(json.contains("\"address1\":\"123 Main St\""))
        assertTrue(json.contains("\"address2\":\"Suite 4\""))
        assertTrue(json.contains("\"city\":\"Port Louis\""))
        assertTrue(json.contains("\"state\":\"PL\""))
        assertTrue(json.contains("\"zip\":\"11001\""))
        assertTrue(json.contains("\"country\":\"MU\""))
    }
}
