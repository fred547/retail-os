package com.posterita.pos.android.util

import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.AuditEvent
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AuditLogger @Inject constructor(
    private val db: AppDatabase,
    private val sessionManager: SessionManager,
    private val prefsManager: SharedPreferencesManager
) {
    suspend fun log(
        action: String,
        detail: String? = null,
        reason: String? = null,
        supervisorId: Int? = null,
        orderId: String? = null,
        amount: Double? = null
    ) {
        withContext(Dispatchers.IO) {
            val event = AuditEvent(
                userId = sessionManager.user?.user_id ?: 0,
                userName = sessionManager.user?.firstname ?: sessionManager.user?.username,
                action = action,
                detail = detail,
                reason = reason,
                supervisorId = supervisorId,
                storeId = prefsManager.storeId,
                terminalId = prefsManager.terminalId,
                orderId = orderId,
                amount = amount
            )
            db.auditEventDao().insert(event)
        }
    }

    object Actions {
        const val USER_LOGIN = "user.login"
        const val USER_LOGOUT = "user.logout"
        const val CART_ADD = "cart.add"
        const val CART_REMOVE_LINE = "cart.remove_line"
        const val CART_DECREASE_QTY = "cart.decrease_qty"
        const val CART_CLEAR = "cart.clear"
        const val ORDER_CREATE = "order.create"
        const val ORDER_VOID = "order.void"
        const val ORDER_REFUND = "order.refund"
        const val ORDER_HOLD = "order.hold"
        const val ORDER_RESUME = "order.resume"
        const val TILL_OPEN = "till.open"
        const val TILL_CLOSE = "till.close"
        const val TILL_ADJUST = "till.adjust"
        const val DRAWER_OPEN = "drawer.open"
        const val DISCOUNT_APPLY = "discount.apply"
        const val PRICE_OVERRIDE = "price.override"
        const val DISCOUNT_LIMIT_EXCEEDED = "discount.limit_exceeded"
        const val PIN_FAILED = "pin.failed"
        const val PIN_LOCKOUT = "pin.lockout"
        const val SUPERVISOR_PIN_OK = "supervisor.pin_ok"
        const val SUPERVISOR_PIN_FAIL = "supervisor.pin_fail"
        const val CUSTOMER_SET = "customer.set"
        const val CUSTOMER_CREATE = "customer.create"
    }
}
