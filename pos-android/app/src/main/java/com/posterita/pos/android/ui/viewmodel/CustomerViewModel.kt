package com.posterita.pos.android.ui.viewmodel

import androidx.lifecycle.*
import com.google.gson.Gson
import com.posterita.pos.android.data.local.dao.CustomerDao
import com.posterita.pos.android.data.local.entity.Customer
import com.posterita.pos.android.data.remote.ApiService
import com.posterita.pos.android.data.remote.model.request.CreateCustomerRequest
import com.posterita.pos.android.util.AppErrorLogger
import com.posterita.pos.android.util.Constants
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CustomerViewModel @Inject constructor(
    @ApplicationContext private val appContext: android.content.Context,
    private val customerDao: CustomerDao,
    private val apiService: ApiService,
    private val prefsManager: SharedPreferencesManager
) : ViewModel() {

    private val _searchResults = MutableLiveData<List<Customer>>()
    val searchResults: LiveData<List<Customer>> = _searchResults

    private val _createResult = MutableLiveData<Result<Customer>>()
    val createResult: LiveData<Result<Customer>> = _createResult

    fun searchCustomers(query: String) {
        viewModelScope.launch {
            val results = customerDao.searchCustomersByName("%$query%")
            _searchResults.postValue(results.take(Constants.CUSTOMER_DISPLAY_LIMIT))
        }
    }

    /**
     * Search customers by phone number (partial match on phone1, phone2, mobile, name).
     */
    fun searchCustomersByPhone(phone: String, callback: (List<Customer>) -> Unit) {
        viewModelScope.launch {
            val results = customerDao.searchCustomersByPhone("%$phone%")
            callback(results.take(Constants.CUSTOMER_DISPLAY_LIMIT))
        }
    }

    fun createCustomer(name: String, email: String?, phone: String?, address: String?, identifier: String?, note: String?) {
        viewModelScope.launch {
            try {
                val request = CreateCustomerRequest(
                    name = name, email = email, phone = phone,
                    address = address, identifier = identifier, note = note
                )
                val customerJson = Gson().toJson(request)

                // Try server first
                var serverCustomer: Customer? = null
                try {
                    val response = apiService.createCustomer(prefsManager.accountId, customerJson)
                    if (response.isSuccessful) {
                        val body = response.body()
                        if (body != null && !body.hasError()) {
                            serverCustomer = Customer(
                                customer_id = body.customer_id,
                                name = body.name, email = body.email,
                                phone1 = body.phone, address1 = body.address,
                                identifier = body.identifier, note = body.note,
                                isactive = "Y"
                            )
                        }
                    }
                } catch (e: Exception) {
                    AppErrorLogger.warn(appContext, "CustomerViewModel", "Server unavailable, saving locally", e)
                }

                // Use server response or create locally with a negative temp ID
                val customer = serverCustomer ?: Customer(
                    customer_id = -(System.currentTimeMillis() % 1_000_000).toInt(),
                    name = name, email = email, phone1 = phone,
                    address1 = address, identifier = identifier, note = note,
                    isactive = "Y"
                )
                customerDao.insertCustomers(listOf(customer))
                _createResult.postValue(Result.success(customer))
            } catch (e: Exception) {
                AppErrorLogger.warn(appContext, "CustomerViewModel", "Failed to create customer", e)
                _createResult.postValue(Result.failure(e))
            }
        }
    }
}
