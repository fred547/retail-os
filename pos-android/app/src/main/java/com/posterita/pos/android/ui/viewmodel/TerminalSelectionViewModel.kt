package com.posterita.pos.android.ui.viewmodel

import androidx.lifecycle.*
import com.posterita.pos.android.data.local.dao.*
import com.posterita.pos.android.data.local.entity.*
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class TerminalSelectionViewModel @Inject constructor(
    private val storeDao: StoreDao,
    private val terminalDao: TerminalDao,
    private val sequenceDao: SequenceDao,
    private val prefsManager: SharedPreferencesManager,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _stores = MutableLiveData<List<Store>>()
    val stores: LiveData<List<Store>> = _stores

    private val _terminals = MutableLiveData<List<Terminal>>()
    val terminals: LiveData<List<Terminal>> = _terminals

    private val _selectionComplete = MutableLiveData<Boolean>()
    val selectionComplete: LiveData<Boolean> = _selectionComplete

    fun loadStores() {
        viewModelScope.launch {
            _stores.postValue(storeDao.getAllStores())
        }
    }

    fun loadTerminalsForStore(storeId: Int) {
        viewModelScope.launch {
            _terminals.postValue(terminalDao.getTerminalsForStore(storeId))
        }
    }

    fun selectTerminal(store: Store, terminal: Terminal) {
        viewModelScope.launch {
            prefsManager.storeId = store.storeId
            prefsManager.terminalId = terminal.terminalId
            prefsManager.storeName = store.name ?: ""
            prefsManager.terminalName = terminal.name ?: ""
            prefsManager.terminalType = terminal.terminal_type

            // Set session values so TillActivity can access them
            sessionManager.store = store
            sessionManager.terminal = terminal

            // Mark terminal as selected locally
            if (terminal.isselected != "Y") {
                val updated = terminal.copy(isselected = "Y")
                terminalDao.updateTerminal(updated)
            }

            // Initialize sequences
            checkTerminalSequence(terminal)

            _selectionComplete.postValue(true)
        }
    }

    private suspend fun checkTerminalSequence(terminal: Terminal) {
        val orderSeq = sequenceDao.getSequenceByNameForTerminal(
            Sequence.ORDER_DOCUMENT_NO, terminal.terminalId
        )
        if (orderSeq == null) {
            sequenceDao.insertSequence(
                Sequence(
                    terminal_id = terminal.terminalId,
                    name = Sequence.ORDER_DOCUMENT_NO,
                    sequenceNo = terminal.sequence,
                    prefix = terminal.prefix ?: ""
                )
            )
        }

        val tillSeq = sequenceDao.getSequenceByNameForTerminal(
            Sequence.TILL_DOCUMENT_NO, terminal.terminalId
        )
        if (tillSeq == null) {
            sequenceDao.insertSequence(
                Sequence(
                    terminal_id = terminal.terminalId,
                    name = Sequence.TILL_DOCUMENT_NO,
                    sequenceNo = terminal.cash_up_sequence,
                    prefix = terminal.prefix ?: ""
                )
            )
        }
    }
}
