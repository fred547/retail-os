package com.posterita.pos.android.domain.model

import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.local.entity.Tax
import com.posterita.pos.android.util.NumberUtils
import org.json.JSONObject
import java.io.Serializable

data class CartItem(
    val product: Product,
    val lineNo: String,
    var qty: Double = 1.0,
    var priceEntered: Double = product.sellingprice,
    var taxAmt: Double = 0.0,
    var lineAmt: Double = 0.0,
    var lineNetAmt: Double = 0.0,
    var discountAmt: Double = 0.0,
    var costAmt: Double = 0.0,
    var initialQty: Double = 0.0,
    var tax: Tax? = null,
    var originalDiscountPercentage: Double = 0.0,
    var description: String? = null,
    var note: String? = null,
    var discountCodeId: Int = 0,
    var isWholeSalePriceApplied: Boolean = false,
    var modifiers: String? = null
) : Serializable, Cloneable {

    fun updateTotals() {
        // Calculate line amount: qty * price
        lineAmt = NumberUtils.parseDouble(NumberUtils.formatPrice(qty * priceEntered))

        // Apply discount
        if (originalDiscountPercentage > 0) {
            discountAmt = NumberUtils.parseDouble(
                NumberUtils.formatPrice((lineAmt * originalDiscountPercentage) / 100.0)
            )
            lineAmt -= discountAmt
        } else {
            discountAmt = 0.0
        }

        // Tax calculation
        val taxRate = tax?.rate ?: 0.0
        val isTaxIncluded = product.istaxincluded == "Y"
        val fixedTaxPerUnit = product.taxamount

        if (fixedTaxPerUnit > 0) {
            // Fixed tax amount per unit (Trendist) — use product.taxamount directly
            taxAmt = NumberUtils.parseDouble(NumberUtils.formatPrice(fixedTaxPerUnit * qty))
            if (isTaxIncluded) {
                // Tax included in price: lineNetAmt = lineAmt, lineAmt = lineAmt - taxAmt
                lineNetAmt = lineAmt
                lineAmt = NumberUtils.parseDouble(NumberUtils.formatPrice(lineAmt - taxAmt))
            } else {
                // Tax excluded from price: lineNetAmt = lineAmt + taxAmt
                lineNetAmt = NumberUtils.parseDouble(NumberUtils.formatPrice(lineAmt + taxAmt))
            }
        } else if (!isTaxIncluded) {
            // Tax exclusive: add tax on top
            taxAmt = NumberUtils.parseDouble(NumberUtils.formatPrice(lineAmt * taxRate / 100.0))
            lineNetAmt = NumberUtils.parseDouble(NumberUtils.formatPrice(lineAmt + taxAmt))
        } else {
            // Tax inclusive: back out tax from price
            taxAmt = NumberUtils.parseDouble(
                NumberUtils.formatPrice(lineAmt * (1 - (100.0 / (100.0 + taxRate))))
            )
            lineNetAmt = lineAmt
            lineAmt = NumberUtils.parseDouble(NumberUtils.formatPrice(lineAmt - taxAmt))
        }

        // Cost
        costAmt = NumberUtils.parseDouble(NumberUtils.formatPrice(product.costprice * qty))
    }

    public override fun clone(): CartItem = copy()

    // Station routing (set before hold/print, null = legacy mode)
    var stationId: Int? = null
    var stationName: String? = null

    /** Serialize this cart item to JSON for hold/kitchen order storage. */
    fun toJson(): JSONObject = JSONObject().apply {
        put("product_id", product.product_id)
        put("product_name", product.name)
        put("qty", qty)
        put("price", priceEntered)
        put("lineNo", lineNo)
        put("taxAmt", taxAmt)
        put("lineAmt", lineAmt)
        put("lineNetAmt", lineNetAmt)
        put("discountAmt", discountAmt)
        put("modifiers", modifiers ?: "")
        put("note", note ?: "")
        put("isKitchenItem", product.iskitchenitem ?: "N")
        stationId?.let { put("station_id", it) }
        stationName?.let { put("station_name", it) }
        put("item_status", "new")
    }
}
