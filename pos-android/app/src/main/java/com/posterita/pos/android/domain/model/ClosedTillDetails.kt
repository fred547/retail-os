package com.posterita.pos.android.domain.model

import java.io.Serializable

data class ClosedTillDetails(
    var accountId: String? = null,
    var storeId: Int = 0,
    var storeName: String? = null,
    var terminalId: Int = 0,
    var terminalName: String? = null,
    var openedBy: String? = null,
    var closedBy: String? = null,
    var documentNo: String? = null,
    var dateOpened: Long = 0L,
    var dateClosed: Long = 0L,
    var openingAmt: Double = 0.0,
    var closingAmt: Double = 0.0,
    var cashAmt: Double = 0.0,
    var cardAmt: Double = 0.0,
    var voucherAmt: Double = 0.0,
    var blinkAmt: Double = 0.0,
    var subtotal: Double = 0.0,
    var taxTotal: Double = 0.0,
    var grandTotal: Double = 0.0,
    var adjustmentTotal: Double = 0.0,
    var expectedCash: Double = 0.0,
    var cashDifference: Double = 0.0,
    var salesTotal: Double = 0.0,
    var itemsSold: Int = 0,
    var numberOfOrders: Int = 0,
    var adjustments: List<AdjustmentDetail> = emptyList(),
    var uuid: String? = null,
    var tillId: Int = 0,
    var currency: String? = null,
    var vouchers: String? = null,
    var forexCurrency: String? = null,
    var forexAmt: Double = 0.0,
    var forexSalesTotal: Double = 0.0
) : Serializable {

    data class AdjustmentDetail(
        var amount: Double = 0.0,
        var reason: String? = null,
        var payType: String? = null,
        var date: Long = 0L,
        var userId: Int = 0
    ) : Serializable
}
