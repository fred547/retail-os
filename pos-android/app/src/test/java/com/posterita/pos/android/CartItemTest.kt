package com.posterita.pos.android

import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.local.entity.Tax
import com.posterita.pos.android.domain.model.CartItem
import org.junit.Assert.*
import org.junit.Test

class CartItemTest {

    private fun createProduct(
        id: Int = 1,
        name: String = "Test Product",
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
        rate: Double = 15.0,
        name: String = "VAT",
        taxCode: String = "VAT15"
    ) = Tax(
        tax_id = id,
        rate = rate,
        name = name,
        taxcode = taxCode
    )

    // === TAX-EXCLUSIVE CALCULATIONS ===

    @Test
    fun updateTotals_taxExclusive_singleQty() {
        val product = createProduct(sellingPrice = 100.0, isTaxIncluded = "N")
        val tax = createTax(rate = 15.0)
        val item = CartItem(product = product, lineNo = "1", qty = 1.0, priceEntered = 100.0, tax = tax)

        item.updateTotals()

        assertEquals(100.0, item.lineAmt, 0.01)    // qty * price = 100
        assertEquals(15.0, item.taxAmt, 0.01)       // 100 * 15/100 = 15
        assertEquals(115.0, item.lineNetAmt, 0.01)   // 100 + 15 = 115
    }

    @Test
    fun updateTotals_taxExclusive_multipleQty() {
        val product = createProduct(sellingPrice = 50.0, isTaxIncluded = "N")
        val tax = createTax(rate = 10.0)
        val item = CartItem(product = product, lineNo = "1", qty = 3.0, priceEntered = 50.0, tax = tax)

        item.updateTotals()

        assertEquals(150.0, item.lineAmt, 0.01)     // 3 * 50 = 150
        assertEquals(15.0, item.taxAmt, 0.01)        // 150 * 10/100 = 15
        assertEquals(165.0, item.lineNetAmt, 0.01)   // 150 + 15 = 165
    }

    // === TAX-INCLUSIVE CALCULATIONS ===

    @Test
    fun updateTotals_taxInclusive_singleQty() {
        val product = createProduct(sellingPrice = 115.0, isTaxIncluded = "Y")
        val tax = createTax(rate = 15.0)
        val item = CartItem(product = product, lineNo = "1", qty = 1.0, priceEntered = 115.0, tax = tax)

        item.updateTotals()

        // Tax inclusive: lineNetAmt = lineAmt (original), tax is backed out
        assertEquals(115.0, item.lineNetAmt, 0.01)
        assertEquals(15.0, item.taxAmt, 0.01)        // 115 * (1 - 100/(100+15)) = 15
        assertEquals(100.0, item.lineAmt, 0.01)       // 115 - 15 = 100
    }

    @Test
    fun updateTotals_taxInclusive_multipleQty() {
        val product = createProduct(sellingPrice = 230.0, isTaxIncluded = "Y")
        val tax = createTax(rate = 15.0)
        val item = CartItem(product = product, lineNo = "1", qty = 2.0, priceEntered = 230.0, tax = tax)

        item.updateTotals()

        // lineAmt = 2 * 230 = 460 initially
        assertEquals(460.0, item.lineNetAmt, 0.01)
        // tax = 460 * (1 - 100/115) = 60
        assertEquals(60.0, item.taxAmt, 0.01)
        // lineAmt = 460 - 60 = 400
        assertEquals(400.0, item.lineAmt, 0.01)
    }

    // === ZERO TAX ===

    @Test
    fun updateTotals_zeroTaxRate() {
        val product = createProduct(sellingPrice = 100.0, isTaxIncluded = "N")
        val tax = createTax(rate = 0.0)
        val item = CartItem(product = product, lineNo = "1", qty = 1.0, priceEntered = 100.0, tax = tax)

        item.updateTotals()

        assertEquals(100.0, item.lineAmt, 0.01)
        assertEquals(0.0, item.taxAmt, 0.01)
        assertEquals(100.0, item.lineNetAmt, 0.01)
    }

