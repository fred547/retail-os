package com.posterita.pos.android.ui.viewmodel

import androidx.lifecycle.*
import com.posterita.pos.android.data.local.entity.Customer
import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.local.entity.Tax
import com.posterita.pos.android.domain.model.CartItem
import com.posterita.pos.android.domain.model.CartType
import com.posterita.pos.android.domain.model.ShoppingCart
import com.posterita.pos.android.util.SessionManager
import dagger.hilt.android.lifecycle.HiltViewModel
import javax.inject.Inject

@HiltViewModel
class ShoppingCartViewModel @Inject constructor(
    private val sessionManager: SessionManager,
    val shoppingCart: ShoppingCart
) : ViewModel() {

    private val _cartItems = MutableLiveData<List<CartItem>>(emptyList())
    val cartItems: LiveData<List<CartItem>> = _cartItems

    private val _totalQty = MutableLiveData(0.0)
    val totalQty: LiveData<Double> = _totalQty

    private val _subTotalAmount = MutableLiveData(0.0)
    val subTotalAmount: LiveData<Double> = _subTotalAmount

    private val _taxTotalAmount = MutableLiveData(0.0)
    val taxTotalAmount: LiveData<Double> = _taxTotalAmount

    private val _grandTotalAmount = MutableLiveData(0.0)
    val grandTotalAmount: LiveData<Double> = _grandTotalAmount

    private val _discountTotalAmount = MutableLiveData(0.0)
    val discountTotalAmount: LiveData<Double> = _discountTotalAmount

    private val _customer = MutableLiveData<Customer>()
    val customer: LiveData<Customer> = _customer

    init {
        _customer.value = sessionManager.defaultCustomer
        // Sync LiveData with any existing cart state (e.g. when CartActivity opens)
        onCartUpdated()
    }

    fun addProduct(product: Product) {
        shoppingCart.addProduct(product, sessionManager.taxCache)
        onCartUpdated()
    }

    fun addSerializedProduct(product: Product, serialItemId: Int, serialNumber: String) {
        shoppingCart.addSerializedProduct(product, serialItemId, serialNumber, sessionManager.taxCache)
        onCartUpdated()
    }

    fun addProductWithQty(product: Product, qty: Double) {
        shoppingCart.addProductWithQty(product, qty, sessionManager.taxCache)
        onCartUpdated()
    }

    fun addProductWithPrice(product: Product, price: Double) {
        shoppingCart.addProductWithPrice(product, price, sessionManager.taxCache)
        onCartUpdated()
    }

    fun addProductWithQtyAndPrice(product: Product, qty: Double, price: Double) {
        shoppingCart.addProductWithQtyAndPrice(product, qty, price, sessionManager.taxCache)
        onCartUpdated()
    }

    fun addOrUpdateLine(cartItem: CartItem) {
        shoppingCart.addOrUpdateLine(cartItem)
        onCartUpdated()
    }

    fun increaseQty(lineNo: String) {
        shoppingCart.increaseQty(lineNo)
        onCartUpdated()
    }

    fun decreaseQty(lineNo: String) {
        shoppingCart.decreaseQty(lineNo)
        onCartUpdated()
    }

    fun removeLine(lineNo: String) {
        shoppingCart.removeLine(lineNo)
        onCartUpdated()
    }

    fun splitLine(lineNo: String, qty: Double) {
        shoppingCart.splitLine(lineNo, qty)
        onCartUpdated()
    }

    fun updateQty(lineNo: String, qty: Double) {
        shoppingCart.updateProductQty(lineNo, qty)
        onCartUpdated()
    }

    fun updatePrice(lineNo: String, price: Double) {
        shoppingCart.updatePrice(lineNo, price)
        onCartUpdated()
    }

    fun updateTax(lineNo: String, tax: Tax?) {
        shoppingCart.updateTax(lineNo, tax)
        onCartUpdated()
    }

    fun clearCart() {
        shoppingCart.clearCart()
        _customer.value = sessionManager.defaultCustomer
        sessionManager.selectedCustomer = null
        onCartUpdated()
    }

    fun setCustomer(customer: Customer) {
        sessionManager.selectedCustomer = customer
        _customer.postValue(customer)
    }

    fun resetCustomer() {
        sessionManager.selectedCustomer = null
        _customer.postValue(sessionManager.defaultCustomer)
    }

    private val _orderNote = MutableLiveData<String?>()
    val orderNote: LiveData<String?> = _orderNote

    fun setNote(note: String?) {
        shoppingCart.note = note
        _orderNote.postValue(note)
    }

    fun setTips(amount: Double, percentage: Double) {
        shoppingCart.tipsAmount = amount
        shoppingCart.tipsPercentage = percentage
    }

    fun setDiscountOnTotal(amount: Double, percentage: Double) {
        shoppingCart.discountOnTotalAmount = amount
        shoppingCart.discountOnTotalPercentage = percentage
        shoppingCart.recalculateTotals()
        onCartUpdated()
    }

    fun refreshFromCart() {
        onCartUpdated()
    }

    private fun onCartUpdated() {
        _cartItems.postValue(shoppingCart.cartItems.values.toList())
        _totalQty.postValue(shoppingCart.totalQty)
        _subTotalAmount.postValue(shoppingCart.subTotalAmount)
        _taxTotalAmount.postValue(shoppingCart.taxTotalAmount)
        _grandTotalAmount.postValue(shoppingCart.grandTotalAmount)
        _discountTotalAmount.postValue(shoppingCart.discountTotalAmount)
    }
}
