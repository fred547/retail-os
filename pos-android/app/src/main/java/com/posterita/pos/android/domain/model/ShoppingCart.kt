package com.posterita.pos.android.domain.model

import com.posterita.pos.android.data.local.dao.ProductDao
import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.local.entity.Tax
import com.posterita.pos.android.util.NumberUtils
import org.json.JSONArray
import org.json.JSONObject

enum class CartType { SALES, REFUND }

class ShoppingCart(val type: CartType = CartType.SALES) {

    val cartItems: LinkedHashMap<String, CartItem> = linkedMapOf()
    val productQtyMap: MutableMap<Int, Double> = mutableMapOf()
    val appliedCoupons: MutableMap<Int, Double> = mutableMapOf()

    var totalQty: Double = 0.0; private set
    var taxTotalAmount: Double = 0.0; private set
    var subTotalAmount: Double = 0.0; private set
    var grandTotalAmount: Double = 0.0; private set
    var costTotalAmount: Double = 0.0; private set
    var discountTotalAmount: Double = 0.0; private set
    var tipsAmount: Double = 0.0
    var tipsPercentage: Double = 0.0
    var note: String? = null
    var orderType: String = "dine_in" // "dine_in" or "take_away"
    var discountOnTotalPercentage: Double = 0.0
    var discountOnTotalAmount: Double = 0.0
    private var lineNo: Int = 0

    fun addProduct(product: Product, taxCache: Map<Int, Tax>) {
        // Check if product already in cart
        val existing = cartItems.values.find { it.product.product_id == product.product_id }
        if (existing != null) {
            existing.qty += 1
            existing.updateTotals()
        } else {
            lineNo++
            val tax = taxCache[product.tax_id]
            val item = CartItem(
                product = product,
                lineNo = lineNo.toString(),
                qty = 1.0,
                priceEntered = product.sellingprice,
                tax = tax
            )
            item.updateTotals()
            cartItems[item.lineNo] = item
        }
        recalculateTotals()
    }

    fun addProductWithQty(product: Product, qty: Double, taxCache: Map<Int, Tax>) {
        lineNo++
        val tax = taxCache[product.tax_id]
        val item = CartItem(
            product = product,
            lineNo = lineNo.toString(),
            qty = qty,
            priceEntered = product.sellingprice,
            tax = tax
        )
        item.updateTotals()
        cartItems[item.lineNo] = item
        recalculateTotals()
    }

    fun addProductWithPrice(product: Product, price: Double, taxCache: Map<Int, Tax>) {
        lineNo++
        val tax = taxCache[product.tax_id]
        val item = CartItem(
            product = product,
            lineNo = lineNo.toString(),
            qty = 1.0,
            priceEntered = price,
            tax = tax
        )
        item.updateTotals()
        cartItems[item.lineNo] = item
        recalculateTotals()
    }

    fun addProductWithQtyAndPrice(product: Product, qty: Double, price: Double, taxCache: Map<Int, Tax>) {
        lineNo++
        val tax = taxCache[product.tax_id]
        val item = CartItem(
            product = product,
            lineNo = lineNo.toString(),
            qty = qty,
            priceEntered = price,
            tax = tax
        )
        item.updateTotals()
        cartItems[item.lineNo] = item
        recalculateTotals()
    }

    fun addOrUpdateLine(cartItem: CartItem) {
        cartItem.updateTotals()
        cartItems[cartItem.lineNo] = cartItem
        recalculateTotals()
    }

    fun removeProduct(lineNo: String) {
        cartItems.remove(lineNo)
        recalculateTotals()
    }

    fun updateProductQty(lineNo: String, qty: Double) {
        val item = cartItems[lineNo] ?: return
        if (qty <= 0) {
            cartItems.remove(lineNo)
        } else {
            item.qty = qty
            item.updateTotals()
        }
        recalculateTotals()
    }

    fun increaseQty(lineNo: String) {
        val item = cartItems[lineNo] ?: return
        if (type == CartType.REFUND && item.qty >= item.initialQty) return
        item.qty += 1
        item.updateTotals()
        recalculateTotals()
    }

    fun decreaseQty(lineNo: String) {
        val item = cartItems[lineNo] ?: return
        if (item.qty <= 1) {
            cartItems.remove(lineNo)
        } else {
            item.qty -= 1
            item.updateTotals()
        }
        recalculateTotals()
    }

    fun removeLine(lineNo: String) {
        val item = cartItems.remove(lineNo)
        // Remove associated coupon if this is a coupon line
        if (item?.product?.name?.startsWith("Coupon Code") == true) {
            appliedCoupons.entries.removeAll { it.key == item.discountCodeId }
        }
        recalculateTotals()
    }

    fun splitLine(lineNo: String, qty: Double) {
        val item = cartItems[lineNo] ?: return
        if (qty >= item.qty) return

        val newItem = item.clone().copy(
            lineNo = "${lineNo}_1",
            qty = qty
        )
        item.qty -= qty
        item.updateTotals()
        newItem.updateTotals()
        cartItems[newItem.lineNo] = newItem
        recalculateTotals()
    }

    fun updatePrice(lineNo: String, price: Double) {
        val item = cartItems[lineNo] ?: return
        item.priceEntered = price
        item.updateTotals()
        recalculateTotals()
    }

