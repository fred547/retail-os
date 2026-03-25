package com.posterita.pos.android.service

import androidx.room.withTransaction
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.dao.*
import com.posterita.pos.android.data.local.entity.*
import com.posterita.pos.android.domain.model.ClosedTillDetails
import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.util.DateUtils
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SharedPreferencesManager
import com.fasterxml.jackson.databind.ObjectMapper
import org.json.JSONObject
import java.sql.Timestamp
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TillService @Inject constructor(
    private val db: AppDatabase,
    private val tillDao: TillDao,
    private val tillAdjustmentDao: TillAdjustmentDao,
    private val orderDao: OrderDao,
    private val sequenceDao: SequenceDao,
    private val userDao: UserDao,
    private val prefsManager: SharedPreferencesManager
) {

    suspend fun openTill(
        account: Account,
        store: Store,
        terminal: Terminal,
        user: User,
        openingAmt: Double
    ): Till {
        // Get/init sequence
        var sequence = sequenceDao.getSequenceByNameForTerminal(
            Sequence.TILL_DOCUMENT_NO, terminal.terminalId
        )
        if (sequence == null) {
            sequence = Sequence(
                terminal_id = terminal.terminalId,
                name = Sequence.TILL_DOCUMENT_NO,
                sequenceNo = terminal.cash_up_sequence,
                prefix = terminal.prefix ?: ""
            )
        }

        val documentNo = generateDocumentNo(sequence)
        val uuid = UUID.randomUUID().toString()
        val now = Timestamp(System.currentTimeMillis())

        val details = ClosedTillDetails(
            accountId = account.account_id,
            storeId = store.storeId,
            storeName = store.name,
            terminalId = terminal.terminalId,
            terminalName = terminal.name,
            openedBy = user.username,
            documentNo = documentNo,
            dateOpened = now.time,
            openingAmt = openingAmt,
            uuid = uuid,
            currency = account.currency
        )

        val till = Till(
            account_id = account.account_id,
            store_id = store.storeId,
            terminal_id = terminal.terminalId,
            openBy = user.user_id,
            openingAmt = openingAmt,
            dateOpened = now,
            isSync = false,
            uuid = uuid,
            documentno = documentNo,
            json = JSONObject(ObjectMapper().writeValueAsString(details))
        )

        db.withTransaction {
            tillDao.insertTill(till)
            sequenceDao.insertSequence(sequence)
        }

        return tillDao.getTillByUUID(uuid) ?: till
    }

    suspend fun closeTill(
        user: User,
        till: Till,
        cashAmt: Double,
        cardAmt: Double,
        forexCurrency: String? = null,
        forexAmt: Double = 0.0
    ): ClosedTillDetails {
        val now = Timestamp(System.currentTimeMillis())
        val orders = orderDao.getOrdersByTillId(till.tillId)

        var cashTotal = 0.0
        var cardTotal = 0.0
        var voucherTotal = 0.0
        var blinkTotal = 0.0
        var forexSalesTotal = 0.0
        var subtotal = 0.0
        var taxTotal = 0.0
        var grandTotal = 0.0
        var itemsSold = 0
        var salesTotal = 0.0

        for (order in orders) {
            val orderDetails = order.json?.let { OrderDetails.fromJson(it.toString()) } ?: continue
            for (payment in orderDetails.payments) {
                when (payment.paymenttype) {
                    "CASH" -> cashTotal += payment.amount
                    "CARD" -> cardTotal += payment.amount
                    "Voucher" -> voucherTotal += payment.amount
                    "BLINK" -> blinkTotal += payment.amount
                    "FOREX" -> {
                        forexSalesTotal += payment.forexAmount
                        cashTotal += payment.amount // forex is still cash in base currency equivalent
                    }
                }
            }
            subtotal += orderDetails.subtotal
            taxTotal += orderDetails.taxtotal
            grandTotal += orderDetails.grandtotal
            itemsSold += orderDetails.qtytotal.toInt()
            salesTotal += orderDetails.grandtotal
        }

        // Get adjustments
        val adjustments = tillAdjustmentDao.getAdjustmentsByTillId(till.tillId)
        var adjustmentTotal = 0.0
        val adjustmentDetails = adjustments.map { adj ->
            if (adj.pay_type == "payin") adjustmentTotal += adj.amount
            else adjustmentTotal -= adj.amount
            ClosedTillDetails.AdjustmentDetail(
                amount = adj.amount,
                reason = adj.reason,
                payType = adj.pay_type,
                date = adj.date,
                userId = adj.user_id
            )
        }

        val expectedCash = till.openingAmt + cashTotal + adjustmentTotal
        val cashDifference = cashAmt - expectedCash

        val closedTillDetails = ClosedTillDetails(
            accountId = till.account_id,
            storeId = till.store_id,
            storeName = null,
            terminalId = till.terminal_id,
            openedBy = userDao.getUserById(till.openBy)?.username,
            closedBy = user.username,
            documentNo = till.documentno,
            dateOpened = till.dateOpened?.time ?: 0L,
            dateClosed = now.time,
            openingAmt = till.openingAmt,
            closingAmt = cashAmt + cardAmt,
            cashAmt = cashAmt,
            cardAmt = cardAmt,
            voucherAmt = voucherTotal,
            blinkAmt = blinkTotal,
            subtotal = subtotal,
            taxTotal = taxTotal,
            grandTotal = grandTotal,
            adjustmentTotal = adjustmentTotal,
            expectedCash = expectedCash,
            cashDifference = cashDifference,
            salesTotal = salesTotal,
            itemsSold = itemsSold,
            numberOfOrders = orders.size,
            adjustments = adjustmentDetails,
            uuid = till.uuid,
            tillId = till.tillId,
            forexCurrency = forexCurrency,
            forexAmt = forexAmt,
            forexSalesTotal = forexSalesTotal
        )

        // Update till entity
        val updatedTill = till.copy(
            closeBy = user.user_id,
            closingAmt = cashAmt + cardAmt,
            dateClosed = now,
            cashamt = cashAmt,
            cardamt = cardAmt,
            subtotal = subtotal,
            taxtotal = taxTotal,
            grandtotal = grandTotal,
            adjustmenttotal = adjustmentTotal,
            vouchers = if (voucherTotal > 0) voucherTotal.toString() else null,
            forexcurrency = forexCurrency,
            forexamt = forexAmt,
            isSync = false,
            json = JSONObject(ObjectMapper().writeValueAsString(closedTillDetails))
        )

        tillDao.updateTill(updatedTill)
        return closedTillDetails
    }

    suspend fun getOpenTill(terminalId: Int): Till? {
        val accountId = prefsManager.accountId
        return if (accountId.isNotEmpty() && accountId != "null") {
            tillDao.getOpenTillByTerminalIdAndAccount(terminalId, accountId)
        } else {
            tillDao.getOpenTillByTerminalId(terminalId)
        }
    }

    private fun generateDocumentNo(sequence: Sequence): String {
        val newSeqNo = sequence.sequenceNo + 1
        return "${sequence.prefix}${String.format("%09d", newSeqNo)}"
    }
}
