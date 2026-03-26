package com.posterita.pos.android.service

import androidx.room.withTransaction
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.dao.OrderDao
import com.posterita.pos.android.data.local.dao.SequenceDao
import com.posterita.pos.android.data.local.entity.*
import com.posterita.pos.android.data.local.entity.Order
import com.posterita.pos.android.domain.model.CartItem
import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.domain.model.ShoppingCart
import com.posterita.pos.android.util.DateUtils
import com.posterita.pos.android.util.NumberUtils
import org.json.JSONObject
import java.sql.Timestamp
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class OrderService @Inject constructor(
    private val db: AppDatabase,
    private val orderDao: OrderDao,
    private val sequenceDao: SequenceDao
) {

    suspend fun createOrder(
        uuid: String,
        cart: ShoppingCart,
        customer: Customer,
        user: User,
        account: Account,
        store: Store,
        terminal: Terminal,
        till: Till,
        payments: List<PaymentInfo>
    ): Order {
        // Get/init sequence
        var sequence = sequenceDao.getSequenceByNameForTerminal(
            Sequence.ORDER_DOCUMENT_NO, terminal.terminalId
        )
        if (sequence == null) {
            sequence = Sequence(
                terminal_id = terminal.terminalId,
                name = Sequence.ORDER_DOCUMENT_NO,
                sequenceNo = terminal.sequence,
                prefix = terminal.prefix ?: ""
            )
        }

        val documentNo = generateDocumentNo(sequence)

        val now = Timestamp(System.currentTimeMillis())
        val orderDetails = buildOrderDetails(
            uuid, documentNo, cart, customer, user, account, store, terminal, till, payments, now
        )

        val order = Order(
            customerId = customer.customer_id,
            salesRepId = user.user_id,
            accountId = account.account_id,
            storeId = store.storeId,
            terminalId = terminal.terminalId,
            tillId = till.tillId,
            tillUuid = till.uuid,
            documentNo = documentNo,
            dateOrdered = now,
            isPaid = true,
            docStatus = "CO",
            currency = account.currency,
            tips = cart.tipsAmount,
            note = cart.note,
            couponids = cart.appliedCoupons.keys.joinToString(",").ifEmpty { null },
            subtotal = cart.subTotalAmount,
            taxTotal = cart.taxTotalAmount,
            grandTotal = cart.grandTotalAmount,
            qtyTotal = cart.totalQty,
            isSync = false,
            uuid = uuid,
            json = JSONObject(orderDetails.toJson()),
            orderType = if (cart.type == com.posterita.pos.android.domain.model.CartType.REFUND) "REFUND" else "SALES"
        )

        // Insert order, payments, and update sequence atomically
        db.withTransaction {
            orderDao.insertOrder(order)

            // Persist structured payment records (separate from JSON blob)
            val paymentEntities = payments.map { p ->
                Payment(
                    orderId = order.orderId,
                    documentNo = documentNo,
                    tendered = p.tendered,
                    amount = p.amount,
                    change = p.change,
                    paymentType = p.paymentType,
                    datePaid = now,
                    payAmt = p.amount,
                    status = "CO",
                    checknumber = p.checkNumber,
                )
            }
            if (paymentEntities.isNotEmpty()) {
                db.paymentDao().insertPayments(paymentEntities)
            }

            sequenceDao.insertSequence(sequence)

            // Mark serialized items as sold
            for (item in cart.cartItems.values) {
                val serialId = item.serialItemId ?: continue
                val serialItem = db.serialItemDao().getById(serialId) ?: continue
                db.serialItemDao().update(serialItem.copy(
                    status = com.posterita.pos.android.data.local.entity.SerialItem.STATUS_SOLD,
                    orderId = order.orderId,
                    customerId = customer.customer_id,
                    soldDate = DateUtils.formatIso(now.time),
                    sellingPrice = item.priceEntered,
                    isSync = false
                ))
            }
        }

        return order
    }

    private fun buildOrderDetails(
        uuid: String,
        documentNo: String,
        cart: ShoppingCart,
        customer: Customer,
        user: User,
        account: Account,
        store: Store,
        terminal: Terminal,
        till: Till,
        payments: List<PaymentInfo>,
        now: Timestamp
    ): OrderDetails {
        val lines = cart.cartItems.values.map { item ->
            OrderDetails.OrderLineDetail(
                product_id = item.product.product_id,
                name = item.product.name,
                qtyentered = item.qty,
                priceentered = item.priceEntered,
                priceactual = item.priceEntered,
                lineamt = item.lineAmt,
                linenetamt = item.lineNetAmt,
                taxamt = item.taxAmt,
                discountamt = item.discountAmt,
                discountpercentage = item.originalDiscountPercentage,
                discountcode_id = item.discountCodeId,
                costamt = item.costAmt,
                tax_id = item.tax?.tax_id ?: 0,
                taxcode = item.tax?.taxcode,
                productcategory_id = item.product.productcategory_id,
                description = item.description ?: item.product.description,
                note = item.note,
                isbom = item.product.isbom,
                ismodifier = item.product.ismodifier,
                isstock = item.product.isstock,
                isKitchenItem = item.product.iskitchenitem,
                istaxincluded = item.product.istaxincluded,
                image = item.product.image,
                modifiers = item.modifiers
            )
        }

        val paymentDetails = payments.map { p ->
            OrderDetails.PaymentDetail(
                tendered = p.tendered,
                amount = p.amount,
                change = p.change,
                paymenttype = p.paymentType,
                type = p.paymentType,
                status = "CO",
                datepaid = now.time,
                documentno = documentNo,
                payamt = p.amount,
                checknumber = p.checkNumber,
                extraInfo = p.extraInfo,
                forexCurrency = p.forexCurrency,
                forexAmount = p.forexAmount,
                forexRate = p.forexRate
            )
        }

        val paymentType = if (payments.size > 1) "MIXED"
        else payments.firstOrNull()?.paymentType ?: "CASH"

        // Aggregate taxes
        val taxMap = mutableMapOf<String, OrderDetails.TaxDetail>()
        for (item in cart.cartItems.values) {
            item.tax?.let { tax ->
                val key = tax.taxcode ?: tax.name ?: "TAX"
                val existing = taxMap[key]
                if (existing != null) {
                    existing.amt += item.taxAmt
                } else {
                    taxMap[key] = OrderDetails.TaxDetail(
                        name = tax.name, taxcode = tax.taxcode,
                        rate = tax.rate, amt = item.taxAmt
                    )
                }
            }
        }

        // Aggregate discounts
        val discountMap = mutableMapOf<Int, OrderDetails.Discount>()
        for (item in cart.cartItems.values) {
            if (item.discountCodeId > 0 && item.discountAmt > 0) {
                val existing = discountMap[item.discountCodeId]
                if (existing != null) {
                    discountMap[item.discountCodeId] = existing.copy(
                        discountamt = existing.discountamt + item.discountAmt
                    )
                } else {
                    discountMap[item.discountCodeId] = OrderDetails.Discount(
                        discountcode_id = item.discountCodeId,
                        discountamt = item.discountAmt,
                        discountpercentage = item.originalDiscountPercentage
                    )
                }
            }
        }

        return OrderDetails(
            uuid = uuid,
            account_id = account.account_id,
            store_id = store.storeId,
            terminal_id = terminal.terminalId,
            terminal_name = terminal.name,
            till_id = till.tillId,
            till_uuid = till.uuid,
            user_id = user.user_id,
            user_name = user.username,
            customer_id = customer.customer_id,
            customer_name = customer.name,
            documentno = documentNo,
            dateordered = now.time,
            dateorderedtext = DateUtils.formatDateTime(now.time),
            grandtotal = cart.grandTotalAmount,
            subtotal = cart.subTotalAmount,
            taxtotal = cart.taxTotalAmount,
            discountamt = cart.discountTotalAmount,
            costtotal = cart.costTotalAmount,
            qtytotal = cart.totalQty,
            tipsamt = cart.tipsAmount,
            ispaid = true,
            issync = false,
            status = "CO",
            paymenttype = paymentType,
            currency = account.currency,
            note = cart.note,
            couponids = cart.appliedCoupons.keys.joinToString(",").ifEmpty { null },
            lines = lines,
            payments = paymentDetails,
            taxes = taxMap.values.toList(),
            discounts = discountMap.values.toList(),
            tendered = payments.sumOf { it.tendered },
            change = payments.sumOf { it.change },
            account = OrderDetails.AccountDetail(
                businessname = account.businessname,
                address1 = account.address1,
                phone1 = account.phone1,
                receiptmessage = account.receiptmessage,
                currency = account.currency,
                isvatable = account.isvatable,
                brn = account.brn,
                tan = account.tan
            ),
            store = OrderDetails.StoreDetail(
                name = store.name,
                address = store.address,
                city = store.city
            ),
            promotion_name = cart.promotionName,
            promotion_id = cart.promotionId,
            promotion_discount = cart.promotionDiscount
        )
    }

    suspend fun getOrderByUUID(uuid: String): Order? = orderDao.getOrderByUuid(uuid)

    suspend fun getOrderByDocumentNo(documentNo: String): Order? =
        orderDao.getOrderByDocumentNo(documentNo)

    suspend fun getAllOrdersDescending(): List<Order> =
        orderDao.getAllOrdersInDescendingOrder()

    suspend fun voidOrder(uuid: String): Boolean {
        val order = orderDao.getOrderByUuid(uuid) ?: return false
        val json = order.json ?: return false

        try {
            json.put("status", "VO")
            val updatedOrder = order.copy(
                docStatus = "VO",
                isSync = false,
                json = json
            )
            orderDao.updateOrder(updatedOrder)
            return true
        } catch (e: Exception) {
            return false
        }
    }

    private fun generateDocumentNo(sequence: Sequence): String {
        val newSeqNo = sequence.sequenceNo + 1
        sequence.sequenceNo = newSeqNo  // Update in-place so caller persists the new value
        val formatted = String.format("%09d", newSeqNo)
        return "${sequence.prefix}$formatted"
    }
}

data class PaymentInfo(
    val tendered: Double = 0.0,
    val amount: Double = 0.0,
    val change: Double = 0.0,
    val paymentType: String = "CASH",
    val checkNumber: String? = null,
    val extraInfo: Map<String, Any>? = null,
    val forexCurrency: String? = null,
    val forexAmount: Double = 0.0,
    val forexRate: Double = 0.0
)
