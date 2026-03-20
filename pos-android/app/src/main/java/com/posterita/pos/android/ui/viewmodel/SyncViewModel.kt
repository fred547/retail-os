package com.posterita.pos.android.ui.viewmodel

import androidx.lifecycle.*
import com.posterita.pos.android.service.DatabaseSynchronizer
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SyncViewModel @Inject constructor(
    private val synchronizer: DatabaseSynchronizer,
    private val prefsManager: SharedPreferencesManager
) : ViewModel() {

    private val _syncResult = MutableLiveData<Result<Unit>>()
    val syncResult: LiveData<Result<Unit>> = _syncResult

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    fun pullData() {
        _isLoading.value = true
        viewModelScope.launch {
            val result = synchronizer.pullData()
            _syncResult.postValue(result)
            _isLoading.postValue(false)
        }
    }

    val hasTerminal: Boolean get() = prefsManager.terminalId > 0
    val hasUser: Boolean get() = prefsManager.userId > 0
}
