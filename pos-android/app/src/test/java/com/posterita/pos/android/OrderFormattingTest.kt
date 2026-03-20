package com.posterita.pos.android

import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.util.NumberUtils
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Tests for order display formatting: document numbers, dates, currency,
 * status mapping, item counts, grand totals, and customer name handling.
 */
@RunWith(RobolectricTestRunner::class)
class OrderFormattingTest {

    // ========== HELPERS ==========

    /** Map status code to display text, matching the convention used in the app. */
    private fun statusDisplayText(statusCode: String?): String = when (statusCode) {
        "CO" -> "PAID"
        "VO" -> "VOID"
        "IP" -> "OPEN"
        "DR" -> "DRAFT"
        else -> "UNKNOWN"
    }

    /** Format currency amount with symbol prefix. */
    private fun formatCurrency(amount: Double, currencyCode: String?): String {
        val symbol = when (currencyCode) {
            "MUR" -> "Rs"
            "USD" -> "$"
            "EUR" -> "\u20AC" // Euro sign
            "GBP" -> "\u00A3" // Pound sign
            else -> currencyCode ?: ""
        }
        return "$symbol ${NumberUtils.formatPrice(amount)}"
    }

    /** Format items count with singular/plural. */
    private fun formatItemsCount(count: Int): String = when (count) {
        0 -> "No items"
        1 -> "1 item"
        else -> "$count items"
    }

    /** Truncate customer name to max length with ellipsis. */
    private fun truncateCustomerName(name: String?, maxLength: Int = 20): String {
        if (name.isNullOrBlank()) return "Walk-in Customer"
        return if (name.length > maxLength) name.take(maxLength - 3) + "..." else name
    }

    // ========== DOCUMENT NUMBER FORMATTING ==========

    @Test
    fun documentNumber_standardFormat() {
        val order = OrderDetails(documentno = "POS-00001")
        assertEquals("POS-00001", order.documentno)
    }

    @Test
    fun documentNumber_withPrefix() {
        val order = OrderDetails(documentno = "INV-2024-00123")
        assertNotNull(order.documentno)
        assertTrue(order.documentno!!.startsWith("INV-"))
    }

    @Test
    fun documentNumber_null() {
        val order = OrderDetails(documentno = null)
        assertNull(order.documentno)
    }

    @Test
    fun documentNumber_empty() {
        val order = OrderDetails(documentno = "")
        assertEquals("", order.documentno)
    }

    // ========== DATE FORMATTING ==========

    @Test
    fun dateFormatting_timestampToDisplayString() {
        val timestamp = 1710489600000L // 2024-03-15 12:00:00 UTC
        val formatter = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.US)
        val formatted = formatter.format(Date(timestamp))

