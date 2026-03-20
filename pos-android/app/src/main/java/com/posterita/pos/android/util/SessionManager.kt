package com.posterita.pos.android.util

import com.posterita.pos.android.data.local.entity.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Replaces the old SingletonClass. Holds global session state
 * for the currently logged-in user/account/store/terminal/till.
 */
@Singleton
class SessionManager @Inject constructor() {

    var account: Account? = null
    var store: Store? = null
    var terminal: Terminal? = null
    var user: User? = null
    var till: Till? = null
    var selectedCustomer: Customer? = null

    val defaultCustomer: Customer
        get() = Customer(
            customer_id = 0,
            name = "Walk-In Customer",
            isactive = "Y"
        )

    val taxCache: MutableMap<Int, Tax> = mutableMapOf()

    fun resetSession() {
        account = null
        store = null
        terminal = null
        user = null
        till = null
        selectedCustomer = null
        taxCache.clear()
    }

    fun getCustomerOrDefault(): Customer = selectedCustomer ?: defaultCustomer

    fun isConnected(): Boolean = account != null && terminal != null
}
