package com.posterita.pos.android.ui.activity

import android.app.AlertDialog
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.EditText
import android.widget.Toast
import androidx.recyclerview.widget.LinearLayoutManager
import com.posterita.pos.android.R
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
import com.posterita.pos.android.util.AppErrorLogger
import com.posterita.pos.android.util.Constants
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionManager
import dagger.hilt.android.AndroidEntryPoint
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.UUID
import javax.inject.Inject

@AndroidEntryPoint
class RefundActivity : BaseActivity(), RefundCartAdapter.OnRefundSelectionListener {

    private lateinit var binding: ActivityRefundBinding
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var orderService: OrderService
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    private var orderDetails: OrderDetails? = null
    private var allCartItems: List<CartItem> = emptyList()
    private var selectedItems: List<CartItem> = emptyList()
    private var refundCartAdapter: RefundCartAdapter? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityRefundBinding.inflate(layoutInflater)
        setContentView(binding.root)
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)

        @Suppress("DEPRECATION")
        orderDetails = intent.getSerializableExtra(Constants.ORDER_DETAILS) as? OrderDetails

        if (orderDetails == null) {
            Toast.makeText(this, "No order details found", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        setupTopBar()
        setupOrderInfo()
        setupRefundItems()
        setupRecyclerView()
        setupRefundButton()
    }

    private fun setupTopBar() {
        binding.buttonBack.setOnClickListener { finish() }
    }

    private fun setupOrderInfo() {
        val details = orderDetails ?: return
        val currency = details.currency ?: ""

        binding.cardOrderInfo.visibility = View.VISIBLE
        binding.labelSelectItems.visibility = View.VISIBLE

        // Order number
        binding.textOrderNumber.text = "Order #${details.documentno ?: details.order_id}"

        // Order total
        binding.textOrderTotal.text = "$currency ${NumberUtils.formatPrice(details.grandtotal)}"

        // Order date
        if (details.dateorderedtext != null) {
            binding.textOrderDate.text = details.dateorderedtext
        } else if (details.dateordered > 0) {
            val sdf = SimpleDateFormat("dd MMM yyyy, HH:mm", Locale.getDefault())
            binding.textOrderDate.text = sdf.format(Date(details.dateordered))
        } else {
            binding.textOrderDate.visibility = View.GONE
        }

        // Customer
        binding.textOrderCustomer.text = details.customer_name ?: "Walk-In Customer"
    }

    private fun setupRefundItems() {
        val details = orderDetails ?: return
        val taxCache = sessionManager.taxCache
        val items = mutableListOf<CartItem>()

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
                lineNo = (items.size + 1).toString(),
                qty = line.qtyentered,
                priceEntered = line.priceentered,
                initialQty = line.qtyentered,
                tax = tax
            )
            cartItem.updateTotals()
            items.add(cartItem)
        }

        allCartItems = items
    }

    private fun setupRecyclerView() {
        refundCartAdapter = RefundCartAdapter(this)
        binding.recyclerViewCartLineItems.layoutManager = LinearLayoutManager(this)
        binding.recyclerViewCartLineItems.adapter = refundCartAdapter
        refundCartAdapter?.setProductList(allCartItems)
    }

    private fun setupRefundButton() {
        binding.buttonRefundOrder.setOnClickListener {
            val reason = binding.editRefundReason.text.toString().trim()
            if (reason.isEmpty()) {
                binding.editRefundReason.requestFocus()
                Toast.makeText(this, "Please enter a reason for the refund", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (selectedItems.isEmpty()) {
                Toast.makeText(this, "No items selected for refund", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            // Cashiers require supervisor PIN before processing refund
            val user = sessionManager.user
            if (user != null && user.isCashier) {
                showSupervisorPinDialog(reason)
            } else {
                processRefund(reason)
            }
        }
    }

    override fun onSelectionChanged(selectedItems: List<CartItem>) {
        this.selectedItems = selectedItems
        updateRefundTotal()
    }

    private fun updateRefundTotal() {
        val currency = orderDetails?.currency ?: ""
        var total = 0.0
        for (item in selectedItems) {
            total += item.lineNetAmt
        }

        binding.textViewGrandTotal.text = "$currency ${NumberUtils.formatPrice(total)}"

        val hasItems = selectedItems.isNotEmpty()
        binding.buttonRefundOrder.isEnabled = hasItems
        binding.buttonRefundOrder.alpha = if (hasItems) 1.0f else 0.5f

        if (hasItems) {
            binding.buttonRefundOrder.text = "REFUND $currency ${NumberUtils.formatPrice(total)}"
        } else {
            binding.buttonRefundOrder.text = "REFUND"
        }
    }

    private fun showSupervisorPinDialog(reason: String) {
        val pinInput = EditText(this).apply {
            hint = "Supervisor PIN"
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or
                    android.text.InputType.TYPE_NUMBER_VARIATION_PASSWORD
            setPadding(48, 32, 48, 32)
        }

        AlertDialog.Builder(this)
            .setTitle("Supervisor Approval Required")
            .setMessage("A supervisor PIN is needed to process refunds.")
            .setView(pinInput)
            .setPositiveButton("Verify") { _, _ ->
                val enteredPin = pinInput.text.toString().trim()
                verifySupervisorPin(enteredPin, reason)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun verifySupervisorPin(enteredPin: String, reason: String) {
        if (enteredPin.isEmpty()) {
            Toast.makeText(this, "Please enter a PIN", Toast.LENGTH_SHORT).show()
            return
        }

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val supervisors = db.userDao().getAllUsers().filter { it.isSupervisor }
                val match = supervisors.any { it.pin == enteredPin }

                withContext(Dispatchers.Main) {
                    if (match) {
                        processRefund(reason)
                    } else {
                        Toast.makeText(
                            this@RefundActivity,
                            "Invalid supervisor PIN",
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }
            } catch (e: Exception) {
                AppErrorLogger.warn(this@RefundActivity, "RefundActivity", "Error verifying supervisor PIN", e)
                withContext(Dispatchers.Main) {
                    Toast.makeText(
                        this@RefundActivity,
                        "Error verifying PIN: ${e.message}",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            }
        }
    }

    private fun processRefund(reason: String) {
        val details = orderDetails ?: return
        val account = sessionManager.account ?: return
        val store = sessionManager.store ?: return
        val terminal = sessionManager.terminal ?: return
        val user = sessionManager.user ?: return
        val till = sessionManager.till ?: return

        if (selectedItems.isEmpty()) {
            Toast.makeText(this, "No items selected for refund", Toast.LENGTH_SHORT).show()
            return
        }

        val customer = Customer(
            customer_id = details.customer_id,
            name = details.customer_name
        )

        // Build a refund cart from selected items only
        val refundCart = ShoppingCart(CartType.REFUND)
        for (item in selectedItems) {
            refundCart.cartItems[item.lineNo] = item.clone()
        }
        refundCart.recalculateTotals()
        refundCart.note = "Refund reason: $reason"
        refundCart.negateForRefund()

        val payments = listOf(
            PaymentInfo(
                tendered = refundCart.grandTotalAmount,
                amount = refundCart.grandTotalAmount,
                change = 0.0,
                paymentType = details.paymenttype ?: "CASH"
            )
        )

        // Disable button to prevent double-tap
        binding.buttonRefundOrder.isEnabled = false
        binding.buttonRefundOrder.text = "Processing..."

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val uuid = UUID.randomUUID().toString()
                val order = orderService.createOrder(
                    uuid, refundCart, customer, user, account, store, terminal, till, payments
                )

                val refundOrderDetails = order.json?.let { OrderDetails.fromJson(it.toString()) }

                withContext(Dispatchers.Main) {
                    Toast.makeText(
                        this@RefundActivity,
                        "Refund processed successfully",
                        Toast.LENGTH_SHORT
                    ).show()
                    val intent = Intent(this@RefundActivity, ReceiptRefundActivity::class.java)
                    intent.putExtra(Constants.ORDER_DETAILS, refundOrderDetails)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    startActivity(intent)
                    finish()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(
                        this@RefundActivity,
                        "Error processing refund: ${e.message}",
                        Toast.LENGTH_SHORT
                    ).show()
                    binding.buttonRefundOrder.isEnabled = true
                    updateRefundTotal() // Restore button text
                }
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        finish()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }
}
