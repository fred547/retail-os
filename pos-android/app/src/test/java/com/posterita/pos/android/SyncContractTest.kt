package com.posterita.pos.android

import com.google.gson.Gson
import com.posterita.pos.android.data.remote.model.request.*
import com.posterita.pos.android.data.remote.model.response.CloudSyncResponse
import org.junit.Assert.*
import org.junit.Test

/**
 * Contract tests verifying the Android client and Cloud API agree on field names.
 *
 * The cloud sync route expects snake_case JSON. These tests verify that every field
 * the Android client sends matches what the server code references.
 *
 * If a field name changes on either side, these tests break BEFORE data is silently lost.
 */
class SyncContractTest {

    private val gson = Gson()

    @Test
    fun `CloudSyncRequest top-level fields match server contract`() {
        val request = CloudSyncRequest(
            accountId = "test",
            terminalId = 1,
            storeId = 1,
            lastSyncAt = "2024-01-01T00:00:00Z"
        )
        val jsonObj = gson.toJsonTree(request).asJsonObject

        val requiredFields = listOf("account_id", "terminal_id", "store_id", "last_sync_at")
        for (field in requiredFields) {
            assertTrue(
                "Missing required field '$field' in CloudSyncRequest JSON",
                jsonObj.has(field)
            )
        }
    }

    @Test
    fun `CloudSyncRequest includes push arrays with correct keys`() {
        val request = CloudSyncRequest(
            accountId = "test",
            terminalId = 1,
            storeId = 1,
            lastSyncAt = "2024-01-01T00:00:00Z",
            orders = listOf(SyncOrder(orderId = 1)),
            orderLines = listOf(SyncOrderLine(orderLineId = 1, orderId = 1, productId = 1)),
            payments = listOf(SyncPayment(paymentId = 1)),
            tills = listOf(SyncTill(tillId = 1)),
            customers = listOf(SyncCustomer(customerId = 1))
        )
        val jsonObj = gson.toJsonTree(request).asJsonObject

        assertTrue("orders array missing", jsonObj.has("orders"))
        assertTrue("order_lines array missing", jsonObj.has("order_lines"))
        assertTrue("payments array missing", jsonObj.has("payments"))
        assertTrue("tills array missing", jsonObj.has("tills"))
        assertTrue("customers array missing", jsonObj.has("customers"))

        // Verify camelCase keys are NOT present
        assertFalse("orderLines should not appear (should be order_lines)", jsonObj.has("orderLines"))
    }

    @Test
    fun `SyncOrder JSON contains all server-expected fields`() {
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
            note = "test",
            couponids = "C1"
        )
        val jsonObj = gson.toJsonTree(order).asJsonObject

        // Check that each field the server reads has a matching key
        val serverFields = listOf(
            "order_id", "customer_id", "sales_rep_id", "till_id",
            "terminal_id", "store_id", "order_type", "document_no",
            "doc_status", "is_paid", "subtotal", "tax_total", "grand_total",
            "qty_total", "date_ordered", "uuid", "currency",
            "tips", "note", "couponids"
        )

