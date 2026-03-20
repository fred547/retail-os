package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.view.View
import android.widget.*
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.posterita.pos.android.R
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
import java.io.File
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

    // Expected totals calculated from orders
    private var expectedCashSales: Double = 0.0
    private var expectedCardSales: Double = 0.0
    private var expectedVoucherSales: Double = 0.0
    private var expectedBlinkSales: Double = 0.0
    private var expectedAdjustmentNet: Double = 0.0
    private var expectedCashInDrawer: Double = 0.0
    private var totalSalesAmount: Double = 0.0
    private var orderCount: Int = 0

    // Denomination fields: value -> (qtyEditText, subtotalTextView)
    private data class DenomField(val value: Double, val qtyEditText: EditText?, val subtotalTextView: TextView?)
    private val denomFields = mutableListOf<DenomField>()

    // Evidence photo URIs
    private var photoTillUri: Uri? = null
    private var photoBankSlipUri: Uri? = null
    private var photoZReportUri: Uri? = null
    private var currentPhotoTarget: Int = 0 // 1=till, 2=bank slip, 3=z-report
    private var currentPhotoUri: Uri? = null

    private val takePictureLauncher = registerForActivityResult(
        ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && currentPhotoUri != null) {
            when (currentPhotoTarget) {
                1 -> {
                    photoTillUri = currentPhotoUri
                    binding.textPhotoTillStatus?.text = "Captured"
                    binding.textPhotoTillStatus?.setTextColor(ContextCompat.getColor(this, R.color.posterita_secondary))
                }
                2 -> {
                    photoBankSlipUri = currentPhotoUri
                    binding.textPhotoBankSlipStatus?.text = "Captured"
                    binding.textPhotoBankSlipStatus?.setTextColor(ContextCompat.getColor(this, R.color.posterita_secondary))
                }
                3 -> {
                    photoZReportUri = currentPhotoUri
                    binding.textPhotoZReportStatus?.text = "Captured"
                    binding.textPhotoZReportStatus?.setTextColor(ContextCompat.getColor(this, R.color.posterita_secondary))
                }
            }
        }
    }

    companion object {
        private const val DRAFT_PREFIX = "close_till_draft_"
        private const val DRAFT_DENOM_2000 = "${DRAFT_PREFIX}denom_2000"
        private const val DRAFT_DENOM_1000 = "${DRAFT_PREFIX}denom_1000"
        private const val DRAFT_DENOM_500 = "${DRAFT_PREFIX}denom_500"
        private const val DRAFT_DENOM_200 = "${DRAFT_PREFIX}denom_200"
        private const val DRAFT_DENOM_100 = "${DRAFT_PREFIX}denom_100"
        private const val DRAFT_DENOM_50 = "${DRAFT_PREFIX}denom_50"
        private const val DRAFT_DENOM_25 = "${DRAFT_PREFIX}denom_25"
        private const val DRAFT_DENOM_20 = "${DRAFT_PREFIX}denom_20"
        private const val DRAFT_DENOM_10 = "${DRAFT_PREFIX}denom_10"
        private const val DRAFT_DENOM_5 = "${DRAFT_PREFIX}denom_5"
        private const val DRAFT_COINS = "${DRAFT_PREFIX}coins"
        private const val DRAFT_CARD_AMT = "${DRAFT_PREFIX}card_amt"
        private const val DRAFT_TILL_ID = "${DRAFT_PREFIX}till_id"

        private val DRAFT_KEYS = listOf(
            DRAFT_DENOM_2000, DRAFT_DENOM_1000, DRAFT_DENOM_500, DRAFT_DENOM_200,
            DRAFT_DENOM_100, DRAFT_DENOM_50, DRAFT_DENOM_25, DRAFT_DENOM_20,
            DRAFT_DENOM_10, DRAFT_DENOM_5, DRAFT_COINS, DRAFT_CARD_AMT, DRAFT_TILL_ID
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCloseTillBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupDenominationFields()
        setupDenominationListeners()
        loadTillInfo()
        setupClickListeners()
    }

    // ---- DENOMINATION FIELD SETUP -------------------------------------------

    private fun setupDenominationFields() {
        denomFields.clear()
        denomFields.add(DenomField(2000.0, binding.denom2000Qty, binding.denom2000Sub))
        denomFields.add(DenomField(1000.0, binding.denom1000Qty, binding.denom1000Sub))
        denomFields.add(DenomField(500.0, binding.denom500Qty, binding.denom500Sub))
        denomFields.add(DenomField(200.0, binding.denom200Qty, binding.denom200Sub))
        denomFields.add(DenomField(100.0, binding.denom100Qty, binding.denom100Sub))
        denomFields.add(DenomField(50.0, binding.denom50Qty, binding.denom50Sub))
        denomFields.add(DenomField(25.0, binding.denom25Qty, binding.denom25Sub))
        denomFields.add(DenomField(20.0, binding.denom20Qty, binding.denom20Sub))
        denomFields.add(DenomField(10.0, binding.denom10Qty, binding.denom10Sub))
        denomFields.add(DenomField(5.0, binding.denom5Qty, binding.denom5Sub))
    }

    private fun setupDenominationListeners() {
        val watcher = object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                recalculateDenominationTotal()
            }
        }

        for (field in denomFields) {
            field.qtyEditText?.addTextChangedListener(watcher)
        }

        // Coins field is special: user enters the total coin amount directly
        binding.denomCoinsQty?.addTextChangedListener(watcher)
    }

    private fun recalculateDenominationTotal() {
        var total = 0.0

        for (field in denomFields) {
            val qty = field.qtyEditText?.text?.toString()?.toIntOrNull() ?: 0
            val sub = field.value * qty
            field.subtotalTextView?.text = NumberUtils.formatPrice(sub)
            total += sub
        }

        // Coins: user enters the total coin amount (not a count)
        val coinsAmount = NumberUtils.parseDouble(binding.denomCoinsQty?.text?.toString() ?: "0")
        binding.denomCoinsSub?.text = NumberUtils.formatPrice(coinsAmount)
        total += coinsAmount

        denominationTotal = total
        binding.textCountedTotal?.text = NumberUtils.formatPrice(total)

        // Update Step 3: Discrepancy
        updateDiscrepancy()
    }

    private fun updateDiscrepancy() {
        binding.textDiscExpected?.text = NumberUtils.formatPrice(expectedCashInDrawer)
        binding.textDiscCounted?.text = NumberUtils.formatPrice(denominationTotal)

        val diff = denominationTotal - expectedCashInDrawer
        binding.textDiscDifference?.text = NumberUtils.formatPrice(diff)

        val rowDifference = binding.rowDifference
        val labelView = binding.textDiscLabel
        val diffView = binding.textDiscDifference
        val headerView = binding.step3Header

        if (diff == 0.0) {
            // Perfect match — green
            rowDifference?.setBackgroundColor(ContextCompat.getColor(this, R.color.posterita_secondary_light))
            labelView?.text = "Difference (Exact)"
            labelView?.setTextColor(ContextCompat.getColor(this, R.color.posterita_secondary))
            diffView?.setTextColor(ContextCompat.getColor(this, R.color.posterita_secondary))
            headerView?.setBackgroundColor(ContextCompat.getColor(this, R.color.posterita_secondary_light))
        } else if (diff > 0) {
            // Over — green
            rowDifference?.setBackgroundColor(ContextCompat.getColor(this, R.color.posterita_secondary_light))
            labelView?.text = "Difference (Over)"
            labelView?.setTextColor(ContextCompat.getColor(this, R.color.posterita_secondary))
            diffView?.setTextColor(ContextCompat.getColor(this, R.color.posterita_secondary))
            headerView?.setBackgroundColor(ContextCompat.getColor(this, R.color.posterita_secondary_light))
        } else {
            // Short — red
            rowDifference?.setBackgroundColor(ContextCompat.getColor(this, R.color.posterita_error_light))
            labelView?.text = "Difference (Short)"
            labelView?.setTextColor(ContextCompat.getColor(this, R.color.posterita_error))
            diffView?.setTextColor(ContextCompat.getColor(this, R.color.posterita_error))
            headerView?.setBackgroundColor(ContextCompat.getColor(this, R.color.posterita_error_light))
        }
    }

    // ---- LOAD TILL INFO + EXPECTED TOTALS -----------------------------------

    private fun loadTillInfo() {
        val dateFormat = SimpleDateFormat("EEEE, dd MMMM yyyy", Locale.getDefault())
        val currentDate = dateFormat.format(Date())
        val terminalId = prefsManager.terminalId

        lifecycleScope.launch(Dispatchers.IO) {
            val openTill = db.tillDao().getOpenTillByTerminalId(terminalId)

            if (openTill == null) {
                withContext(Dispatchers.Main) {
                    Toast.makeText(this@CloseTillActivity, "No open till found", Toast.LENGTH_SHORT).show()
                    finish()
                }
                return@launch
            }

            // Compute expected totals from orders
            val orders = db.orderDao().getOrdersByTillId(openTill.tillId)
            var cashTotal = 0.0
            var cardTotal = 0.0
            var voucherTotal = 0.0
            var blinkTotal = 0.0
            var salesTotal = 0.0

            for (order in orders) {
                val details = order.json?.let { OrderDetails.fromJson(it.toString()) } ?: continue
                for (payment in details.payments) {
                    when (payment.paymenttype) {
                        "CASH" -> cashTotal += payment.amount
                        "CARD" -> cardTotal += payment.amount
                        "Voucher" -> voucherTotal += payment.amount
                        "BLINK" -> blinkTotal += payment.amount
                        "FOREX" -> cashTotal += payment.amount // forex is cash equivalent
                    }
                }
                salesTotal += details.grandtotal
            }

            // Get adjustments
            val adjustments = db.tillAdjustmentDao().getAdjustmentsByTillId(openTill.tillId)
            var adjustmentNet = 0.0
            for (adj in adjustments) {
                if (adj.pay_type == "payin") adjustmentNet += adj.amount
                else adjustmentNet -= adj.amount
            }

            val expectedCash = openTill.openingAmt + cashTotal + adjustmentNet

            withContext(Dispatchers.Main) {
                currentTill = openTill

                // Till info header
                binding.textViewStoreNameValue?.text = prefsManager.storeName
                binding.textViewTerminalNameValue?.text = prefsManager.terminalName
                binding.txtdate?.text = currentDate
                binding.textViewDocumentNoValue?.text = openTill.documentno ?: ""
                binding.textViewOpeningDateValue?.text = openTill.dateOpened?.let {
                    SimpleDateFormat("dd MMM yyyy HH:mm", Locale.getDefault()).format(it)
                } ?: ""
                binding.textViewOpeningAmountValue?.text = NumberUtils.formatPrice(openTill.openingAmt)
                binding.textViewOpenedByNameValue?.text = prefsManager.userName

                // Step 1: Expected Totals
                expectedCashSales = cashTotal
                expectedCardSales = cardTotal + blinkTotal
                expectedVoucherSales = voucherTotal
                expectedBlinkSales = blinkTotal
                expectedAdjustmentNet = adjustmentNet
                expectedCashInDrawer = expectedCash
                totalSalesAmount = salesTotal
                orderCount = orders.size

                binding.textCashSales?.text = NumberUtils.formatPrice(cashTotal)
                binding.textCardSales?.text = NumberUtils.formatPrice(cardTotal + blinkTotal)

                if (voucherTotal > 0) {
                    binding.rowVoucherSales?.visibility = View.VISIBLE
                    binding.textVoucherSales?.text = NumberUtils.formatPrice(voucherTotal)
                }

                binding.textAdjustments?.text = NumberUtils.formatPrice(adjustmentNet)
                binding.textExpectedCash?.text = NumberUtils.formatPrice(expectedCash)
                binding.textOrderCount?.text = orders.size.toString()
                binding.textTotalSales?.text = NumberUtils.formatPrice(salesTotal)

                // Pre-fill card amount with expected card total (only if no draft)
                val hasDraft = prefsManager.getString(DRAFT_TILL_ID) == openTill.tillId.toString()
                if (!hasDraft) {
                    binding.editCardAmount?.setText(NumberUtils.formatPrice(cardTotal + blinkTotal))
                }

                // Restore draft values if available
                restoreDraft()

                // Initial discrepancy update
                updateDiscrepancy()
            }
        }
    }

    // ---- CLICK LISTENERS ----------------------------------------------------

    private fun setupClickListeners() {
        binding.back?.setOnClickListener { finish() }

        // Print Count Sheet
        binding.buttonPrintCountSheet?.setOnClickListener { printCountSheet() }

        // Save Draft & Continue Selling
        binding.buttonSaveDraft?.setOnClickListener { saveDraftAndFinish() }

        // Adjustments
        binding.buttonAddMoney?.setOnClickListener { showAdjustmentDialog(isPayIn = true) }
        binding.buttonRemoveMoney?.setOnClickListener { showAdjustmentDialog(isPayIn = false) }

        // Reports
        binding.buttonViewPayments?.setOnClickListener { showViewPaymentsDialog() }
        binding.buttonPrintCategorySummary?.setOnClickListener { printCategorySummary() }
        binding.buttonPrintItemsDetails?.setOnClickListener { printItemsDetails() }
        binding.buttonPrintStockByCategory?.setOnClickListener { printStockByCategory() }

        // Open Drawer (moved to Step 2 header)
        binding.buttonOpenDrawer?.setOnClickListener { openDrawer() }

        // Evidence photo buttons
        binding.buttonPhotoTill?.setOnClickListener { capturePhoto(1) }
        binding.buttonPhotoBankSlip?.setOnClickListener { capturePhoto(2) }
        binding.buttonPhotoZReport?.setOnClickListener { capturePhoto(3) }

        // Submit Reconciliation (replaces old Close Till button)
        binding.buttonCloseTill?.setOnClickListener { showCloseTillDialog() }
    }

    // ---- EVIDENCE PHOTOS ----------------------------------------------------

    private fun capturePhoto(target: Int) {
        currentPhotoTarget = target
        val label = when (target) {
            1 -> "till"
            2 -> "bank_slip"
            3 -> "z_report"
            else -> "photo"
        }
        try {
            val storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
            val photoFile = File.createTempFile(
                "close_till_${label}_",
                ".jpg",
                storageDir
            )
            currentPhotoUri = FileProvider.getUriForFile(
                this,
                "${packageName}.fileprovider",
                photoFile
            )
            currentPhotoUri?.let { takePictureLauncher.launch(it) }
        } catch (e: Exception) {
            Toast.makeText(this, "Cannot open camera: ${e.message}", Toast.LENGTH_SHORT).show()
        }
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

                // Reload to refresh expected totals
                loadTillInfo()
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

    // ---- CLOSE TILL ----------------------------------------------------------

    private fun showCloseTillDialog() {
        val till = currentTill ?: return

        val cashAmt = denominationTotal
        val cardAmt = NumberUtils.parseDouble(binding.editCardAmount?.text.toString())

        val diff = cashAmt - expectedCashInDrawer
        val diffLabel = when {
            diff > 0 -> "Over by ${NumberUtils.formatPrice(diff)}"
            diff < 0 -> "Short by ${NumberUtils.formatPrice(kotlin.math.abs(diff))}"
            else -> "Exact match"
        }

        val msg = buildString {
            append("Are you sure you want to close this till?\n\n")
            append("Cash Counted: ${NumberUtils.formatPrice(cashAmt)}\n")
            append("Expected Cash: ${NumberUtils.formatPrice(expectedCashInDrawer)}\n")
            append("Discrepancy: $diffLabel\n")
            append("Card Amount: ${NumberUtils.formatPrice(cardAmt)}\n")
            val photoCount = listOfNotNull(photoTillUri, photoBankSlipUri, photoZReportUri).size
            append("Photos: $photoCount / 3\n")
            append("\nThis action cannot be undone.")
        }

        AlertDialog.Builder(this)
            .setTitle("Confirm Close Till")
            .setMessage(msg)
            .setPositiveButton("Yes, Close Till") { _, _ ->
                executeCloseTill(cashAmt, cardAmt)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun executeCloseTill(cashAmt: Double, cardAmt: Double) {
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

                val closedDetails = tillService.closeTill(user, till, cashAmt, cardAmt)

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
                    clearDraft()
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

    // ---- PRINT COUNT SHEET ---------------------------------------------------

    private fun printCountSheet() {
        val till = currentTill ?: return
        Toast.makeText(this, "Printing denomination sheet...", Toast.LENGTH_SHORT).show()

        lifecycleScope.launch(Dispatchers.IO) {
            val width = 32
            val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())

            val sb = StringBuilder()
            sb.appendLine(prefsManager.storeName)
            sb.appendLine("Terminal: ${prefsManager.terminalName}")
            sb.appendLine(dateFormat.format(Date()))
            sb.appendLine("=".repeat(width))
            sb.appendLine("TILL DENOMINATION COUNT SHEET")
            sb.appendLine("=".repeat(width))
            sb.appendLine("")

            // Denominations
            val denoms = listOf(
                "Rs 2,000", "Rs 1,000", "Rs 500", "Rs 200", "Rs 100",
                "Rs 50", "Rs 25", "Rs 20", "Rs 10", "Rs 5"
            )
            val denomValues = listOf(2000, 1000, 500, 200, 100, 50, 25, 20, 10, 5)

            for (i in denoms.indices) {
                sb.appendLine("${denoms[i]}")
                sb.appendLine("  _____ x Rs ${denomValues[i]} = _____")
                sb.appendLine("")
            }

            sb.appendLine("Coins")
            sb.appendLine("  Total coins = _____")
            sb.appendLine("")
            sb.appendLine("-".repeat(width))
            sb.appendLine("")
            sb.appendLine("Cash total:     _____________")
            sb.appendLine("")
            sb.appendLine("Card total:     _____________")
            sb.appendLine("")
            sb.appendLine("Grand total:    _____________")
            sb.appendLine("")
            sb.appendLine("-".repeat(width))
            sb.appendLine("")
            sb.appendLine("Cashier signature:")
            sb.appendLine("")
            sb.appendLine("")
            sb.appendLine("_________________________")
            sb.appendLine("")
            sb.appendLine("Supervisor signature:")
            sb.appendLine("")
            sb.appendLine("")
            sb.appendLine("_________________________")
            sb.appendLine("")

            printRawToAllPrinters(sb.toString())

            withContext(Dispatchers.Main) {
                Toast.makeText(this@CloseTillActivity, "Denomination sheet printed", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // ---- DRAFT SAVE / RESTORE -----------------------------------------------

    private fun saveDraft() {
        val till = currentTill ?: return
        prefsManager.setString(DRAFT_TILL_ID, till.tillId.toString())
        prefsManager.setString(DRAFT_DENOM_2000, binding.denom2000Qty?.text?.toString() ?: "")
        prefsManager.setString(DRAFT_DENOM_1000, binding.denom1000Qty?.text?.toString() ?: "")
        prefsManager.setString(DRAFT_DENOM_500, binding.denom500Qty?.text?.toString() ?: "")
        prefsManager.setString(DRAFT_DENOM_200, binding.denom200Qty?.text?.toString() ?: "")
        prefsManager.setString(DRAFT_DENOM_100, binding.denom100Qty?.text?.toString() ?: "")
        prefsManager.setString(DRAFT_DENOM_50, binding.denom50Qty?.text?.toString() ?: "")
        prefsManager.setString(DRAFT_DENOM_25, binding.denom25Qty?.text?.toString() ?: "")
        prefsManager.setString(DRAFT_DENOM_20, binding.denom20Qty?.text?.toString() ?: "")
        prefsManager.setString(DRAFT_DENOM_10, binding.denom10Qty?.text?.toString() ?: "")
        prefsManager.setString(DRAFT_DENOM_5, binding.denom5Qty?.text?.toString() ?: "")
        prefsManager.setString(DRAFT_COINS, binding.denomCoinsQty?.text?.toString() ?: "")
        prefsManager.setString(DRAFT_CARD_AMT, binding.editCardAmount?.text?.toString() ?: "")
    }

    private fun restoreDraft() {
        val till = currentTill ?: return
        val savedTillId = prefsManager.getString(DRAFT_TILL_ID)
        if (savedTillId != till.tillId.toString()) return // draft is for a different till

        fun restore(editText: EditText?, key: String) {
            val value = prefsManager.getString(key)
            if (value.isNotBlank() && value != "0" && value != "0.00") {
                editText?.setText(value)
            }
        }

        restore(binding.denom2000Qty, DRAFT_DENOM_2000)
        restore(binding.denom1000Qty, DRAFT_DENOM_1000)
        restore(binding.denom500Qty, DRAFT_DENOM_500)
        restore(binding.denom200Qty, DRAFT_DENOM_200)
        restore(binding.denom100Qty, DRAFT_DENOM_100)
        restore(binding.denom50Qty, DRAFT_DENOM_50)
        restore(binding.denom25Qty, DRAFT_DENOM_25)
        restore(binding.denom20Qty, DRAFT_DENOM_20)
        restore(binding.denom10Qty, DRAFT_DENOM_10)
        restore(binding.denom5Qty, DRAFT_DENOM_5)
        restore(binding.denomCoinsQty, DRAFT_COINS)

        val cardDraft = prefsManager.getString(DRAFT_CARD_AMT)
        if (cardDraft.isNotBlank()) {
            binding.editCardAmount?.setText(cardDraft)
        }

        recalculateDenominationTotal()
    }

    private fun clearDraft() {
        for (key in DRAFT_KEYS) {
            prefsManager.setString(key, "")
        }
    }

    private fun saveDraftAndFinish() {
        saveDraft()
        Toast.makeText(this, "Draft saved \u2014 you can resume later", Toast.LENGTH_SHORT).show()
        finish()
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