    fun updateTax(lineNo: String, tax: Tax?) {
        val item = cartItems[lineNo] ?: return
        item.tax = tax
        item.updateTotals()
        recalculateTotals()
    }

    fun clearCart() {
        cartItems.clear()
        productQtyMap.clear()
        appliedCoupons.clear()
        note = null
        orderType = "dine_in"
        tipsAmount = 0.0
        tipsPercentage = 0.0
        discountOnTotalPercentage = 0.0
        discountOnTotalAmount = 0.0
        lineNo = 0
        recalculateTotals()
    }

    fun recalculateTotals() {
        var qty = 0.0
        var tax = 0.0
        var sub = 0.0
        var grand = 0.0
        var cost = 0.0
        var discount = 0.0

        productQtyMap.clear()

        for (item in cartItems.values) {
            qty += item.qty
            tax += item.taxAmt
            sub += item.lineAmt
            grand += item.lineNetAmt
            cost += item.costAmt
            discount += item.discountAmt

            productQtyMap[item.product.product_id] =
                (productQtyMap[item.product.product_id] ?: 0.0) + item.qty
        }

        // Special case: if single coupon item, zero out
        if (cartItems.size == 1) {
            val single = cartItems.values.first()
            if (single.product.name?.startsWith("Coupon Code") == true) {
                grand = 0.0
            }
        }

        // Apply discount on total (percentage or fixed amount)
        if (discountOnTotalPercentage > 0) {
            val totalDisc = NumberUtils.parseDouble(NumberUtils.formatPrice(grand * discountOnTotalPercentage / 100.0))
            discount += totalDisc
            grand -= totalDisc
        } else if (discountOnTotalAmount > 0) {
            val totalDisc = minOf(discountOnTotalAmount, grand)
            discount += totalDisc
            grand -= totalDisc
        }

        totalQty = NumberUtils.parseDouble(NumberUtils.formatPrice(qty))
        taxTotalAmount = NumberUtils.parseDouble(NumberUtils.formatPrice(tax))
        subTotalAmount = NumberUtils.parseDouble(NumberUtils.formatPrice(sub))
        grandTotalAmount = NumberUtils.parseDouble(NumberUtils.formatPrice(grand))
        costTotalAmount = NumberUtils.parseDouble(NumberUtils.formatPrice(cost))
        discountTotalAmount = NumberUtils.parseDouble(NumberUtils.formatPrice(discount))
    }

    fun negateForRefund() {
        for (item in cartItems.values) {
            item.qty = -item.qty
            item.updateTotals()
        }
        recalculateTotals()
    }

    fun isEmpty(): Boolean = cartItems.isEmpty()

    fun getItemCount(): Int = cartItems.size

    // ==================== JSON SERIALIZATION ====================

    /** Serialize the entire cart state to a JSONObject for hold/kitchen order storage. */
    fun toJson(): JSONObject {
        val itemsArray = JSONArray()
        for (cartItem in cartItems.values) {
            itemsArray.put(cartItem.toJson())
        }
        return JSONObject().apply {
            put("items", itemsArray)
            put("note", note ?: "")
            put("orderType", orderType)
            put("tipsAmount", tipsAmount)
            put("tipsPercentage", tipsPercentage)
            put("grandtotal", grandTotalAmount)
            put("discountOnTotalPercentage", discountOnTotalPercentage)
            put("discountOnTotalAmount", discountOnTotalAmount)
        }
    }

    /**
     * Restore cart state from a JSONObject (hold/kitchen order).
     * Requires a ProductDao and tax cache to look up full product objects.
     * Must be called from a coroutine (IO dispatcher).
     */
    suspend fun restoreFromJson(json: JSONObject, productDao: ProductDao, taxCache: Map<Int, Tax>) {
        clearCart()

        val items = json.optJSONArray("items")
        if (items != null) {
            for (i in 0 until items.length()) {
                val itemJson = items.optJSONObject(i) ?: continue
                val productId = itemJson.optInt("product_id", 0)
                if (productId == 0) continue
                val qty = itemJson.optDouble("qty", 1.0)
                val price = itemJson.optDouble("price", 0.0)

                val product = productDao.getProductByIdSync(productId) ?: continue
                val tax = taxCache[product.tax_id]
                val cartItem = CartItem(
                    product = product,
                    lineNo = itemJson.optString("lineNo", ""),
                    qty = qty,
                    priceEntered = price,
                    tax = tax
                )
                cartItem.modifiers = itemJson.optString("modifiers").ifEmpty { null }
                cartItem.note = itemJson.optString("note").ifEmpty { null }
                cartItem.updateTotals()
                addOrUpdateLine(cartItem)
            }
        }

        // Restore lineNo counter so new items don't collide with restored keys
        lineNo = cartItems.keys.mapNotNull { it.toIntOrNull() }.maxOrNull() ?: 0

        note = json.optString("note").ifEmpty { null }
        tipsAmount = json.optDouble("tipsAmount", 0.0)
        tipsPercentage = json.optDouble("tipsPercentage", 0.0)
        orderType = json.optString("orderType", "dine_in")
        discountOnTotalPercentage = json.optDouble("discountOnTotalPercentage", 0.0)
        discountOnTotalAmount = json.optDouble("discountOnTotalAmount", 0.0)
        recalculateTotals()
    }
}
