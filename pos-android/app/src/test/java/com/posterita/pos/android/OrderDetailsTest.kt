package com.posterita.pos.android

import com.posterita.pos.android.domain.model.OrderDetails
import org.junit.Assert.*
import org.junit.Test

class OrderDetailsTest {

    private fun createSampleOrderDetails(): OrderDetails {
        return OrderDetails(
            uuid = "test-uuid-123",
            account_id = "1",
            store_id = 1,
            terminal_id = 1,
            terminal_name = "POS 1",
            till_id = 1,
            till_uuid = "till-uuid",
            user_id = 1,
            user_name = "admin",
            customer_id = 1,
            customer_name = "John Doe",
            documentno = "POS000001",
            dateordered = 1705276800000L,
            dateorderedtext = "15/01/2024 00:00:00",
            grandtotal = 230.0,
            subtotal = 200.0,
            taxtotal = 30.0,
            discountamt = 0.0,
            costtotal = 100.0,
            qtytotal = 2.0,
            tipsamt = 5.0,
            ispaid = true,
            issync = false,
            status = "CO",
            paymenttype = "CASH",
            currency = "MUR",
            note = "Test order",
            lines = listOf(
                OrderDetails.OrderLineDetail(
                    product_id = 1,
                    name = "Product A",
                    qtyentered = 1.0,
                    priceentered = 100.0,
                    priceactual = 100.0,
                    lineamt = 100.0,
                    linenetamt = 115.0,
                    taxamt = 15.0,
                    tax_id = 1,
                    taxcode = "VAT15"
                ),
                OrderDetails.OrderLineDetail(
                    product_id = 2,
                    name = "Product B",
                    qtyentered = 1.0,
                    priceentered = 100.0,
                    priceactual = 100.0,
                    lineamt = 100.0,
                    linenetamt = 115.0,
                    taxamt = 15.0,
                    tax_id = 1,
                    taxcode = "VAT15"
                )
            ),
            payments = listOf(
                OrderDetails.PaymentDetail(
                    tendered = 250.0,
                    amount = 230.0,
                    change = 20.0,
                    paymenttype = "CASH",
                    type = "CASH",
                    status = "CO",
                    datepaid = 1705276800000L,
                    documentno = "POS000001",
                    payamt = 230.0
                )
            ),
            taxes = listOf(
                OrderDetails.TaxDetail(
                    name = "VAT",
                    taxcode = "VAT15",
                    rate = 15.0,
                    amt = 30.0
                )
            ),
            discounts = emptyList(),
            tendered = 250.0,
            change = 20.0,
            account = OrderDetails.AccountDetail(
                businessname = "Test Business",
                address1 = "123 Main St",
                phone1 = "555-1234",
                receiptmessage = "Thank you!",
                currency = "MUR",
                isvatable = "Y"
            ),
            store = OrderDetails.StoreDetail(
                name = "Store 1",
                address = "456 Market St",
                city = "Port Louis"
            )
        )
    }

    // === JSON SERIALIZATION ===

    @Test
    fun toJson_producesNonEmptyString() {
        val order = createSampleOrderDetails()
        val json = order.toJson()

        assertNotNull(json)
        assertTrue(json.isNotEmpty())
    }

    @Test
    fun toJson_containsKeyFields() {
        val order = createSampleOrderDetails()
        val json = order.toJson()

        assertTrue(json.contains("test-uuid-123"))
        assertTrue(json.contains("POS000001"))
        assertTrue(json.contains("John Doe"))
        assertTrue(json.contains("CASH"))
    }

    // === JSON DESERIALIZATION ===

    @Test
    fun fromJson_validJson_returnsOrderDetails() {
        val order = createSampleOrderDetails()
        val json = order.toJson()

        val deserialized = OrderDetails.fromJson(json)

        assertNotNull(deserialized)
    }

    @Test
    fun fromJson_invalidJson_returnsNull() {
        val result = OrderDetails.fromJson("invalid json {{{")

        assertNull(result)
    }

    @Test
    fun fromJson_emptyJson_returnsDefaults() {
        val result = OrderDetails.fromJson("{}")

        assertNotNull(result)
        assertEquals(0.0, result!!.grandtotal, 0.01)
    }

    // === ROUNDTRIP SERIALIZATION ===

    @Test
    fun toJson_fromJson_roundtrip_preservesBasicFields() {
        val original = createSampleOrderDetails()
        val json = original.toJson()
        val restored = OrderDetails.fromJson(json)

        assertNotNull(restored)
        assertEquals(original.uuid, restored!!.uuid)
        assertEquals(original.documentno, restored.documentno)
        assertEquals(original.grandtotal, restored.grandtotal, 0.01)
        assertEquals(original.subtotal, restored.subtotal, 0.01)
        assertEquals(original.taxtotal, restored.taxtotal, 0.01)
        assertEquals(original.qtytotal, restored.qtytotal, 0.01)
        assertEquals(original.tipsamt, restored.tipsamt, 0.01)
        assertEquals(original.status, restored.status)
        assertEquals(original.paymenttype, restored.paymenttype)
        assertEquals(original.currency, restored.currency)
        assertEquals(original.note, restored.note)
        assertEquals(original.customer_name, restored.customer_name)
        assertEquals(original.customer_id, restored.customer_id)
        assertEquals(original.ispaid, restored.ispaid)
        assertEquals(original.issync, restored.issync)
    }

