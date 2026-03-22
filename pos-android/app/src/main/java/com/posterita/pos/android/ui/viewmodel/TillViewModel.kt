package com.posterita.pos.android.ui.viewmodel

import androidx.lifecycle.*
import com.posterita.pos.android.data.local.dao.AccountDao
import com.posterita.pos.android.data.local.dao.StoreDao
import com.posterita.pos.android.data.local.dao.TaxDao
import com.posterita.pos.android.data.local.dao.TerminalDao
import com.posterita.pos.android.data.local.entity.Till
import com.posterita.pos.android.domain.model.ClosedTillDetails
import com.posterita.pos.android.service.TillService
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TillViewModel @Inject constructor(
    private val tillService: TillService,
    private val sessionManager: SessionManager,
    private val prefsManager: SharedPreferencesManager,
    private val accountDao: AccountDao,
    private val storeDao: StoreDao,
    private val terminalDao: TerminalDao,
    private val taxDao: TaxDao
) : ViewModel() {

    private val _openTillResult = MutableLiveData<Result<Till>>()
    val openTillResult: LiveData<Result<Till>> = _openTillResult

    private val _closeTillResult = MutableLiveData<Result<ClosedTillDetails>>()
    val closeTillResult: LiveData<Result<ClosedTillDetails>> = _closeTillResult

    private val _currentTill = MutableLiveData<Till?>()
    val currentTill: LiveData<Till?> = _currentTill

    /**
     * Ensures all session objects (account, store, terminal) are loaded from DB.
     * This handles the case where the app is re-launched and session was lost.
     */
    private suspend fun ensureSessionLoaded() {
        if (sessionManager.account == null) {
            val accountId = prefsManager.accountId
            if (accountId.isNotEmpty()) {
                sessionManager.account = accountDao.getAccountById(accountId)
            }
        }
        if (sessionManager.store == null) {
            val storeId = prefsManager.storeId
            if (storeId > 0) {
                sessionManager.store = storeDao.getStoreById(storeId)
            }
        }
        if (sessionManager.terminal == null) {
            val terminalId = prefsManager.terminalId
            if (terminalId > 0) {
                sessionManager.terminal = terminalDao.getTerminalById(terminalId)
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
                _closeTillResult.postValue(Result.failure(e))
            }
        }
    }
}
