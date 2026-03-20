package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ActivityReceiptBinding
import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.printing.PrinterManager
import com.posterita.pos.android.service.OrderService
import com.posterita.pos.android.ui.viewmodel.OrdersViewModel
import com.posterita.pos.android.util.DateUtils
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionManager
import dagger.hilt.android.AndroidEntryPoint
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class ReceiptActivity : BaseDrawerActivity() {

    private lateinit var binding: ActivityReceiptBinding

    private val ordersViewModel: OrdersViewModel by viewModels()

    @Inject
    lateinit var orderService: OrderService

    @Inject
    lateinit var sessionManager: SessionManager

    @Inject
    lateinit var printerManager: PrinterManager

    private var orderUuid: String? = null
    private var orderDetails: OrderDetails? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentViewWithDrawer(R.layout.activity_receipt)
        binding = ActivityReceiptBinding.bind(drawerLayout.getChildAt(0))
        supportActionBar?.hide()

        // Back button (no drawer on receipt)
        binding.buttonBack?.setOnClickListener { navigateToProductActivity() }

        orderUuid = intent.getStringExtra("ORDER_UUID")
        val changeDue = intent.getDoubleExtra("CHANGE_DUE", 0.0)
        val tipsAmount = intent.getDoubleExtra("TIPS_AMOUNT", 0.0)

        setupButtons()
        loadOrderDetails()

        // Show store name in receipt card header
        val storeName = prefsManager.storeName
        if (storeName.isNotEmpty()) {
            binding.textViewStoreName?.text = storeName
            binding.textViewStoreName?.visibility = View.VISIBLE
        }

        // Display change due
        val currency = sessionManager.account?.currency ?: ""
        binding.textViewChangeDue.text = "$currency ${NumberUtils.formatPrice(changeDue)}"

        // Display tips if applicable
        if (tipsAmount > 0) {
            binding.textViewTipsAmount.visibility = View.VISIBLE
            binding.textViewTipsAmount.text = "Tips: $currency ${NumberUtils.formatPrice(tipsAmount)}"
        }
    }

    private fun setupButtons() {
        binding.buttonNewSale.setOnClickListener {
            navigateToProductActivity()
        }

        binding.buttonPrintOrder.setOnClickListener {
            val details = orderDetails
            if (details != null) {
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) {
                        printerManager.printAllReceipts(details)
                    }
                    Toast.makeText(this@ReceiptActivity, "Printing receipt...", Toast.LENGTH_SHORT)
                        .show()
                }
            } else {
                Toast.makeText(this, "Order details not available", Toast.LENGTH_SHORT).show()
            }
        }

        binding.buttonVoidOrder?.setOnClickListener {
            showVoidOrderConfirmation()
        }

        ordersViewModel.voidResult.observe(this) { result ->
            result.onSuccess {
                Toast.makeText(this, "Order voided successfully", Toast.LENGTH_SHORT).show()
                navigateToProductActivity()
            }
            result.onFailure { error ->
                Toast.makeText(this, "Failed to void order: ${error.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showVoidOrderConfirmation() {
        val uuid = orderUuid ?: return
        val details = orderDetails

        if (details?.status?.lowercase() == "voided") {
            Toast.makeText(this, "Order is already voided", Toast.LENGTH_SHORT).show()
            return
        }

        AlertDialog.Builder(this)
            .setTitle("Void Order")
            .setMessage("Are you sure you want to void this order?")
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

                orderDetails?.let { details ->
                    binding.textViewOrderNumber.text = "Receipt #${details.documentno}"
                    // Also show receipt number inside the card
                    binding.textViewReceiptNumber?.text = "#${details.documentno}"
                    binding.textViewReceiptNumber?.visibility = View.VISIBLE
                    displayOrderDetails(details)
                    details.documentno?.let { generateReceiptQR(it) }
                }
            }
        }
    }

    private fun generateReceiptQR(orderRef: String) {
        // TODO: Get WhatsApp number from store config once backend provides it
        val whatsappNumber = "+23058000000"
        val url = "https://wa.me/$whatsappNumber?text=RECEIPT%20$orderRef"

        try {
            val writer = QRCodeWriter()
            val bitMatrix = writer.encode(url, BarcodeFormat.QR_CODE, 400, 400)
            val width = bitMatrix.width
            val height = bitMatrix.height
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.RGB_565)
            for (x in 0 until width) {
                for (y in 0 until height) {
                    bitmap.setPixel(x, y, if (bitMatrix[x, y]) Color.BLACK else Color.WHITE)
                }
            }
            binding.imageViewQrCode?.setImageBitmap(bitmap)
            binding.imageViewQrCode?.visibility = View.VISIBLE
            binding.textViewQrLabel?.visibility = View.VISIBLE
        } catch (e: Exception) {
            // QR generation failed — not critical, skip silently
        }
    }

    private fun displayOrderDetails(details: OrderDetails) {
        val currency = details.currency ?: sessionManager.account?.currency ?: ""

        // Date
        val dateText = details.dateorderedtext
            ?: if (details.dateordered > 0) DateUtils.formatDateTime(details.dateordered) else null
        if (dateText != null) {
            binding.textViewDate.text = dateText
            binding.textViewDate.visibility = View.VISIBLE
        }

        // Customer
        val customerName = details.customer_name
        if (!customerName.isNullOrBlank()) {
            binding.textViewCustomer.text = customerName
            binding.textViewCustomer.visibility = View.VISIBLE
        }

        // Sales rep
        val salesRep = details.user_name
        if (!salesRep.isNullOrBlank()) {
            binding.textViewSalesRep.text = "Served by $salesRep"
            binding.textViewSalesRep.visibility = View.VISIBLE
        }

        // Order items
        if (details.lines.isNotEmpty()) {
            binding.separatorItemsTop.visibility = View.VISIBLE
            binding.headerItems.visibility = View.VISIBLE
            binding.separatorItemsBottom.visibility = View.VISIBLE

            val itemsContainer = binding.layoutOrderItems
            itemsContainer.removeAllViews()

            for (line in details.lines) {
                // Item row: name | qty | amount
                val itemRow = LinearLayout(this).apply {
                    orientation = LinearLayout.HORIZONTAL
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                    ).apply { bottomMargin = dpToPx(4) }
                }

                // Name
                val tvName = TextView(this).apply {
                    layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                    text = line.name ?: "Item"
                    textSize = 14f
                    setTextColor(getColor(R.color.posterita_ink))
                }
                itemRow.addView(tvName)

                // Qty
                val tvQty = TextView(this).apply {
                    layoutParams = LinearLayout.LayoutParams(dpToPx(40), LinearLayout.LayoutParams.WRAP_CONTENT)
                    text = NumberUtils.formatQuantity(line.qtyentered)
                    textSize = 14f
                    gravity = Gravity.CENTER
                    setTextColor(getColor(R.color.posterita_ink))
                }
                itemRow.addView(tvQty)

                // Amount
                val tvAmount = TextView(this).apply {
                    layoutParams = LinearLayout.LayoutParams(dpToPx(80), LinearLayout.LayoutParams.WRAP_CONTENT)
                    text = "$currency ${NumberUtils.formatPrice(line.linenetamt)}"
                    textSize = 14f
                    gravity = Gravity.END
                    setTextColor(getColor(R.color.posterita_ink))
                }
                itemRow.addView(tvAmount)

                itemsContainer.addView(itemRow)

                // Discount line
                if (line.discountamt > 0) {
                    val discountView = TextView(this).apply {
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply {
                            marginStart = dpToPx(16)
                            bottomMargin = dpToPx(2)
                        }
                        text = "Discount: -$currency ${NumberUtils.formatPrice(line.discountamt)}"
                        textSize = 12f
                        setTextColor(getColor(R.color.text_secondary))
                    }
                    itemsContainer.addView(discountView)
                }

                // Note line
                if (!line.note.isNullOrBlank()) {
                    val noteView = TextView(this).apply {
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.MATCH_PARENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply {
                            marginStart = dpToPx(16)
                            bottomMargin = dpToPx(2)
                        }
                        text = "Note: ${line.note}"
                        textSize = 12f
                        setTextColor(getColor(R.color.text_secondary))
                        setTypeface(null, Typeface.ITALIC)
                    }
                    itemsContainer.addView(noteView)
                }
            }
        }

        // Totals
        val totalsContainer = binding.layoutTotals
        totalsContainer.removeAllViews()
        totalsContainer.visibility = View.VISIBLE

        addTotalRow(totalsContainer, "Subtotal", "$currency ${NumberUtils.formatPrice(details.subtotal)}", false)
        addTotalRow(totalsContainer, "Tax", "$currency ${NumberUtils.formatPrice(details.taxtotal)}", false)
        if (details.tipsamt > 0) {
            addTotalRow(totalsContainer, "Tips", "$currency ${NumberUtils.formatPrice(details.tipsamt)}", false)
        }
        if (details.discountamt > 0) {
            addTotalRow(totalsContainer, "Discount", "-$currency ${NumberUtils.formatPrice(details.discountamt)}", false)
        }
        addTotalRow(totalsContainer, "TOTAL", "$currency ${NumberUtils.formatPrice(details.grandtotal)}", true)
        addTotalRow(totalsContainer, "Items", NumberUtils.formatQuantity(details.qtytotal), false)

        // Order note
        if (!details.note.isNullOrBlank()) {
            binding.textViewOrderNote.text = "Note: ${details.note}"
            binding.textViewOrderNote.visibility = View.VISIBLE
        }

        // Payments
        if (details.payments.isNotEmpty()) {
            binding.separatorPayment.visibility = View.VISIBLE
            binding.layoutPayments.visibility = View.VISIBLE
            binding.layoutPayments.removeAllViews()

            for (payment in details.payments) {
                val type = payment.paymenttype ?: payment.type ?: "Payment"
                addTotalRow(binding.layoutPayments, type, "$currency ${NumberUtils.formatPrice(payment.amount)}", false)
                if (payment.change > 0) {
                    addTotalRow(binding.layoutPayments, "Change", "$currency ${NumberUtils.formatPrice(payment.change)}", false)
                }
            }
        }
    }

    private fun addTotalRow(container: LinearLayout, label: String, value: String, bold: Boolean) {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dpToPx(3) }
        }

        val tvLabel = TextView(this).apply {
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            text = label
            textSize = if (bold) 16f else 14f
            if (bold) setTypeface(null, Typeface.BOLD)
            setTextColor(getColor(R.color.posterita_ink))
        }
        row.addView(tvLabel)

        val tvValue = TextView(this).apply {
            layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT)
            text = value
            textSize = if (bold) 16f else 14f
            gravity = Gravity.END
            if (bold) setTypeface(null, Typeface.BOLD)
            setTextColor(getColor(R.color.posterita_ink))
        }
        row.addView(tvValue)

        container.addView(row)
    }

    private fun dpToPx(dp: Int): Int = (dp * resources.displayMetrics.density).toInt()

    private fun navigateToProductActivity() {
        val intent = Intent(this, ProductActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }
}