        for (field in serverFields) {
            assertTrue("SyncOrder JSON missing server field '$field'", jsonObj.has(field))
        }
    }

    @Test
    fun `SyncOrder does not leak camelCase field names`() {
        val order = SyncOrder(orderId = 1, customerId = 5, grandTotal = 100.0)
        val jsonObj = gson.toJsonTree(order).asJsonObject

        val forbiddenKeys = listOf(
            "orderId", "customerId", "salesRepId", "tillId",
            "terminalId", "storeId", "orderType", "documentNo",
            "docStatus", "isPaid", "taxTotal", "grandTotal",
            "qtyTotal", "dateOrdered"
        )
        for (key in forbiddenKeys) {
            assertFalse("Camel case key '$key' should not appear in JSON", jsonObj.has(key))
        }
    }

    @Test
    fun `SyncTill JSON contains all server-expected fields`() {
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
            uuid = "till-uuid",
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
        val jsonObj = gson.toJsonTree(till).asJsonObject

        val requiredFields = listOf(
            "till_id", "store_id", "terminal_id", "open_by", "close_by",
            "opening_amt", "closing_amt", "date_opened", "date_closed",
            "uuid", "documentno", "adjustmenttotal", "cashamt", "cardamt",
            "subtotal", "taxtotal", "grandtotal", "forexcurrency", "forexamt"
        )

        for (field in requiredFields) {
            assertTrue("SyncTill JSON missing field '$field'", jsonObj.has(field))
        }
    }

    @Test
    fun `SyncTill does not leak camelCase field names`() {
        val till = SyncTill(tillId = 1, openingAmt = 100.0, closingAmt = 200.0)
        val jsonObj = gson.toJsonTree(till).asJsonObject

        val forbiddenKeys = listOf(
            "tillId", "storeId", "terminalId", "openBy", "closeBy",
            "openingAmt", "closingAmt", "dateOpened", "dateClosed",
            "adjustmentTotal", "cashAmt", "cardAmt", "taxTotal",
            "grandTotal", "forexCurrency", "forexAmt"
        )
        for (key in forbiddenKeys) {
            assertFalse("Camel case key '$key' should not appear in JSON", jsonObj.has(key))
        }
    }

    @Test
    fun `SyncOrderLine field names match server orderline upsert columns`() {
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
            productDescription = "desc"
        )
        val jsonObj = gson.toJsonTree(line).asJsonObject

        // Server reads these exact field names for upsert
        val serverColumns = listOf(
            "orderline_id", "order_id", "product_id", "productcategory_id",
            "tax_id", "qtyentered", "lineamt", "linenetamt",
            "priceentered", "costamt", "productname", "productdescription"
        )
        for (col in serverColumns) {
            assertTrue("SyncOrderLine missing server column '$col'", jsonObj.has(col))
        }
    }

    @Test
    fun `SyncPayment field names match server payment upsert columns`() {
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
        val jsonObj = gson.toJsonTree(payment).asJsonObject

        val serverColumns = listOf(
            "payment_id", "order_id", "document_no",
            "tendered", "amount", "change", "payment_type",
            "date_paid", "pay_amt", "status", "checknumber"
        )
        for (col in serverColumns) {
            assertTrue("SyncPayment missing server column '$col'", jsonObj.has(col))
        }
    }

    @Test
    fun `SyncCustomer field names match server customer upsert columns`() {
        val customer = SyncCustomer(
            customerId = 1,
            name = "John",
            identifier = "CUS-001",
            phone1 = "+230111",
            phone2 = "+230222",
            mobile = "+230333",
            email = "j@e.com",
            address1 = "123 St",
            address2 = "Apt 4",
            city = "PL",
            state = "PL",
            zip = "11001",
            country = "MU",
            creditLimit = 5000.0,
            balance = 100.0,
            isActive = "Y",
            loyaltyPoints = 250,
            discountCodeId = 1
        )
        val jsonObj = gson.toJsonTree(customer).asJsonObject

        val serverColumns = listOf(
            "customer_id", "name", "identifier", "phone1", "phone2",
            "mobile", "email", "address1", "address2", "city", "state",
            "zip", "country", "credit_limit", "balance", "isactive",
            "loyalty_points", "discountcode_id"
        )
        for (col in serverColumns) {
            assertTrue("SyncCustomer missing server column '$col'", jsonObj.has(col))
        }
    }

    @Test
    fun `CloudSyncResponse field names match server response keys`() {
        // Verify all the field names the server returns are correctly mapped
        val serverJson = """
        {
            "success": true,
            "server_time": "2024-01-01T00:00:00Z",
            "products": [],
            "product_categories": [],
            "taxes": [],
            "modifiers": [],
            "customers": [],
            "preferences": [],
            "users": [],
            "discount_codes": [],
            "restaurant_tables": [],
            "stores": [],
            "terminals": [],
            "orders_synced": 5,
            "order_lines_synced": 12,
            "payments_synced": 5,
            "tills_synced": 1,
            "errors": ["test error"]
        }
        """.trimIndent()

        val response = gson.fromJson(serverJson, CloudSyncResponse::class.java)

        // Every server field must map to a non-default value or non-null
        assertTrue(response.success)
        assertNotNull(response.serverTime)
        assertNotNull(response.products)
        assertNotNull(response.productCategories)   // maps from "product_categories"
        assertNotNull(response.taxes)
        assertNotNull(response.modifiers)
        assertNotNull(response.customers)
        assertNotNull(response.preferences)
        assertNotNull(response.users)
        assertNotNull(response.discountCodes)       // maps from "discount_codes"
        assertNotNull(response.restaurantTables)    // maps from "restaurant_tables"
        assertNotNull(response.stores)
        assertNotNull(response.terminals)
        assertEquals(5, response.ordersSynced)
        assertEquals(12, response.orderLinesSynced)
        assertEquals(5, response.paymentsSynced)
        assertEquals(1, response.tillsSynced)
        assertEquals(1, response.errors?.size)
    }

    @Test
    fun `CloudSyncResponse error field is deserialized`() {
        val serverJson = """{"success": false, "error": "Unauthorized"}"""
        val response = gson.fromJson(serverJson, CloudSyncResponse::class.java)
        assertFalse(response.success)
        assertEquals("Unauthorized", response.error)
    }

    @Test
    fun `sync stat counters default to 0 when absent from response`() {
        val serverJson = """{"success": true}"""
        val response = gson.fromJson(serverJson, CloudSyncResponse::class.java)
        assertEquals(0, response.ordersSynced)
        assertEquals(0, response.orderLinesSynced)
        assertEquals(0, response.paymentsSynced)
        assertEquals(0, response.tillsSynced)
    }
}
