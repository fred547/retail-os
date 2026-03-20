package com.posterita.pos.android

import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.util.NumberUtils
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner

/**
 * Tests for payment calculations using OrderDetails and PaymentDetail models,
 * covering exact payment, overpayment/change, split payments, refunds,
 * tips, discounts, rounding, and large amounts.
 */
@RunWith(RobolectricTestRunner::class)
class PaymentCalculationTest {

    // ========== HELPERS ==========

    /** Build a minimal OrderDetails with the given grand total. */
    private fun orderWithTotal(grandTotal: Double): OrderDetails = OrderDetails(
        grandtotal = grandTotal,
        subtotal = grandTotal,
        status = "CO"
    )

    /** Build a single payment entry. */
    private fun payment(
        amount: Double,
        tendered: Double = amount,
        type: String = "Cash"
    ): OrderDetails.PaymentDetail = OrderDetails.PaymentDetail(
        amount = amount,
        tendered = tendered,
        change = if (tendered > amount) NumberUtils.parseDouble(
            NumberUtils.formatPrice(tendered - amount)
        ) else 0.0,
        paymenttype = type,
        payamt = amount
    )

    /** Sum of all payment amounts. */
    private fun totalPaid(payments: List<OrderDetails.PaymentDetail>): Double =
        NumberUtils.parseDouble(NumberUtils.formatPrice(payments.sumOf { it.amount }))

    /** Sum of all change given. */
    private fun totalChange(payments: List<OrderDetails.PaymentDetail>): Double =
        NumberUtils.parseDouble(NumberUtils.formatPrice(payments.sumOf { it.change }))

    // ========== EXACT PAYMENT ==========

    @Test
    fun exactPayment_changeIsZero() {
        val order = orderWithTotal(230.0)
        val pay = payment(amount = 230.0, tendered = 230.0)

        assertEquals(0.0, pay.change, 0.01)
        assertEquals(order.grandtotal, pay.amount, 0.01)
    }

    @Test
    fun exactPayment_tenderedEqualsGrandTotal() {
        val order = orderWithTotal(373.75)
        val pay = payment(amount = 373.75, tendered = 373.75)

        assertEquals(order.grandtotal, pay.tendered, 0.01)
        assertEquals(0.0, pay.change, 0.01)
    }

    // ========== OVERPAYMENT WITH CHANGE ==========

    @Test
    fun overpayment_changeCalculatedCorrectly() {
        val order = orderWithTotal(230.0)
        val pay = payment(amount = 230.0, tendered = 250.0)

        assertEquals(20.0, pay.change, 0.01)
    }

    @Test
    fun overpayment_largeChange() {
        val order = orderWithTotal(86.25)
        val pay = payment(amount = 86.25, tendered = 200.0)

        assertEquals(113.75, pay.change, 0.01)
    }

    @Test
    fun overpayment_roundedChange() {
        val order = orderWithTotal(33.33)
        val pay = payment(amount = 33.33, tendered = 50.0)

        assertEquals(16.67, pay.change, 0.01)
    }

    // ========== SPLIT PAYMENT (CASH + CARD) ==========

    @Test
    fun splitPayment_cashAndCard_coversTotal() {
        val order = orderWithTotal(500.0)
        val cashPayment = payment(amount = 200.0, tendered = 200.0, type = "Cash")
        val cardPayment = payment(amount = 300.0, tendered = 300.0, type = "Card")
        val payments = listOf(cashPayment, cardPayment)

        assertEquals(order.grandtotal, totalPaid(payments), 0.01)
        assertEquals(0.0, totalChange(payments), 0.01)
    }

    @Test
    fun splitPayment_threeWay() {
        val order = orderWithTotal(1000.0)
        val cash = payment(amount = 400.0, tendered = 400.0, type = "Cash")
        val card = payment(amount = 350.0, tendered = 350.0, type = "Card")
        val voucher = payment(amount = 250.0, tendered = 250.0, type = "Voucher")
        val payments = listOf(cash, card, voucher)

        assertEquals(order.grandtotal, totalPaid(payments), 0.01)
    }

    @Test
    fun splitPayment_cashOverpaidPortionWithChange() {
        val order = orderWithTotal(500.0)
        // Customer pays 300 cash (tendered 350, change 50) + 200 card
        val cashPayment = payment(amount = 300.0, tendered = 350.0, type = "Cash")
        val cardPayment = payment(amount = 200.0, tendered = 200.0, type = "Card")
        val payments = listOf(cashPayment, cardPayment)

        assertEquals(order.grandtotal, totalPaid(payments), 0.01)
        assertEquals(50.0, cashPayment.change, 0.01)
        assertEquals(0.0, cardPayment.change, 0.01)
    }

    // ========== ZERO TOTAL ORDER ==========

    @Test
    fun zeroTotalOrder_noPaymentNeeded() {
        val order = orderWithTotal(0.0)
        val pay = payment(amount = 0.0, tendered = 0.0)

        assertEquals(0.0, pay.amount, 0.01)
        assertEquals(0.0, pay.change, 0.01)
    }

    // ========== PAYMENT WITH TIPS ==========

    @Test
    fun paymentWithTips_tipsAddedToTotal() {
        val order = orderWithTotal(230.0)
        order.tipsamt = 20.0
        val effectiveTotal = order.grandtotal + order.tipsamt

        val pay = payment(amount = effectiveTotal, tendered = effectiveTotal)

        assertEquals(250.0, pay.amount, 0.01)
        assertEquals(0.0, pay.change, 0.01)
    }

