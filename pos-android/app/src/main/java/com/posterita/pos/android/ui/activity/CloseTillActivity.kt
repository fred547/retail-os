package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.text.InputType
import android.view.Gravity
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Till
import com.posterita.pos.android.data.local.entity.TillAdjustment
import com.posterita.pos.android.databinding.ActivityCloseTillBinding
import com.posterita.pos.android.domain.model.ClosedTillDetails
import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.printing.BluetoothPrinter
import com.posterita.pos.android.printing.PrinterManager
import com.posterita.pos.android.printing.ReceiptPrinter
import com.posterita.pos.android.service.TillService
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SharedPreferencesManager
import androidx.lifecycle.lifecycleScope
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

@AndroidEntryPoint
class CloseTillActivity : AppCompatActivity() {

    private lateinit var binding: ActivityCloseTillBinding

    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var printerManager: PrinterManager
    @Inject lateinit var tillService: TillService

    private var currentTill: Till? = null
    private var denominationTotal: Double = 0.0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCloseTillBinding.inflate(layoutInflater)
        setContentView(binding.root)

        loadTillInfo()
        setupClickListeners()
    }

    private fun loadTillInfo() {
        val dateFormat = SimpleDateFormat("EEEE, dd MMMM yyyy", Locale.getDefault())
        val currentDate = dateFormat.format(Date())
        val terminalId = prefsManager.terminalId

        lifecycleScope.launch(Dispatchers.IO) {
            val openTill = db.tillDao().getOpenTillByTerminalId(terminalId)

            withContext(Dispatchers.Main) {
                if (openTill != null) {
                    currentTill = openTill
                    binding.textViewStoreNameValue?.text = prefsManager.storeName
                    binding.textViewTerminalNameValue?.text = prefsManager.terminalName
                    binding.txtdate?.text = currentDate
                    binding.textViewDocumentNoValue?.text = openTill.documentno ?: ""
                    binding.textViewOpeningDateValue?.text = openTill.dateOpened?.let {
                        SimpleDateFormat("dd MMM yyyy HH:mm", Locale.getDefault()).format(it)
                    } ?: ""
                    binding.textViewOpeningAmountValue?.text = NumberUtils.formatPrice(openTill.openingAmt)
                    binding.textViewOpenedByNameValue?.text = prefsManager.userName
                } else {
                    Toast.makeText(this@CloseTillActivity, "No open till found", Toast.LENGTH_SHORT).show()
                    finish()
                }
            }
        }
    }

    private fun setupClickListeners() {
        binding.back?.setOnClickListener { finish() }

        // Adjustments
        binding.buttonAddMoney?.setOnClickListener { showAdjustmentDialog(isPayIn = true) }
        binding.buttonRemoveMoney?.setOnClickListener { showAdjustmentDialog(isPayIn = false) }

        // Reports
        binding.buttonViewPayments?.setOnClickListener { showViewPaymentsDialog() }
        binding.buttonPrintCategorySummary?.setOnClickListener { printCategorySummary() }
        binding.buttonPrintItemsDetails?.setOnClickListener { printItemsDetails() }
        binding.buttonPrintStockByCategory?.setOnClickListener { printStockByCategory() }

        // Close Till actions
        binding.buttonOpenDrawer?.setOnClickListener { openDrawer() }
        binding.buttonDenomination?.setOnClickListener { showDenominationDialog() }
        binding.buttonCloseTill?.setOnClickListener { showCloseTillDialog() }
    }

    // ---- ADJUSTMENTS --------------------------------------------------------

    private fun showAdjustmentDialog(isPayIn: Boolean) {
        val title = if (isPayIn) "Add Money to Till" else "Remove Money from Till"

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 32, 48, 0)
        }

        val edtAmount = EditText(this).apply {
            hint = "Amount"
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
        }
        val edtReason = EditText(this).apply {
            hint = "Reason"
            inputType = InputType.TYPE_CLASS_TEXT
        }

        layout.addView(edtAmount)
        layout.addView(edtReason)

        AlertDialog.Builder(this)
            .setTitle(title)
            .setView(layout)
            .setPositiveButton("Save") { _, _ ->
                val amount = NumberUtils.parseDouble(edtAmount.text.toString())
                val reason = edtReason.text.toString().trim()
                if (amount <= 0) {
                    Toast.makeText(this, "Amount must be greater than zero", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                saveAdjustment(amount, reason, isPayIn)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun saveAdjustment(amount: Double, reason: String, isPayIn: Boolean) {
        val till = currentTill ?: return

        val adjustment = TillAdjustment(
            till_id = till.tillId,
            date = System.currentTimeMillis(),
            user_id = prefsManager.userId,
            pay_type = if (isPayIn) "payin" else "payout",
            reason = reason,
            amount = amount
        )

        lifecycleScope.launch(Dispatchers.IO) {
            db.tillAdjustmentDao().insertTillAdjustment(adjustment)

            // Print receipt
            printAdjustmentReceipt(adjustment, isPayIn)

            withContext(Dispatchers.Main) {
                val msg = if (isPayIn) "Added" else "Removed"
                Toast.makeText(this@CloseTillActivity, "$msg ${NumberUtils.formatPrice(amount)}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private suspend fun printAdjustmentReceipt(adjustment: TillAdjustment, isPayIn: Boolean) {
        val type = if (isPayIn) "PAY IN" else "PAY OUT"
        val width = 32

        val sb = StringBuilder()
        sb.appendLine("TILL ADJUSTMENT")
        sb.appendLine("-".repeat(width))
        sb.appendLine("Type: $type")
        sb.appendLine("Amount: ${NumberUtils.formatPrice(adjustment.amount)}")
        sb.appendLine("Reason: ${adjustment.reason ?: ""}")
        sb.appendLine("User: ${prefsManager.userName}")
        sb.appendLine("Date: ${SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault()).format(Date(adjustment.date))}")
        sb.appendLine("-".repeat(width))

        printRawToAllPrinters(sb.toString())
    }

    // ---- VIEW PAYMENTS -------------------------------------------------------

    private fun showViewPaymentsDialog() {
        val till = currentTill ?: return

        lifecycleScope.launch(Dispatchers.IO) {
            val orders = db.orderDao().getOrdersByTillId(till.tillId)
            val paymentMap = linkedMapOf<String, Double>()
            var totalSales = 0.0

            for (order in orders) {
                val details = order.json?.let { OrderDetails.fromJson(it.toString()) } ?: continue
                for (payment in details.payments) {
                    val type = payment.paymenttype ?: "OTHER"
                    paymentMap[type] = (paymentMap[type] ?: 0.0) + payment.amount
                    totalSales += payment.amount
                }
            }

            // Get adjustments
            val adjustments = db.tillAdjustmentDao().getAdjustmentsByTillId(till.tillId)
            var payIn = 0.0
            var payOut = 0.0
            for (adj in adjustments) {
                if (adj.pay_type == "payin") payIn += adj.amount
                else payOut += adj.amount
            }

            withContext(Dispatchers.Main) {
                val sb = StringBuilder()
                sb.appendLine("Payment Summary")
                sb.appendLine("\u2500".repeat(30))
                for ((type, amount) in paymentMap) {
                    sb.appendLine("$type: ${NumberUtils.formatPrice(amount)}")
                }
                sb.appendLine("\u2500".repeat(30))
                sb.appendLine("Total Sales: ${NumberUtils.formatPrice(totalSales)}")
                sb.appendLine("Orders: ${orders.size}")
                if (payIn > 0) sb.appendLine("Pay In: ${NumberUtils.formatPrice(payIn)}")
                if (payOut > 0) sb.appendLine("Pay Out: ${NumberUtils.formatPrice(payOut)}")
                sb.appendLine("Opening Amount: ${NumberUtils.formatPrice(till.openingAmt)}")

                AlertDialog.Builder(this@CloseTillActivity)
                    .setTitle("View Payments")
                    .setMessage(sb.toString())
                    .setPositiveButton("Print") { _, _ ->
                        lifecycleScope.launch(Dispatchers.IO) {
                            val printWidth = 32
                            val printSb = StringBuilder()
                            printSb.appendLine("PAYMENT SUMMARY")
                            printSb.appendLine("-".repeat(printWidth))
                            for ((type, amount) in paymentMap) {
                                printSb.appendLine(padLine(type, NumberUtils.formatPrice(amount), printWidth))
                            }
                            printSb.appendLine("-".repeat(printWidth))
                            printSb.appendLine(padLine("Total Sales:", NumberUtils.formatPrice(totalSales), printWidth))
                            printSb.appendLine(padLine("Orders:", orders.size.toString(), printWidth))
                            if (payIn > 0) printSb.appendLine(padLine("Pay In:", NumberUtils.formatPrice(payIn), printWidth))
                            if (payOut > 0) printSb.appendLine(padLine("Pay Out:", NumberUtils.formatPrice(payOut), printWidth))
                            printSb.appendLine(padLine("Opening Amt:", NumberUtils.formatPrice(till.openingAmt), printWidth))
                            printRawToAllPrinters(printSb.toString())
                        }
                    }
                    .setNegativeButton("Close", null)
                    .show()
            }
        }
    }

    // ---- PRINT REPORTS -------------------------------------------------------

    private fun printCategorySummary() {
        val till = currentTill ?: return
        Toast.makeText(this, "Printing Category Summary...", Toast.LENGTH_SHORT).show()

        lifecycleScope.launch(Dispatchers.IO) {
            val orders = db.orderDao().getOrdersByTillId(till.tillId)
            val categoryMap = linkedMapOf<String, Pair<Double, Double>>() // name -> (qty, amount)

            for (order in orders) {
                val details = order.json?.let { OrderDetails.fromJson(it.toString()) } ?: continue
                for (line in details.lines) {
                    val catName = line.productcategoryname ?: "Uncategorized"
                    val current = categoryMap[catName] ?: Pair(0.0, 0.0)
                    categoryMap[catName] = Pair(current.first + line.qtyentered, current.second + line.linenetamt)
                }
            }

            val width = 32
            val sb = StringBuilder()
            sb.appendLine("CATEGORY SUMMARY")
            sb.appendLine("Store: ${prefsManager.storeName}")
            sb.appendLine("Terminal: ${prefsManager.terminalName}")
            sb.appendLine("-".repeat(width))
            for ((cat, data) in categoryMap) {
                sb.appendLine(cat)
                sb.appendLine(padLine("  Qty: ${NumberUtils.formatQuantity(data.first)}", NumberUtils.formatPrice(data.second), width))
            }
            sb.appendLine("-".repeat(width))
            val totalQty = categoryMap.values.sumOf { it.first }
            val totalAmt = categoryMap.values.sumOf { it.second }
            sb.appendLine(padLine("Total: ${NumberUtils.formatQuantity(totalQty)}", NumberUtils.formatPrice(totalAmt), width))

            printRawToAllPrinters(sb.toString())

            withContext(Dispatchers.Main) {
                Toast.makeText(this@CloseTillActivity, "Category Summary printed", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun printItemsDetails() {
        val till = currentTill ?: return
        Toast.makeText(this, "Printing Items Details...", Toast.LENGTH_SHORT).show()

        lifecycleScope.launch(Dispatchers.IO) {
            val orders = db.orderDao().getOrdersByTillId(till.tillId)
            val itemMap = linkedMapOf<String, Pair<Double, Double>>() // name -> (qty, amount)

            for (order in orders) {
                val details = order.json?.let { OrderDetails.fromJson(it.toString()) } ?: continue
                for (line in details.lines) {
                    val name = line.name ?: "Unknown"
                    val current = itemMap[name] ?: Pair(0.0, 0.0)
                    itemMap[name] = Pair(current.first + line.qtyentered, current.second + line.linenetamt)
                }
            }

            val width = 32
            val sb = StringBuilder()
            sb.appendLine("ITEMS DETAILS")
            sb.appendLine("Store: ${prefsManager.storeName}")
            sb.appendLine("Terminal: ${prefsManager.terminalName}")
            sb.appendLine("-".repeat(width))
            for ((name, data) in itemMap) {
                sb.appendLine(padLine("${NumberUtils.formatQuantity(data.first)} x $name", NumberUtils.formatPrice(data.second), width))
            }
            sb.appendLine("-".repeat(width))
            val totalQty = itemMap.values.sumOf { it.first }
            val totalAmt = itemMap.values.sumOf { it.second }
            sb.appendLine(padLine("Total: ${NumberUtils.formatQuantity(totalQty)}", NumberUtils.formatPrice(totalAmt), width))

            printRawToAllPrinters(sb.toString())

            withContext(Dispatchers.Main) {
                Toast.makeText(this@CloseTillActivity, "Items Details printed", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun printStockByCategory() {
        Toast.makeText(this, "Printing Stock by Category...", Toast.LENGTH_SHORT).show()

        lifecycleScope.launch(Dispatchers.IO) {
            val categories = db.productCategoryDao().getAllProductCategoriesSync()
            val products = db.productDao().getAllProductsSync()

            val categoryNames = categories.associate { it.productcategory_id to (it.name ?: "Unknown") }
            val grouped = products.filter { it.isstock == "Y" }.groupBy { categoryNames[it.productcategory_id] ?: "Uncategorized" }

            val width = 32
            val sb = StringBuilder()
            sb.appendLine("STOCK BY CATEGORY")
            sb.appendLine("Store: ${prefsManager.storeName}")
            sb.appendLine("-".repeat(width))
            for ((cat, prods) in grouped) {
                sb.appendLine(cat)
                for (p in prods) {
                    sb.appendLine("  ${p.name ?: ""}")
                }
                sb.appendLine("")
            }
            sb.appendLine("-".repeat(width))
            sb.appendLine("Total Products: ${products.filter { it.isstock == "Y" }.size}")

            printRawToAllPrinters(sb.toString())

            withContext(Dispatchers.Main) {
                Toast.makeText(this@CloseTillActivity, "Stock by Category printed", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // ---- OPEN DRAWER ---------------------------------------------------------

    private fun openDrawer() {
        lifecycleScope.launch(Dispatchers.IO) {
            try {
                printerManager.openCashDrawer()
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@CloseTillActivity, "Cash drawer opened", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@CloseTillActivity, "Failed to open drawer: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    // ---- DENOMINATION --------------------------------------------------------

    private fun showDenominationDialog() {
        val denominations = listOf(
            5000.0, 2000.0, 1000.0, 500.0, 200.0, 100.0,
            50.0, 25.0, 20.0, 10.0, 5.0, 2.0, 1.0, 0.50, 0.25
        )

        val scrollView = ScrollView(this)
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 32, 48, 16)
        }

        val totalText = TextView(this).apply {
            text = "Total: 0.00"
            textSize = 18f
            setTypeface(null, android.graphics.Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 16)
        }
        layout.addView(totalText)

        val countFields = mutableListOf<Pair<Double, EditText>>()

        for (denom in denominations) {
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                setPadding(0, 4, 0, 4)
                gravity = Gravity.CENTER_VERTICAL
            }

            val label = TextView(this).apply {
                text = NumberUtils.formatPrice(denom)
                textSize = 14f
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }

            val countField = EditText(this).apply {
                hint = "0"
                inputType = InputType.TYPE_CLASS_NUMBER
                textSize = 14f
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                gravity = Gravity.CENTER
            }

            val subtotalLabel = TextView(this).apply {
                text = "0.00"
                textSize = 14f
                gravity = Gravity.END
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }

            countField.addTextChangedListener(object : android.text.TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                override fun afterTextChanged(s: android.text.Editable?) {
                    val cnt = s.toString().toIntOrNull() ?: 0
                    subtotalLabel.text = NumberUtils.formatPrice(denom * cnt)
                    // Recalculate total
                    var total = 0.0
                    for ((d, field) in countFields) {
                        val c = field.text.toString().toIntOrNull() ?: 0
                        total += d * c
                    }
                    totalText.text = "Total: ${NumberUtils.formatPrice(total)}"
                    denominationTotal = total
                }
            })

            countFields.add(Pair(denom, countField))
            row.addView(label)
            row.addView(countField)
            row.addView(subtotalLabel)
            layout.addView(row)
        }

        scrollView.addView(layout)

        AlertDialog.Builder(this)
            .setTitle("Denomination")
            .setView(scrollView)
            .setPositiveButton("Print") { _, _ ->
                printDenomination(countFields)
            }
            .setNeutralButton("Use Total") { _, _ ->
                Toast.makeText(this, "Denomination total: ${NumberUtils.formatPrice(denominationTotal)}", Toast.LENGTH_SHORT).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun printDenomination(countFields: List<Pair<Double, EditText>>) {
        lifecycleScope.launch(Dispatchers.IO) {
            val width = 32
            val sb = StringBuilder()
            sb.appendLine("DENOMINATION")
            sb.appendLine("Store: ${prefsManager.storeName}")
            sb.appendLine("Terminal: ${prefsManager.terminalName}")
            sb.appendLine("-".repeat(width))
            sb.appendLine(padLine3("Denom", "Count", "Amount", width))
            sb.appendLine("-".repeat(width))

            var total = 0.0
            for ((denom, field) in countFields) {
                val count = field.text.toString().toIntOrNull() ?: 0
                if (count > 0) {
                    val amount = denom * count
                    total += amount
                    sb.appendLine(padLine3(NumberUtils.formatPrice(denom), count.toString(), NumberUtils.formatPrice(amount), width))
                }
            }
            sb.appendLine("-".repeat(width))
            sb.appendLine(padLine("TOTAL:", NumberUtils.formatPrice(total), width))

            printRawToAllPrinters(sb.toString())

            withContext(Dispatchers.Main) {
                Toast.makeText(this@CloseTillActivity, "Denomination printed", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // ---- CLOSE TILL ----------------------------------------------------------

    private fun showCloseTillDialog() {
        val till = currentTill ?: return

        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 32, 48, 0)
        }

        layout.addView(TextView(this).apply {
            text = "Cash Amount"
            textSize = 14f
            setPadding(0, 0, 0, 4)
        })

        val edtCash = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            hint = "0.00"
            if (denominationTotal > 0) {
                setText(NumberUtils.formatPrice(denominationTotal))
            }
        }
        layout.addView(edtCash)

        layout.addView(TextView(this).apply {
            text = "Card Amount"
            textSize = 14f
            setPadding(0, 16, 0, 4)
        })

        val edtCard = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            hint = "0.00"
        }
        layout.addView(edtCard)

        // Forex section
        layout.addView(TextView(this).apply {
            text = "Foreign Currency (optional)"
            textSize = 14f
            setPadding(0, 24, 0, 4)
        })

        val edtForexCurrency = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_CAP_CHARACTERS
            hint = "e.g. USD, EUR"
            filters = arrayOf(android.text.InputFilter.LengthFilter(3))
        }
        layout.addView(edtForexCurrency)

        layout.addView(TextView(this).apply {
            text = "Forex Cash Amount"
            textSize = 14f
            setPadding(0, 8, 0, 4)
        })

        val edtForexAmt = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
            hint = "0.00"
        }
        layout.addView(edtForexAmt)

        AlertDialog.Builder(this)
            .setTitle("Close Till")
            .setView(layout)
            .setPositiveButton("Close Till") { _, _ ->
                val cash = NumberUtils.parseDouble(edtCash.text.toString())
                val card = NumberUtils.parseDouble(edtCard.text.toString())
                val forexCurr = edtForexCurrency.text.toString().trim().uppercase().ifEmpty { null }
                val forexAmt = NumberUtils.parseDouble(edtForexAmt.text.toString())
                confirmCloseTill(cash, card, forexCurr, forexAmt)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun confirmCloseTill(cashAmt: Double, cardAmt: Double, forexCurrency: String? = null, forexAmt: Double = 0.0) {
        val msg = buildString {
            append("Are you sure you want to close this till?\n\n")
            append("Cash: ${NumberUtils.formatPrice(cashAmt)}\n")
            append("Card: ${NumberUtils.formatPrice(cardAmt)}")
            if (forexCurrency != null && forexAmt > 0) {
                append("\nForex ($forexCurrency): ${NumberUtils.formatPrice(forexAmt)}")
            }
            append("\n\nThis action cannot be undone.")
        }
        AlertDialog.Builder(this)
            .setTitle("Confirm Close Till")
            .setMessage(msg)
            .setPositiveButton("Yes, Close Till") { _, _ ->
                executeCloseTill(cashAmt, cardAmt, forexCurrency, forexAmt)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun executeCloseTill(cashAmt: Double, cardAmt: Double, forexCurrency: String? = null, forexAmt: Double = 0.0) {
        val till = currentTill ?: return

        lifecycleScope.launch(Dispatchers.IO) {
            try {
                val user = db.userDao().getUserById(prefsManager.userId)
                if (user == null) {
                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@CloseTillActivity, "User not found", Toast.LENGTH_SHORT).show()
                    }
                    return@launch
                }

                val closedDetails = tillService.closeTill(user, till, cashAmt, cardAmt, forexCurrency, forexAmt)

                // Print close till receipt
                val printers = db.printerDao().getAllPrinters()
                for (printer in printers) {
                    if (printer.printReceipt) {
                        printerManager.printCloseTillReceipt(closedDetails, printer, object : PrinterManager.PrintResultCallback {
                            override fun onSuccess() {}
                            override fun onError(message: String) {}
                        })
                    }
                }

                withContext(Dispatchers.Main) {
                    prefsManager.isTillOpen = ""
                    showCloseTillConfirmation(closedDetails)
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@CloseTillActivity, "Failed to close till: ${e.message}", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    private fun showCloseTillConfirmation(details: ClosedTillDetails) {
        val currency = details.currency ?: ""

        val sb = StringBuilder()
        sb.appendLine("Till closed successfully!")
        sb.appendLine("")
        sb.appendLine("Document No: ${details.documentNo ?: ""}")
        sb.appendLine("")
        sb.appendLine("Opening Amount: $currency ${NumberUtils.formatPrice(details.openingAmt)}")
        sb.appendLine("Cash Sales: $currency ${NumberUtils.formatPrice(details.cashAmt)}")
        sb.appendLine("Card Sales: $currency ${NumberUtils.formatPrice(details.cardAmt)}")
        if (details.voucherAmt > 0) sb.appendLine("Voucher: $currency ${NumberUtils.formatPrice(details.voucherAmt)}")
        if (details.blinkAmt > 0) sb.appendLine("Blink: $currency ${NumberUtils.formatPrice(details.blinkAmt)}")
        if (details.forexCurrency != null && details.forexAmt > 0) {
            sb.appendLine("Forex (${details.forexCurrency}): ${NumberUtils.formatPrice(details.forexAmt)}")
            if (details.forexSalesTotal > 0) sb.appendLine("Forex Sales Total: ${details.forexCurrency} ${NumberUtils.formatPrice(details.forexSalesTotal)}")
        }
        if (details.adjustmentTotal != 0.0) sb.appendLine("Adjustments: $currency ${NumberUtils.formatPrice(details.adjustmentTotal)}")
        sb.appendLine("")
        sb.appendLine("Expected Cash: $currency ${NumberUtils.formatPrice(details.expectedCash)}")
        sb.appendLine("Cash Entered: $currency ${NumberUtils.formatPrice(details.cashAmt)}")

        val diff = details.cashDifference
        if (diff != 0.0) {
            val diffLabel = if (diff > 0) "Over" else "Short"
            sb.appendLine("")
            sb.appendLine("Difference ($diffLabel): $currency ${NumberUtils.formatPrice(kotlin.math.abs(diff))}")
        }

        sb.appendLine("")
        sb.appendLine("Sales Total: $currency ${NumberUtils.formatPrice(details.salesTotal)}")
        sb.appendLine("Tax Total: $currency ${NumberUtils.formatPrice(details.taxTotal)}")
        sb.appendLine("Orders: ${details.numberOfOrders}")
        sb.appendLine("Items Sold: ${details.itemsSold}")

        AlertDialog.Builder(this)
            .setTitle("Till Closed")
            .setMessage(sb.toString())
            .setCancelable(false)
            .setPositiveButton("Open New Till") { _, _ ->
                // Go to TillActivity to open a new till
                val intent = Intent(this@CloseTillActivity, TillActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
            }
            .setNegativeButton("Log Out") { _, _ ->
                // Go to SelectUserLoginActivity (log out)
                val intent = Intent(this@CloseTillActivity, SelectUserLoginActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
            }
            .show()
    }

    // ---- PRINTER HELPERS -----------------------------------------------------

    private suspend fun printRawToAllPrinters(text: String) {
        val printers = db.printerDao().getAllPrinters()
        for (printer in printers) {
            if (printer.printReceipt) {
                try {
                    if (printer.printerType == "Bluetooth") {
                        val btPrinter = BluetoothPrinter()
                        btPrinter.printRawText(text, printer.width, printer.deviceName ?: "")
                    } else {
                        val receiptPrinter = ReceiptPrinter(printer.ip ?: "", printer.width)
                        receiptPrinter.printRawText(text)
                    }
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }
    }

    private fun padLine(left: String, right: String, width: Int): String {
        val spaces = width - left.length - right.length
        return if (spaces > 0) "$left${" ".repeat(spaces)}$right"
        else "$left $right"
    }

    private fun padLine3(left: String, center: String, right: String, width: Int): String {
        val third = width / 3
        val l = left.padEnd(third)
        val c = center.padEnd(third)
        val r = right.padStart(width - l.length - c.length)
        return "$l$c$r"
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        finish()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }
}