    @Test
    fun updateTotals_noTax() {
        val product = createProduct(sellingPrice = 100.0, isTaxIncluded = "N")
        val item = CartItem(product = product, lineNo = "1", qty = 1.0, priceEntered = 100.0, tax = null)

        item.updateTotals()

        assertEquals(100.0, item.lineAmt, 0.01)
        assertEquals(0.0, item.taxAmt, 0.01)
        assertEquals(100.0, item.lineNetAmt, 0.01)
    }

    // === DISCOUNT ===

    @Test
    fun updateTotals_withDiscount_taxExclusive() {
        val product = createProduct(sellingPrice = 100.0, isTaxIncluded = "N")
        val tax = createTax(rate = 15.0)
        val item = CartItem(
            product = product, lineNo = "1", qty = 1.0, priceEntered = 100.0,
            tax = tax, originalDiscountPercentage = 10.0
        )

        item.updateTotals()

        // lineAmt = 100 - 10% discount = 90
        assertEquals(10.0, item.discountAmt, 0.01)
        assertEquals(90.0, item.lineAmt, 0.01)
        // tax = 90 * 15/100 = 13.5
        assertEquals(13.5, item.taxAmt, 0.01)
        // lineNetAmt = 90 + 13.5 = 103.5
        assertEquals(103.5, item.lineNetAmt, 0.01)
    }

    @Test
    fun updateTotals_withDiscount_taxInclusive() {
        val product = createProduct(sellingPrice = 115.0, isTaxIncluded = "Y")
        val tax = createTax(rate = 15.0)
        val item = CartItem(
            product = product, lineNo = "1", qty = 1.0, priceEntered = 115.0,
            tax = tax, originalDiscountPercentage = 10.0
        )

        item.updateTotals()

        // Initial lineAmt = 115, discount = 115 * 10/100 = 11.5
        assertEquals(11.5, item.discountAmt, 0.01)
        // After discount: 115 - 11.5 = 103.5, this becomes lineNetAmt (tax inclusive)
        assertEquals(103.5, item.lineNetAmt, 0.01)
    }

    // === COST CALCULATION ===

    @Test
    fun updateTotals_costAmount() {
        val product = createProduct(sellingPrice = 100.0, costPrice = 60.0)
        val item = CartItem(product = product, lineNo = "1", qty = 2.0, priceEntered = 100.0)

        item.updateTotals()

        assertEquals(120.0, item.costAmt, 0.01) // 60 * 2 = 120
    }

    @Test
    fun updateTotals_zeroCostPrice() {
        val product = createProduct(sellingPrice = 100.0, costPrice = 0.0)
        val item = CartItem(product = product, lineNo = "1", qty = 3.0, priceEntered = 100.0)

        item.updateTotals()

        assertEquals(0.0, item.costAmt, 0.01)
    }

    // === FRACTIONAL QUANTITIES ===

    @Test
    fun updateTotals_fractionalQty() {
        val product = createProduct(sellingPrice = 10.0, isTaxIncluded = "N")
        val tax = createTax(rate = 15.0)
        val item = CartItem(product = product, lineNo = "1", qty = 0.5, priceEntered = 10.0, tax = tax)

        item.updateTotals()

        assertEquals(5.0, item.lineAmt, 0.01)      // 0.5 * 10 = 5
        assertEquals(0.75, item.taxAmt, 0.01)        // 5 * 15/100 = 0.75
        assertEquals(5.75, item.lineNetAmt, 0.01)    // 5 + 0.75 = 5.75
    }

    // === CLONE ===

    @Test
    fun clone_createsIndependentCopy() {
        val product = createProduct()
        val tax = createTax()
        val item = CartItem(product = product, lineNo = "1", qty = 2.0, priceEntered = 100.0, tax = tax)
        item.updateTotals()

        val cloned = item.clone()

        assertEquals(item.qty, cloned.qty, 0.01)
        assertEquals(item.lineAmt, cloned.lineAmt, 0.01)
        assertEquals(item.lineNo, cloned.lineNo)

        // Modify clone should not affect original
        cloned.qty = 5.0
        assertEquals(2.0, item.qty, 0.01)
    }
}
