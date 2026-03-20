package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import com.posterita.pos.android.databinding.ActivityViewOrderBinding
import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.printing.PrinterManager
import com.posterita.pos.android.service.OrderService
import com.posterita.pos.android.ui.adapter.ViewOrderAdapter
import com.posterita.pos.android.ui.viewmodel.OrdersViewModel
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionManager
import dagger.hilt.android.AndroidEntryPoint
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class ViewOrderActivity : AppCompatActivity() {

    private lateinit var binding: ActivityViewOrderBinding

    private val ordersViewModel: OrdersViewModel by viewModels()

    @Inject
    lateinit var orderService: OrderService

    @Inject
    lateinit var sessionManager: SessionManager

    @Inject
    lateinit var printerManager: PrinterManager

    private var orderUuid: String? = null
    private var orderDetails: OrderDetails? = null
    private lateinit var viewOrderAdapter: ViewOrderAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityViewOrderBinding.inflate(layoutInflater)
        setContentView(binding.root)
        supportActionBar?.hide()

        orderUuid = intent.getStringExtra("ORDER_UUID")

        setupRecyclerView()
        setupButtons()
        observeViewModel()
        loadOrderDetails()
    }

    private fun setupRecyclerView() {
        viewOrderAdapter = ViewOrderAdapter(emptyList())
        binding.recyclerViewOrderLines?.apply {
            layoutManager = LinearLayoutManager(this@ViewOrderActivity)
            adapter = viewOrderAdapter
        }
    }

    private fun setupButtons() {
        binding.back?.setOnClickListener {
            finish()
        }

        binding.buttonNewSale?.setOnClickListener {
            val intent = Intent(this, ProductActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        }

        binding.buttonPrintOrder?.setOnClickListener {
            val details = orderDetails
            if (details != null) {
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) {
                        printerManager.printAllReceipts(details)
                    }
                    Toast.makeText(
                        this@ViewOrderActivity,
                        "Printing receipt...",
                        Toast.LENGTH_SHORT
                    ).show()
                }
            } else {
                Toast.makeText(this, "Order details not available", Toast.LENGTH_SHORT).show()
            }
        }

        binding.buttonVoidOrder?.setOnClickListener {
            showVoidOrderConfirmation()
        }

        binding.buttonRefundOrder?.setOnClickListener {
            val uuid = orderUuid
            val details = orderDetails
            if (uuid != null && details != null) {
                if (details.status == "VO") {
                    Toast.makeText(this, "Cannot refund a voided order", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                val intent = Intent(this, RefundActivity::class.java)
                intent.putExtra("ORDER_UUID", uuid)
                intent.putExtra(com.posterita.pos.android.util.Constants.ORDER_DETAILS, details)
                startActivity(intent)
            }
        }
    }

    private fun showVoidOrderConfirmation() {
        val uuid = orderUuid ?: return
        val details = orderDetails ?: return

        if (details.status == "VO") {
            Toast.makeText(this, "Order is already voided", Toast.LENGTH_SHORT).show()
            return
        }

        AlertDialog.Builder(this)
            .setTitle("Void Order")
            .setMessage("Are you sure you want to void order ${details.documentno}?")
            .setPositiveButton("Void") { _, _ ->
                ordersViewModel.voidOrder(uuid)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun loadOrderDetails() {
        val uuid = orderUuid ?: return

        lifecycleScope.launch {
            val order = withContext(Dispatchers.IO) {
                orderService.getOrderByUUID(uuid)
            }

            if (order != null) {
                val json = order.json?.toString() ?: return@launch
                orderDetails = OrderDetails.fromJson(json)
                displayOrderDetails()
            } else {
                Toast.makeText(
                    this@ViewOrderActivity,
                    "Order not found",
                    Toast.LENGTH_LONG
                ).show()
            }
        }
    }

    private fun displayOrderDetails() {
        val details = orderDetails ?: return
        val currency = details.currency ?: sessionManager.account?.currency ?: ""

        binding.textViewOrderNumber?.text = details.documentno ?: ""
        binding.textViewCustomerName?.text = details.customer_name ?: "Walk-In Customer"

        // Set totals
        binding.textViewSubtotalAmount?.text =
            "$currency ${NumberUtils.formatPrice(details.subtotal)}"
        binding.textViewTaxTotalAmount?.text =
            "$currency ${NumberUtils.formatPrice(details.taxtotal)}"
        binding.textViewGrandTotalAmount?.text =
            "$currency ${NumberUtils.formatPrice(details.grandtotal)}"

        // Set order lines
        viewOrderAdapter = ViewOrderAdapter(details.lines)
        binding.recyclerViewOrderLines?.adapter = viewOrderAdapter

        // Hide refund button for voided orders
        if (details.status == "VO") {
            binding.buttonRefundOrder?.visibility = View.GONE
            binding.buttonVoidOrder?.visibility = View.GONE
        }
    }

    private fun observeViewModel() {
        ordersViewModel.voidResult.observe(this) { result ->
            result.fold(
                onSuccess = {
                    Toast.makeText(this, "Order voided successfully", Toast.LENGTH_SHORT).show()
                    // Reload order details to reflect void status
                    loadOrderDetails()
                },
                onFailure = { error ->
                    Toast.makeText(
                        this,
                        "Failed to void order: ${error.message}",
                        Toast.LENGTH_LONG
                    ).show()
                }
            )
        }
    }
}
