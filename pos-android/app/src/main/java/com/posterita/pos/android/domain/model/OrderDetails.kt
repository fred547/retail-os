package com.posterita.pos.android.domain.model

import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import java.io.Serializable

data class OrderDetails(
    var account_id: String? = null,
    var store_id: Int = 0,
    var cashback: Double = 0.0,
    var change: Double = 0.0,
    var costtotal: Double = 0.0,
    var customer_id: Int = 0,
    var customer_name: String? = null,
    var dateordered: Long = 0L,
    var dateorderedfull: String? = null,
    var dateorderedtext: String? = null,
    var discountamt: Double = 0.0,
    var discounts: List<Discount> = emptyList(),
    var documentno: String? = null,
    var grandtotal: Double = 0.0,
    var ispaid: Boolean = false,
    var issync: Boolean = false,
    var lines: List<OrderLineDetail> = emptyList(),
    var loyaltycardno: String? = null,
    var note: String? = null,
    @SerializedName("o_order_id") var oOrderId: Int = 0,
    var openDrawer: Boolean = false,
    var order_id: Int = 0,
    var payments: List<PaymentDetail> = emptyList(),
    var paymenttype: String? = null,
    var printReceipt: Boolean = true,
    var qtytotal: Double = 0.0,
    var status: String? = null,
    var subtotal: Double = 0.0,
    var taxes: List<TaxDetail> = emptyList(),
    var taxtotal: Double = 0.0,
    var tendered: Double = 0.0,
    var terminal_id: Int = 0,
    var terminal_name: String? = null,
    var till_id: Int = 0,
    var till_uuid: String? = null,
    var user_id: Int = 0,
    var user_name: String? = null,
    var uuid: String? = null,
    var vouchers: List<Any> = emptyList(),
    var currency: String? = null,
    var tipsamt: Double = 0.0,
    var couponids: String? = null,
    var account: AccountDetail? = null,
    var store: StoreDetail? = null
) : Serializable {

    data class Discount(
        val discountcode_id: Int = 0,
        val discountamt: Double = 0.0,
        val discountpercentage: Double = 0.0
    ) : Serializable

    data class OrderLineDetail(
        var linenetamt: Double = 0.0,
        var note: String? = null,
        var discountamt: Double = 0.0,
        var discountpercentage: Double = 0.0,
        var discountcode_id: Int = 0,
        var costamt: Double = 0.0,
        var voucher: String? = null,
        var description: String? = null,
        var isbom: String? = null,
        var ismodifier: String? = null,
        var modifiers: String? = null,
        var tax_id: Int = 0,
        var productcategory_id: Int = 0,
        var enabletax: Boolean = true,
        var product_id: Int = 0,
        var priceentered: Double = 0.0,
        var name: String? = null,
        var qtyentered: Double = 0.0,
        var taxcode: String? = null,
        var priceactual: Double = 0.0,
        var isstock: String? = null,
        var productcategoryname: String? = null,
        var taxamt: Double = 0.0,
        var lineamt: Double = 0.0,
        var isKitchenItem: String? = null,
        var istaxincluded: String? = null,
        var image: String? = null
    ) : Serializable

    data class PaymentDetail(
        var tendered: Double = 0.0,
        var documentno: String? = null,
        var amount: Double = 0.0,
        var change: Double = 0.0,
        var type: String? = null,
        var datepaid: Long = 0L,
        var paymenttype: String? = null,
        var payamt: Double = 0.0,
        var status: String? = null,
        var checknumber: String? = null,
        var extraInfo: Map<String, Any>? = null,
        var forexCurrency: String? = null,
        var forexAmount: Double = 0.0,
        var forexRate: Double = 0.0
    ) : Serializable

    data class TaxDetail(
        var name: String? = null,
        var taxcode: String? = null,
        var rate: Double = 0.0,
        var amt: Double = 0.0
    ) : Serializable

    data class AccountDetail(
        var businessname: String? = null,
        var address1: String? = null,
        var phone1: String? = null,
        var receiptmessage: String? = null,
        var currency: String? = null,
        var isvatable: String? = null
    ) : Serializable

    data class StoreDetail(
        var name: String? = null,
        var address: String? = null,
        var city: String? = null,
        var phone1: String? = null
    ) : Serializable

    companion object {
        fun fromJson(json: String): OrderDetails? = try {
            Gson().fromJson(json, OrderDetails::class.java)
        } catch (e: Exception) {
            null
        }
    }

    fun toJson(): String = Gson().toJson(this)
}