    @Test
    fun paymentWithTips_overpaymentCalculation() {
        val order = orderWithTotal(230.0)
        order.tipsamt = 15.0
        val effectiveTotal = order.grandtotal + order.tipsamt // 245

        val pay = payment(amount = effectiveTotal, tendered = 300.0)

        assertEquals(55.0, pay.change, 0.01)
    }

    // ========== PAYMENT WITH DISCOUNT ==========

    @Test
    fun paymentWithDiscount_reducedTotal() {
        val order = orderWithTotal(230.0)
        order.discountamt = 23.0  // 10% discount
        val effectiveTotal = order.grandtotal - order.discountamt // 207

        val pay = payment(amount = effectiveTotal, tendered = effectiveTotal)

        assertEquals(207.0, pay.amount, 0.01)
        assertEquals(0.0, pay.change, 0.01)
    }

    @Test
    fun paymentWithDiscount_fullDiscount() {
        val order = orderWithTotal(100.0)
        order.discountamt = 100.0
        val effectiveTotal = order.grandtotal - order.discountamt // 0

        val pay = payment(amount = effectiveTotal, tendered = 0.0)

        assertEquals(0.0, pay.amount, 0.01)
        assertEquals(0.0, pay.change, 0.01)
    }

    // ========== NEGATIVE PAYMENT (REFUND) ==========

    @Test
    fun refundPayment_negativeAmount() {
        val order = orderWithTotal(-230.0)
        order.status = "VO"
        val pay = payment(amount = -230.0, tendered = -230.0, type = "Cash")

        assertEquals(-230.0, pay.amount, 0.01)
        assertTrue(pay.amount < 0)
    }

    @Test
    fun refundPayment_multipleItems() {
        val order = orderWithTotal(-316.25)
        order.status = "VO"
        val pay = payment(amount = -316.25, tendered = -316.25, type = "Cash")

        assertEquals(-316.25, pay.amount, 0.01)
    }

    // ========== LARGE AMOUNT PAYMENT (>100,000) ==========

    @Test
    fun largeAmountPayment_exactPayment() {
        val order = orderWithTotal(150000.00)
        val pay = payment(amount = 150000.00, tendered = 150000.00)

        assertEquals(150000.00, pay.amount, 0.01)
        assertEquals(0.0, pay.change, 0.01)
    }

    @Test
    fun largeAmountPayment_withChange() {
        val order = orderWithTotal(123456.78)
        val pay = payment(amount = 123456.78, tendered = 125000.00)

        assertEquals(1543.22, pay.change, 0.01)
    }

    @Test
    fun largeAmountPayment_splitAcrossMultipleMethods() {
        val order = orderWithTotal(250000.00)
        val cash = payment(amount = 50000.00, type = "Cash")
        val card = payment(amount = 100000.00, type = "Card")
        val transfer = payment(amount = 100000.00, type = "BankTransfer")
        val payments = listOf(cash, card, transfer)

        assertEquals(order.grandtotal, totalPaid(payments), 0.01)
    }

    // ========== PAYMENT ROUNDING ==========

    @Test
    fun paymentRounding_twoDecimalPlaces() {
        val total = NumberUtils.parseDouble(NumberUtils.formatPrice(33.333))
        assertEquals(33.33, total, 0.001)
    }

    @Test
    fun paymentRounding_changeRoundedCorrectly() {
        // 99.99 tendered for 66.66 total = 33.33 change
        val pay = payment(amount = 66.66, tendered = 99.99)
        assertEquals(33.33, pay.change, 0.01)
    }

    @Test
    fun paymentRounding_smallAmounts() {
        val pay = payment(amount = 0.01, tendered = 0.05)
        assertEquals(0.04, pay.change, 0.001)
    }

    // ========== MULTIPLE PAYMENT METHODS TOTALING GRAND TOTAL ==========

    @Test
    fun multiplePayments_exactlyCoverGrandTotal() {
        val order = orderWithTotal(575.00) // Steak order
        val payments = listOf(
            payment(amount = 200.0, type = "Cash"),
            payment(amount = 175.0, type = "Card"),
            payment(amount = 100.0, type = "Voucher"),
            payment(amount = 100.0, type = "BankTransfer")
        )

        assertEquals(order.grandtotal, totalPaid(payments), 0.01)
    }

    @Test
    fun multiplePayments_withFractionalAmounts() {
        val order = orderWithTotal(373.75)
        val payments = listOf(
            payment(amount = 100.00, type = "Cash"),
            payment(amount = 123.75, type = "Card"),
            payment(amount = 150.00, type = "Voucher")
        )

        assertEquals(order.grandtotal, totalPaid(payments), 0.01)
    }

    // ========== ORDER PAYMENT FIELDS ==========

    @Test
    fun orderDetails_tenderedAndChangeFields() {
        val order = orderWithTotal(230.0)
        order.tendered = 250.0
        order.change = 20.0

        assertEquals(250.0, order.tendered, 0.01)
        assertEquals(20.0, order.change, 0.01)
        assertEquals(order.tendered - order.grandtotal, order.change, 0.01)
    }

    @Test
    fun orderDetails_paymentTypeRecorded() {
        val order = orderWithTotal(230.0)
        order.paymenttype = "Cash"
        order.payments = listOf(payment(amount = 230.0, type = "Cash"))

        assertEquals("Cash", order.paymenttype)
        assertEquals("Cash", order.payments.first().paymenttype)
    }
}
