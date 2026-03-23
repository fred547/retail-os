package com.posterita.pos.android.ui.viewmodel

import android.util.Log
import androidx.lifecycle.*
import com.posterita.pos.android.data.local.dao.AccountDao
import com.posterita.pos.android.data.local.dao.StoreDao
import com.posterita.pos.android.data.local.dao.TaxDao
import com.posterita.pos.android.data.local.dao.TerminalDao
import com.posterita.pos.android.data.local.dao.UserDao
import com.posterita.pos.android.data.local.entity.Account
import com.posterita.pos.android.data.local.entity.User
import com.posterita.pos.android.data.local.entity.Store
import com.posterita.pos.android.data.local.entity.Terminal
import com.posterita.pos.android.data.local.entity.Till
import com.posterita.pos.android.domain.model.ClosedTillDetails
import com.posterita.pos.android.service.TillService
import com.posterita.pos.android.util.AppErrorLogger
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TillViewModel @Inject constructor(
    @ApplicationContext private val appContext: android.content.Context,
    private val tillService: TillService,
    private val sessionManager: SessionManager,
    private val prefsManager: SharedPreferencesManager,
    private val accountDao: AccountDao,
    private val storeDao: StoreDao,
    private val terminalDao: TerminalDao,
    private val taxDao: TaxDao,
    private val userDao: UserDao
) : ViewModel() {

    private val _openTillResult = MutableLiveData<Result<Till>>()
    val openTillResult: LiveData<Result<Till>> = _openTillResult

    private val _closeTillResult = MutableLiveData<Result<ClosedTillDetails>>()
    val closeTillResult: LiveData<Result<ClosedTillDetails>> = _closeTillResult

    private val _currentTill = MutableLiveData<Till?>()
    val currentTill: LiveData<Till?> = _currentTill

    /**
     * Ensures all session objects (account, store, terminal) are loaded from DB.
     * If Room is empty (pre-sync), creates minimal fallback entities from prefs.
     */
    private suspend fun ensureSessionLoaded() {
        if (sessionManager.account == null) {
            val accountId = prefsManager.accountId
            if (accountId.isNotEmpty() && accountId != "null") {
                var account = accountDao.getAccountById(accountId)
                if (account == null) {
                    // Room is empty (hasn't synced yet) — create a minimal fallback
                    Log.w("TillViewModel", "Account not in Room, creating fallback for $accountId")
                    account = Account(
                        account_id = accountId,
                        businessname = prefsManager.getString("store_name", "My Store"),
                        currency = prefsManager.getString("currency", "MUR"),
                    )
                    accountDao.insertAccounts(listOf(account))
                }
                sessionManager.account = account
            }
        }
        if (sessionManager.store == null) {
            val storeId = prefsManager.storeId
            if (storeId > 0) {
                var store = storeDao.getStoreById(storeId)
                if (store == null) {
                    Log.w("TillViewModel", "Store not in Room, creating fallback for $storeId")
                    store = Store(
                        storeId = storeId,
                        name = prefsManager.getString("store_name", "Store"),
                    )
                    storeDao.insertStore(store)
                }
                sessionManager.store = store
            }
        }
        if (sessionManager.terminal == null) {
            val terminalId = prefsManager.terminalId
            if (terminalId > 0) {
                var terminal = terminalDao.getTerminalById(terminalId)
                if (terminal == null) {
                    Log.w("TillViewModel", "Terminal not in Room, creating fallback for $terminalId")
                    terminal = Terminal(
                        terminalId = terminalId,
                        store_id = prefsManager.storeId,
                        name = prefsManager.getString("terminal_name", "POS 1"),
                        prefix = prefsManager.accountId.take(3).uppercase(),
                    )
                    terminalDao.insertTerminal(terminal)
                }
                sessionManager.terminal = terminal
            }
        }
        if (sessionManager.user == null) {
            val userId = prefsManager.userId
            if (userId > 0) {
                val user = userDao.getUserById(userId)
                if (user != null) {
                    sessionManager.user = user
                }
            }
            // If still null, try first owner/admin user in DB
            if (sessionManager.user == null) {
                val allUsers = userDao.getAllUsers()
                val owner = allUsers.firstOrNull { it.role == "owner" || it.isadmin == "Y" }
                    ?: allUsers.firstOrNull()
                if (owner != null) {
                    sessionManager.user = owner
                    prefsManager.userId = owner.user_id
                }
            }
        }
        // Load tax cache if empty
        if (sessionManager.taxCache.isEmpty()) {
            val taxes = taxDao.getAllTaxesSync()
            for (tax in taxes) {
                sessionManager.taxCache[tax.tax_id] = tax
            }
        }
    }

    fun loadOpenTill() {
        viewModelScope.launch {
            try {
                ensureSessionLoaded()
                val terminalId = prefsManager.terminalId
                if (terminalId <= 0) {
                    _currentTill.postValue(null)
                    return@launch
                }
                val till = tillService.getOpenTill(terminalId)
                sessionManager.till = till
                _currentTill.postValue(till)
            } catch (e: Exception) {
                AppErrorLogger.warn(appContext, "TillViewModel", "Failed to load open till", e)
                _currentTill.postValue(null)
            }
        }
    }

    fun openTill(openingAmt: Double) {
        viewModelScope.launch {
            try {
                ensureSessionLoaded()

                val account = sessionManager.account
                    ?: throw IllegalStateException("No account found. Please sign in again.")
                val store = sessionManager.store
                    ?: throw IllegalStateException("No store selected. Please select a store.")
                val terminal = sessionManager.terminal
                    ?: throw IllegalStateException("No terminal selected. Please select a terminal.")
                val user = sessionManager.user
                    ?: throw IllegalStateException("No user selected. Please select a user.")

                val till = tillService.openTill(account, store, terminal, user, openingAmt)
                sessionManager.till = till
                _openTillResult.postValue(Result.success(till))
            } catch (e: Exception) {
                AppErrorLogger.warn(appContext, "TillViewModel", "Failed to open till", e)
                _openTillResult.postValue(Result.failure(e))
            }
        }
    }

    fun closeTill(cashAmt: Double, cardAmt: Double) {
        val user = sessionManager.user ?: return
        val till = sessionManager.till ?: return

        viewModelScope.launch {
            try {
                val details = tillService.closeTill(user, till, cashAmt, cardAmt)
                sessionManager.till = null
                _closeTillResult.postValue(Result.success(details))
            } catch (e: Exception) {
                AppErrorLogger.warn(appContext, "TillViewModel", "Failed to close till", e)
                _closeTillResult.postValue(Result.failure(e))
            }
        }
    }
}
