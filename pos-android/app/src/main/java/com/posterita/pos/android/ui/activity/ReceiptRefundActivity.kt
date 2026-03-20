package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.databinding.ActivityReceiptRefundBinding
import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.printing.PrinterManager
import com.posterita.pos.android.ui.activity.ProductActivity
import com.posterita.pos.android.util.Constants
import com.posterita.pos.android.util.NumberUtils
import dagger.hilt.android.AndroidEntryPoint
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class ReceiptRefundActivity : AppCompatActivity() {

    private lateinit var binding: ActivityReceiptRefundBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var printerManager: PrinterManager

    private var orderDetails: OrderDetails? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityReceiptRefundBinding.inflate(layoutInflater)
        setContentView(binding.root)

        @Suppress("DEPRECATION")
        orderDetails = intent.getSerializableExtra(Constants.ORDER_DETAILS) as? OrderDetails

        if (orderDetails == null) {
            Toast.makeText(this, "No order details found", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        displayRefundReceipt()
        setupButtons()
    }

    private fun displayRefundReceipt() {
        val details = orderDetails ?: return
        val currency = details.currency ?: ""

        binding.textViewOrderNumber.text = "Refund #${details.documentno}"
        binding.textViewTotalAmount.text = "$currency ${NumberUtils.formatPrice(details.grandtotal)}"
    }

    private fun setupButtons() {
        binding.back.setOnClickListener {
            navigateToProduct()
        }

        binding.buttonNewSale.setOnClickListener {
            navigateToProduct()
        }

        binding.buttonPrintOrder.setOnClickListener {
            printRefundReceipt()
        }

        binding.buttonViewOrder.setOnClickListener {
            // View order details - navigate to orders
            finish()
        }
    }

    private fun printRefundReceipt() {
        val details = orderDetails ?: return

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                printerManager.printAllReceipts(details)
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@ReceiptRefundActivity, "Printing refund receipt...", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@ReceiptRefundActivity, "Failed to print: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun navigateToProduct() {
        val intent = Intent(this, ProductActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        navigateToProduct()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }
}