    @Test
    fun toJson_fromJson_roundtrip_preservesLines() {
        val original = createSampleOrderDetails()
        val json = original.toJson()
        val restored = OrderDetails.fromJson(json)

        assertNotNull(restored)
        assertEquals(2, restored!!.lines.size)
        assertEquals("Product A", restored.lines[0].name)
        assertEquals("Product B", restored.lines[1].name)
        assertEquals(1.0, restored.lines[0].qtyentered, 0.01)
        assertEquals(100.0, restored.lines[0].priceentered, 0.01)
        assertEquals(115.0, restored.lines[0].linenetamt, 0.01)
        assertEquals(15.0, restored.lines[0].taxamt, 0.01)
    }

    @Test
    fun toJson_fromJson_roundtrip_preservesPayments() {
        val original = createSampleOrderDetails()
        val json = original.toJson()
        val restored = OrderDetails.fromJson(json)

        assertNotNull(restored)
        assertEquals(1, restored!!.payments.size)
        assertEquals(250.0, restored.payments[0].tendered, 0.01)
        assertEquals(230.0, restored.payments[0].amount, 0.01)
        assertEquals(20.0, restored.payments[0].change, 0.01)
        assertEquals("CASH", restored.payments[0].paymenttype)
    }

    @Test
    fun toJson_fromJson_roundtrip_preservesTaxes() {
        val original = createSampleOrderDetails()
        val json = original.toJson()
        val restored = OrderDetails.fromJson(json)

        assertNotNull(restored)
        assertEquals(1, restored!!.taxes.size)
        assertEquals("VAT", restored.taxes[0].name)
        assertEquals(15.0, restored.taxes[0].rate, 0.01)
        assertEquals(30.0, restored.taxes[0].amt, 0.01)
    }

    @Test
    fun toJson_fromJson_roundtrip_preservesAccount() {
        val original = createSampleOrderDetails()
        val json = original.toJson()
        val restored = OrderDetails.fromJson(json)

        assertNotNull(restored)
        assertNotNull(restored!!.account)
        assertEquals("Test Business", restored.account!!.businessname)
        assertEquals("MUR", restored.account!!.currency)
        assertEquals("Thank you!", restored.account!!.receiptmessage)
    }

    @Test
    fun toJson_fromJson_roundtrip_preservesStore() {
        val original = createSampleOrderDetails()
        val json = original.toJson()
        val restored = OrderDetails.fromJson(json)

        assertNotNull(restored)
        assertNotNull(restored!!.store)
        assertEquals("Store 1", restored.store!!.name)
        assertEquals("Port Louis", restored.store!!.city)
    }

    // === DISCOUNT SERIALIZATION ===

    @Test
    fun toJson_fromJson_roundtrip_preservesDiscounts() {
        val order = createSampleOrderDetails().copy(
            discounts = listOf(
                OrderDetails.Discount(
                    discountcode_id = 1,
                    discountamt = 10.0,
                    discountpercentage = 5.0
                )
            )
        )
        val json = order.toJson()
        val restored = OrderDetails.fromJson(json)

        assertNotNull(restored)
        assertEquals(1, restored!!.discounts.size)
        assertEquals(10.0, restored.discounts[0].discountamt, 0.01)
        assertEquals(5.0, restored.discounts[0].discountpercentage, 0.01)
    }

    // === EDGE CASES ===

    @Test
    fun orderDetails_defaultValues() {
        val order = OrderDetails()

        assertEquals(0.0, order.grandtotal, 0.01)
        assertEquals(0.0, order.subtotal, 0.01)
        assertFalse(order.ispaid)
        assertFalse(order.issync)
        assertTrue(order.lines.isEmpty())
        assertTrue(order.payments.isEmpty())
        assertTrue(order.taxes.isEmpty())
    }

    @Test
    fun orderLineDetail_defaultValues() {
        val line = OrderDetails.OrderLineDetail()

        assertEquals(0.0, line.linenetamt, 0.01)
        assertEquals(0.0, line.qtyentered, 0.01)
        assertNull(line.name)
    }

    @Test
    fun paymentDetail_defaultValues() {
        val payment = OrderDetails.PaymentDetail()

        assertEquals(0.0, payment.tendered, 0.01)
        assertEquals(0.0, payment.amount, 0.01)
        assertEquals(0.0, payment.change, 0.01)
    }
}
