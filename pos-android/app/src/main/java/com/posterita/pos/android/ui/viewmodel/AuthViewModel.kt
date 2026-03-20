package com.posterita.pos.android.ui.viewmodel

import androidx.lifecycle.*
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.remote.ApiService
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val apiService: ApiService,
    private val prefsManager: SharedPreferencesManager
) : ViewModel() {

    private val _loginResult = MutableLiveData<Result<String>>()
    val loginResult: LiveData<Result<String>> = _loginResult

    private val _testEndpointResult = MutableLiveData<Result<Boolean>>()
    val testEndpointResult: LiveData<Result<Boolean>> = _testEndpointResult

    val savedEmail: String get() = prefsManager.email

    fun login(email: String, password: String) {
        viewModelScope.launch {
            try {
                val response = apiService.login(email, password)
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body != null && !body.hasError()) {
                        val accountKey = body.account_key ?: ""
                        prefsManager.email = email
                        prefsManager.accountId = accountKey
                        prefsManager.resetAccount()
                        prefsManager.email = email
                        prefsManager.accountId = accountKey
                        _loginResult.postValue(Result.success(accountKey))
                    } else {
                        _loginResult.postValue(Result.failure(Exception(body?.error ?: "Login failed")))
                    }
                } else {
                    _loginResult.postValue(Result.failure(Exception("Login failed: ${response.code()}")))
                }
            } catch (e: Exception) {
                _loginResult.postValue(Result.failure(e))
            }
        }
    }

    fun testEndpoint(url: String) {
        viewModelScope.launch {
            try {
                prefsManager.baseUrl = url
                val response = apiService.testEndpoint()
                if (response.isSuccessful) {
                    prefsManager.serverEndpointChecked = true
                    _testEndpointResult.postValue(Result.success(true))
                } else {
                    _testEndpointResult.postValue(Result.failure(Exception("Invalid Server Endpoint")))
                }
            } catch (e: Exception) {
                _testEndpointResult.postValue(Result.failure(e))
            }
        }
    }
}
