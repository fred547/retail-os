package com.posterita.pos.android

import com.posterita.pos.android.data.local.entity.HoldOrder
import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.local.entity.RestaurantTable
import com.posterita.pos.android.data.local.entity.Tax
import com.posterita.pos.android.domain.model.CartItem
import com.posterita.pos.android.domain.model.ShoppingCart
import org.json.JSONArray
import org.json.JSONObject
import java.sql.Timestamp

/**
 * Shared deterministic test fixtures for the full regression suite.
 *
 * Every test that uses these fixtures starts from the exact same baseline,
 * ensuring repeatability and isolation.
 */
object TestFixtures {

    // ======================== TAX FIXTURES ========================

    val TAX_VAT_15 = Tax(tax_id = 1, rate = 15.0, name = "VAT 15%", taxcode = "VAT15")
    val TAX_VAT_10 = Tax(tax_id = 2, rate = 10.0, name = "VAT 10%", taxcode = "VAT10")
    val TAX_ZERO = Tax(tax_id = 3, rate = 0.0, name = "Zero Rated", taxcode = "ZR")

    val TAX_CACHE: Map<Int, Tax> = mapOf(
        1 to TAX_VAT_15,
        2 to TAX_VAT_10,
        3 to TAX_ZERO
    )

    // ======================== PRODUCT FIXTURES ========================

    val PRODUCT_BURGER = Product(
        product_id = 101,
        name = "Classic Burger",
        sellingprice = 200.0,
        costprice = 80.0,
        tax_id = 1,
        istaxincluded = "N",
        isactive = "Y",
        iskitchenitem = "Y",
        productcategory_id = 10
    )

    val PRODUCT_FRIES = Product(
        product_id = 102,
        name = "French Fries",
        sellingprice = 75.0,
        costprice = 20.0,
        tax_id = 1,
        istaxincluded = "N",
        isactive = "Y",
        iskitchenitem = "Y",
        productcategory_id = 10
    )

    val PRODUCT_COLA = Product(
        product_id = 103,
        name = "Cola",
        sellingprice = 50.0,
        costprice = 15.0,
        tax_id = 1,
        istaxincluded = "N",
        isactive = "Y",
        iskitchenitem = "N",
        productcategory_id = 11
    )

    val PRODUCT_STEAK = Product(
        product_id = 104,
        name = "Grilled Steak",
        sellingprice = 500.0,
        costprice = 200.0,
        tax_id = 1,
        istaxincluded = "N",
        isactive = "Y",
        iskitchenitem = "Y",
        productcategory_id = 10
    )

    val PRODUCT_WATER = Product(
        product_id = 105,
        name = "Mineral Water",
        sellingprice = 30.0,
        costprice = 5.0,
        tax_id = 3,  // zero-rated
        istaxincluded = "N",
        isactive = "Y",
        iskitchenitem = "N",
        productcategory_id = 11
    )

    val PRODUCT_TAX_INCLUSIVE = Product(
        product_id = 106,
        name = "Premium Coffee",
        sellingprice = 115.0,
        costprice = 30.0,
        tax_id = 1,
        istaxincluded = "Y",
        isactive = "Y",
        iskitchenitem = "N",
        productcategory_id = 12
    )

    val PRODUCT_TAX_10 = Product(
        product_id = 107,
        name = "Dessert",
        sellingprice = 150.0,
        costprice = 40.0,
        tax_id = 2,  // 10% tax
        istaxincluded = "N",
        isactive = "Y",
        iskitchenitem = "Y",
        productcategory_id = 13
    )

    val ALL_PRODUCTS = listOf(
        PRODUCT_BURGER, PRODUCT_FRIES, PRODUCT_COLA,
        PRODUCT_STEAK, PRODUCT_WATER, PRODUCT_TAX_INCLUSIVE,
        PRODUCT_TAX_10
    )

    // ======================== TABLE FIXTURES ========================

    val TABLE_1 = RestaurantTable(
        table_id = 1, table_name = "Table 1",
        is_occupied = false, store_id = 1, terminal_id = 1, seats = 4
    )
    val TABLE_2 = RestaurantTable(
        table_id = 2, table_name = "Table 2",
        is_occupied = false, store_id = 1, terminal_id = 1, seats = 6
    )
    val TABLE_3 = RestaurantTable(
        table_id = 3, table_name = "Table 3",
        is_occupied = false, store_id = 1, terminal_id = 1, seats = 2
    )

    // ======================== CONSTANTS ========================

    const val STORE_ID = 1
    const val TERMINAL_ID = 1
    const val TILL_ID = 100

    // ======================== HELPER METHODS ========================

    /** Create a fresh ShoppingCart with deterministic state. */
    fun newCart(): ShoppingCart = ShoppingCart()

    /** Create a cart with specific products already added. */
    fun cartWith(vararg products: Product): ShoppingCart {
        val cart = ShoppingCart()
        for (product in products) {
            cart.addProduct(product, TAX_CACHE)
        }
        return cart
    }

    /** Create a CartItem with calculated totals. */
    fun cartItem(
        product: Product,
        lineNo: String = "1",
        qty: Double = 1.0,
        price: Double = product.sellingprice,
        modifiers: String? = null,
        note: String? = null,
        discount: Double = 0.0
    ): CartItem {
        val tax = TAX_CACHE[product.tax_id]
        val item = CartItem(
            product = product,
            lineNo = lineNo,
            qty = qty,
            priceEntered = price,
            tax = tax,
            originalDiscountPercentage = discount
        )
        item.modifiers = modifiers
        item.note = note
        item.updateTotals()
        return item
    }

    /**
     * Build a kitchen order JSON matching what CartActivity.holdOrderOnTable() produces.
     * This is the canonical JSON format stored in HoldOrder.json.
     */
    fun kitchenOrderJson(
        cart: ShoppingCart,
        tableId: Int = 0,
        tableName: String = "",
        isKitchenOrder: Boolean = true,
        status: String = "new"
    ): JSONObject {
        val json = cart.toJson()
        json.put("isKitchenOrder", isKitchenOrder)
        json.put("status", status)
        if (tableId > 0) {
            json.put("tableId", tableId)
            json.put("tableName", tableName)
        }
        return json
    }

    /** Create a HoldOrder entity as if it were persisted. */
    fun holdOrder(
        id: Int = 0,
        json: JSONObject? = null,
        description: String? = null,
        timestamp: Long = 1710489600000L // Fixed: 2024-03-15 12:00:00 UTC
    ): HoldOrder = HoldOrder(
        holdOrderId = id,
        dateHold = Timestamp(timestamp),
        json = json,
        description = description,
        tillId = TILL_ID,
        terminalId = TERMINAL_ID,
        storeId = STORE_ID
    )

    /**
     * Build a typical 3-item kitchen order for table 1.
     * Burger + Fries + Cola.
     */
    fun typicalKitchenOrder(): Pair<ShoppingCart, JSONObject> {
        val cart = cartWith(PRODUCT_BURGER, PRODUCT_FRIES, PRODUCT_COLA)
        cart.orderType = "dine_in"
        cart.note = "No onions"
        val json = kitchenOrderJson(cart, tableId = 1, tableName = "Table 1")
        return cart to json
    }
}
