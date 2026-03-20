package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Customer
import com.posterita.pos.android.databinding.ActivityRefundBinding
import com.posterita.pos.android.domain.model.CartItem
import com.posterita.pos.android.domain.model.CartType
import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.domain.model.ShoppingCart
import com.posterita.pos.android.service.OrderService
import com.posterita.pos.android.service.PaymentInfo
import com.posterita.pos.android.ui.adapter.RefundCartAdapter
import com.posterita.pos.android.ui.viewmodel.ShoppingCartViewModel
import com.posterita.pos.android.util.Constants
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionManager
import dagger.hilt.android.AndroidEntryPoint
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID
import javax.inject.Inject

@AndroidEntryPoint
class RefundActivity : AppCompatActivity(), RefundCartAdapter.OnCartItemClickListener {

    private lateinit var binding: ActivityRefundBinding
    private val shoppingCartViewModel: ShoppingCartViewModel by viewModels()
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var orderService: OrderService
    @Inject lateinit var db: AppDatabase

    private var refundCart: ShoppingCart? = null
    private var refundCartAdapter: RefundCartAdapter? = null
    private var orderDetails: OrderDetails? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRefundBinding.inflate(layoutInflater)
        setContentView(binding.root)

        @Suppress("DEPRECATION")
        orderDetails = intent.getSerializableExtra(Constants.ORDER_DETAILS) as? OrderDetails

        if (orderDetails == null) {
            Toast.makeText(this, "No order details found", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        setupRefundCart()
        setupRecyclerView()
        setupButtons()
    }

    private fun setupRefundCart() {
        val details = orderDetails ?: return
        refundCart = ShoppingCart(CartType.REFUND)
        val taxCache = sessionManager.taxCache

        for (line in details.lines) {
            val product = com.posterita.pos.android.data.local.entity.Product(
                product_id = line.product_id,
                name = line.name,
                sellingprice = line.priceentered,
                tax_id = line.tax_id,
                istaxincluded = line.istaxincluded,
                productcategory_id = line.productcategory_id,
                image = line.image,
                description = line.description,
                isstock = line.isstock
            )
            val tax = taxCache[line.tax_id]
            val cartItem = CartItem(
                product = product,
                lineNo = refundCart!!.cartItems.size.plus(1).toString(),
                qty = line.qtyentered,
                priceEntered = line.priceentered,
                initialQty = line.qtyentered,
                tax = tax
            )
            cartItem.updateTotals()
            refundCart!!.cartItems[cartItem.lineNo] = cartItem
        }
        refundCart!!.recalculateTotals()

        val currency = details.currency ?: ""
        binding.textViewGrandTotal.text = "$currency ${NumberUtils.formatPrice(refundCart!!.grandTotalAmount)}"
    }

    private fun setupRecyclerView() {
        refundCartAdapter = RefundCartAdapter(shoppingCartViewModel, this)
        binding.recyclerViewCartLineItems.layoutManager = LinearLayoutManager(this)
        binding.recyclerViewCartLineItems.adapter = refundCartAdapter

        refundCartAdapter?.setProductList(refundCart?.cartItems?.values?.toList() ?: emptyList())

        shoppingCartViewModel.cartItems.observe(this) { items ->
            refundCartAdapter?.setProductList(items)
            val cart = shoppingCartViewModel.shoppingCart
            val currency = orderDetails?.currency ?: ""
            binding.textViewGrandTotal.text = "$currency ${NumberUtils.formatPrice(cart.grandTotalAmount)}"
        }
    }

    private fun setupButtons() {
        binding.buttonBack.setOnClickListener {
            finish()
        }

        binding.buttonRefundOrder.setOnClickListener {
            processRefund()
        }
    }

    private fun processRefund() {
        val details = orderDetails ?: return
        val account = sessionManager.account ?: return
        val store = sessionManager.store ?: return
        val terminal = sessionManager.terminal ?: return
        val user = sessionManager.user ?: return
        val till = sessionManager.till ?: return

        val customer = Customer(
            customer_id = details.customer_id,
            name = details.customer_name
        )

        val cart = shoppingCartViewModel.shoppingCart
        if (cart.isEmpty()) {
            Toast.makeText(this, "No items to refund", Toast.LENGTH_SHORT).show()
            return
        }

        cart.negateForRefund()

        val payments = listOf(
            PaymentInfo(
                tendered = cart.grandTotalAmount,
                amount = cart.grandTotalAmount,
                change = 0.0,
                paymentType = details.paymenttype ?: "CASH"
            )
        )

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val uuid = UUID.randomUUID().toString()
                val order = orderService.createOrder(
                    uuid, cart, customer, user, account, store, terminal, till, payments
                )

                val refundOrderDetails = order.json?.let { OrderDetails.fromJson(it.toString()) }

                withContext(Dispatchers.Main) {
                    Toast.makeText(this@RefundActivity, "Refund processed successfully", Toast.LENGTH_SHORT).show()
                    val intent = Intent(this@RefundActivity, ReceiptRefundActivity::class.java)
                    intent.putExtra(Constants.ORDER_DETAILS, refundOrderDetails)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    startActivity(intent)
                    finish()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@RefundActivity, "Error processing refund: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    override fun onCartItemClick(cartItem: CartItem) {
        // Handle cart item click if needed
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        finish()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }
}