        assertNotNull(formatted)
        assertTrue(formatted.contains("2024"))
        assertTrue(formatted.contains("03"))
        assertTrue(formatted.contains("15"))
    }

    @Test
    fun dateFormatting_orderDateText() {
        val order = OrderDetails(dateorderedtext = "15 Mar 2024 12:00 PM")
        assertEquals("15 Mar 2024 12:00 PM", order.dateorderedtext)
    }

    @Test
    fun dateFormatting_nullDateText() {
        val order = OrderDetails(dateorderedtext = null)
        assertNull(order.dateorderedtext)
    }

    @Test
    fun dateFormatting_dateOrderedFullField() {
        val order = OrderDetails(dateorderedfull = "2024-03-15T12:00:00.000Z")
        assertNotNull(order.dateorderedfull)
        assertTrue(order.dateorderedfull!!.contains("2024-03-15"))
    }

    // ========== CURRENCY FORMATTING ==========

    @Test
    fun currencyFormatting_MUR() {
        val formatted = formatCurrency(230.0, "MUR")
        assertEquals("Rs 230.00", formatted)
    }

    @Test
    fun currencyFormatting_USD() {
        val formatted = formatCurrency(99.99, "USD")
        assertEquals("$ 99.99", formatted)
    }

    @Test
    fun currencyFormatting_EUR() {
        val formatted = formatCurrency(150.50, "EUR")
        assertEquals("\u20AC 150.50", formatted)
    }

    @Test
    fun currencyFormatting_zeroAmount() {
        val formatted = formatCurrency(0.0, "MUR")
        assertEquals("Rs 0.00", formatted)
    }

    @Test
    fun currencyFormatting_negativeAmount() {
        val formatted = formatCurrency(-50.00, "USD")
        assertEquals("$ -50.00", formatted)
    }

    @Test
    fun currencyFormatting_largeAmount() {
        val formatted = formatCurrency(999999.99, "MUR")
        assertEquals("Rs 999999.99", formatted)
    }

    @Test
    fun currencyFormatting_nullCurrency() {
        val formatted = formatCurrency(100.0, null)
        assertEquals(" 100.00", formatted)
    }

    @Test
    fun currencyFormatting_unknownCurrency_usesCode() {
        val formatted = formatCurrency(100.0, "JPY")
        assertEquals("JPY 100.00", formatted)
    }

    // ========== STATUS TEXT MAPPING ==========

    @Test
    fun statusMapping_CO_toPAID() {
        assertEquals("PAID", statusDisplayText("CO"))
    }

    @Test
    fun statusMapping_VO_toVOID() {
        assertEquals("VOID", statusDisplayText("VO"))
    }

    @Test
    fun statusMapping_IP_toOPEN() {
        assertEquals("OPEN", statusDisplayText("IP"))
    }

    @Test
    fun statusMapping_DR_toDRAFT() {
        assertEquals("DRAFT", statusDisplayText("DR"))
    }

    @Test
    fun statusMapping_null_toUNKNOWN() {
        assertEquals("UNKNOWN", statusDisplayText(null))
    }

    @Test
    fun statusMapping_empty_toUNKNOWN() {
        assertEquals("UNKNOWN", statusDisplayText(""))
    }

    @Test
    fun statusMapping_orderDetailsStatus() {
        val paidOrder = OrderDetails(status = "CO")
        val voidOrder = OrderDetails(status = "VO")

        assertEquals("PAID", statusDisplayText(paidOrder.status))
        assertEquals("VOID", statusDisplayText(voidOrder.status))
    }

    // ========== ITEMS COUNT DISPLAY ==========

    @Test
    fun itemsCount_zeroItems() {
        assertEquals("No items", formatItemsCount(0))
    }

    @Test
    fun itemsCount_singularItem() {
        assertEquals("1 item", formatItemsCount(1))
    }

    @Test
    fun itemsCount_pluralItems() {
        assertEquals("3 items", formatItemsCount(3))
    }

    @Test
    fun itemsCount_manyItems() {
        assertEquals("50 items", formatItemsCount(50))
    }

    @Test
    fun itemsCount_fromOrderLines() {
        val order = OrderDetails(
            lines = listOf(
                OrderDetails.OrderLineDetail(product_id = 101, qtyentered = 2.0),
                OrderDetails.OrderLineDetail(product_id = 102, qtyentered = 1.0),
                OrderDetails.OrderLineDetail(product_id = 103, qtyentered = 3.0)
            )
        )
        assertEquals(3, order.lines.size)
        assertEquals("3 items", formatItemsCount(order.lines.size))
    }

    @Test
    fun itemsCount_totalQuantity() {
        val order = OrderDetails(
            qtytotal = 6.0,
            lines = listOf(
                OrderDetails.OrderLineDetail(qtyentered = 2.0),
                OrderDetails.OrderLineDetail(qtyentered = 1.0),
                OrderDetails.OrderLineDetail(qtyentered = 3.0)
            )
        )
        assertEquals(6.0, order.qtytotal, 0.01)
    }

    // ========== GRAND TOTAL DISPLAY WITH CURRENCY ==========

    @Test
    fun grandTotalDisplay_withCurrency() {
        val order = OrderDetails(grandtotal = 575.00, currency = "MUR")
        val display = formatCurrency(order.grandtotal, order.currency)

        assertEquals("Rs 575.00", display)
    }

    @Test
    fun grandTotalDisplay_zeroTotal() {
        val order = OrderDetails(grandtotal = 0.0, currency = "USD")
        val display = formatCurrency(order.grandtotal, order.currency)

        assertEquals("$ 0.00", display)
    }

    @Test
    fun grandTotalDisplay_refundNegative() {
        val order = OrderDetails(grandtotal = -230.0, currency = "EUR")
        val display = formatCurrency(order.grandtotal, order.currency)

        assertEquals("\u20AC -230.00", display)
    }

    @Test
    fun grandTotalDisplay_priceFormatting() {
        // Verify NumberUtils formatting is consistent
        assertEquals("575.00", NumberUtils.formatPrice(575.0))
        assertEquals("0.00", NumberUtils.formatPrice(0.0))
        assertEquals("-230.00", NumberUtils.formatPrice(-230.0))
    }

    // ========== CUSTOMER NAME TRUNCATION ==========

    @Test
    fun customerName_shortName_noTruncation() {
        assertEquals("John Doe", truncateCustomerName("John Doe"))
    }

    @Test
    fun customerName_exactMaxLength_noTruncation() {
        val name = "A".repeat(20)
        assertEquals(name, truncateCustomerName(name, 20))
    }

    @Test
    fun customerName_longName_truncatedWithEllipsis() {
        val longName = "Alexander Christopher Johnson III"
        val truncated = truncateCustomerName(longName, 20)

        assertTrue(truncated.endsWith("..."))
        assertEquals(20, truncated.length)
        assertEquals("Alexander Christo...", truncated)
    }

    @Test
    fun customerName_veryLongName() {
        val veryLong = "A".repeat(100)
        val truncated = truncateCustomerName(veryLong, 20)

        assertEquals(20, truncated.length)
        assertTrue(truncated.endsWith("..."))
    }

    // ========== EMPTY/NULL CUSTOMER NAME ==========

    @Test
    fun customerName_null_showsDefault() {
        assertEquals("Walk-in Customer", truncateCustomerName(null))
    }

    @Test
    fun customerName_empty_showsDefault() {
        assertEquals("Walk-in Customer", truncateCustomerName(""))
    }

    @Test
    fun customerName_blank_showsDefault() {
        assertEquals("Walk-in Customer", truncateCustomerName("   "))
    }

    @Test
    fun customerName_orderDetailsNullCustomer() {
        val order = OrderDetails(customer_name = null)
        val display = truncateCustomerName(order.customer_name)

        assertEquals("Walk-in Customer", display)
    }

    @Test
    fun customerName_orderDetailsWithCustomer() {
        val order = OrderDetails(customer_name = "Jane Smith")
        val display = truncateCustomerName(order.customer_name)

        assertEquals("Jane Smith", display)
    }

    // ========== ORDER JSON ROUND-TRIP ==========

    @Test
    fun orderJson_roundTrip_preservesFields() {
        val order = OrderDetails(
            documentno = "POS-00042",
            grandtotal = 373.75,
            status = "CO",
            currency = "MUR",
            customer_name = "Test Customer",
            qtytotal = 3.0
        )

        val json = order.toJson()
        val restored = OrderDetails.fromJson(json)

        assertNotNull(restored)
        assertEquals(order.documentno, restored!!.documentno)
        assertEquals(order.grandtotal, restored.grandtotal, 0.01)
        assertEquals(order.status, restored.status)
        assertEquals(order.currency, restored.currency)
        assertEquals(order.customer_name, restored.customer_name)
        assertEquals(order.qtytotal, restored.qtytotal, 0.01)
    }

    @Test
    fun orderJson_roundTrip_preservesPayments() {
        val order = OrderDetails(
            grandtotal = 500.0,
            payments = listOf(
                OrderDetails.PaymentDetail(amount = 300.0, paymenttype = "Cash", tendered = 300.0),
                OrderDetails.PaymentDetail(amount = 200.0, paymenttype = "Card", tendered = 200.0)
            )
        )

        val json = order.toJson()
        val restored = OrderDetails.fromJson(json)

        assertNotNull(restored)
        assertEquals(2, restored!!.payments.size)
        assertEquals(300.0, restored.payments[0].amount, 0.01)
        assertEquals("Card", restored.payments[1].paymenttype)
    }
}
