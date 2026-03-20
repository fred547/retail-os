package com.posterita.pos.android.ui.viewmodel

import androidx.lifecycle.*
import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.service.OrderService
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class OrdersViewModel @Inject constructor(
    private val orderService: OrderService
) : ViewModel() {

    private val _orders = MutableLiveData<List<OrderDetails>>()
    val orders: LiveData<List<OrderDetails>> = _orders

    private val _voidResult = MutableLiveData<Result<Boolean>>()
    val voidResult: LiveData<Result<Boolean>> = _voidResult

    fun loadOrders() {
        viewModelScope.launch {
            val dbOrders = orderService.getAllOrdersDescending()
            val orderDetails = dbOrders.mapNotNull { order ->
                order.json?.let { OrderDetails.fromJson(it.toString()) }
            }
            _orders.postValue(orderDetails)
        }
    }

    fun voidOrder(uuid: String) {
        viewModelScope.launch {
            val success = orderService.voidOrder(uuid)
            _voidResult.postValue(if (success) Result.success(true) else Result.failure(Exception("Failed to void order")))
        }
    }
}
