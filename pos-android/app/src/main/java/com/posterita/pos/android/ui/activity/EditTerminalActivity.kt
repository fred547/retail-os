package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.widget.SwitchCompat
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Store
import com.posterita.pos.android.data.local.entity.Terminal
import com.posterita.pos.android.util.AppErrorLogger
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class EditTerminalActivity : BaseActivity() {

    companion object {
        const val EXTRA_TERMINAL_ID = "terminal_id"
        const val EXTRA_STORE_ID = "store_id"
    }

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    private var terminalId = 0
    private var storeId = 0
    private var terminal: Terminal? = null
    private var allStores = listOf<Store>()
    private var selectedStoreId = 0

    private val isEditMode get() = terminalId > 0

    // POS config state (local until save)
    private var productColumns = 0
    private var categoryColumns = 0
    private var categoryMaxLines = 0
    private var showCategories = true
    private var showProductImages = true
    private var showProductPrice = true
    private var businessType = "retail"
    private var cartRemovalRequireNote = false
    private var cartRemovalRequirePin = false
    private var requireCustomerBeforeCheckout = true

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_edit_terminal)
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)
        supportActionBar?.hide()

        // Admin/owner check
        val currentUser = sessionManager.user
        if (currentUser == null || !currentUser.isAdminOrOwner) {
            Toast.makeText(this, "Only admins and owners can edit terminals", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        terminalId = intent.getIntExtra(EXTRA_TERMINAL_ID, 0)
        storeId = intent.getIntExtra(EXTRA_STORE_ID, prefsManager.storeId)
        selectedStoreId = storeId

        // Top bar
        val tvTitle = findViewById<TextView>(R.id.tv_title)
        tvTitle.text = if (isEditMode) "Edit Terminal" else "Add Terminal"
        findViewById<ImageView>(R.id.button_back).setOnClickListener { finish() }

        // Load POS config from prefs
        loadPosConfig()

        // Load data
        loadData()

        // Setup all sections
        setupProductColumnButtons()
        setupCategoryColumnButtons()
        setupCategoryMaxLineButtons()
        setupSwitches()
        setupBusinessTypeToggle()
        setupBottomButtons()
    }

    private fun loadPosConfig() {
        productColumns = prefsManager.productColumns
        categoryColumns = prefsManager.categoryColumns
        categoryMaxLines = prefsManager.categoryMaxLines
        showCategories = prefsManager.showCategories
        showProductImages = prefsManager.showProductImages
        showProductPrice = prefsManager.showProductPrice
        businessType = prefsManager.businessType
        cartRemovalRequireNote = prefsManager.cartRemovalRequireNote
        cartRemovalRequirePin = prefsManager.cartRemovalRequirePin
        requireCustomerBeforeCheckout = prefsManager.requireCustomerBeforeCheckout
    }

    private fun loadData() {
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                val stores = db.storeDao().getAllStores()
                val t = if (isEditMode) db.terminalDao().getTerminalById(terminalId) else null
                Pair(stores, t)
            }

            allStores = result.first
            terminal = result.second

            // Fill terminal fields
            if (terminal != null) {
                val t = terminal!!
                findViewById<TextInputEditText>(R.id.et_terminal_name).setText(t.name ?: "")
                findViewById<TextInputEditText>(R.id.et_receipt_prefix).setText(t.prefix ?: "")
                if (t.floatamt > 0) {
                    findViewById<TextInputEditText>(R.id.et_float_amount).setText("%.2f".format(t.floatamt))
                }
                selectedStoreId = t.store_id

                // Show delete button for edit mode
                findViewById<MaterialButton>(R.id.btn_delete).visibility = View.VISIBLE
            }

            // Store selector — only if multiple stores
            setupStoreSelector()

            // QR enrollment code — only for existing terminals
            if (isEditMode && terminal != null) {
                setupQrEnrollment()
            }
        }
    }

    private fun setupStoreSelector() {
        val tilStore = findViewById<TextInputLayout>(R.id.til_store)
        val actvStore = findViewById<AutoCompleteTextView>(R.id.actv_store)

        if (allStores.size > 1) {
            tilStore.visibility = View.VISIBLE
            val storeAdapter = ArrayAdapter(
                this,
                android.R.layout.simple_dropdown_item_1line,
                allStores.map { it.name ?: "Store ${it.storeId}" }
            )
            actvStore.setAdapter(storeAdapter)
            val currentIndex = allStores.indexOfFirst { it.storeId == selectedStoreId }
            if (currentIndex >= 0) {
                actvStore.setText(allStores[currentIndex].name ?: "Store ${allStores[currentIndex].storeId}", false)
            }
            actvStore.setOnItemClickListener { _, _, position, _ ->
                selectedStoreId = allStores[position].storeId
            }
        }
    }

    private fun setupQrEnrollment() {
        val cardQr = findViewById<MaterialCardView>(R.id.card_qr_enrollment)
        val ivQr = findViewById<ImageView>(R.id.iv_qr_code)
        val btnExport = findViewById<MaterialButton>(R.id.btn_export_pdf)

        cardQr.visibility = View.VISIBLE

        val accountId = prefsManager.accountId
        val storeIdForQr = terminal?.store_id ?: prefsManager.storeId
        val qrContent = "POSTERITA:1:$accountId:$storeIdForQr:$terminalId"
        val bitmap = generateQrBitmap(qrContent, 512)
        if (bitmap != null) {
            ivQr.setImageBitmap(bitmap)
        }

        btnExport.setOnClickListener {
            exportQrPdf()
        }
    }

    // ——— Product Columns (1-4) ———

    private fun setupProductColumnButtons() {
        val btn1 = findViewById<TextView>(R.id.btn_col_1)
        val btn2 = findViewById<TextView>(R.id.btn_col_2)
        val btn3 = findViewById<TextView>(R.id.btn_col_3)
        val btn4 = findViewById<TextView>(R.id.btn_col_4)
        val buttons = listOf(btn1, btn2, btn3, btn4)

        fun highlight(selected: Int) {
            buttons.forEachIndexed { index, btn ->
                if (index + 1 == selected) {
                    btn.setBackgroundResource(R.drawable.btn_rounded)
                    btn.setTextColor(resources.getColor(R.color.white, null))
                } else {
                    btn.setBackgroundResource(R.drawable.stroke_btn)
                    btn.setTextColor(resources.getColor(R.color.black, null))
                }
            }
        }

        highlight(productColumns)

        btn1.setOnClickListener { productColumns = 1; highlight(1) }
        btn2.setOnClickListener { productColumns = 2; highlight(2) }
        btn3.setOnClickListener { productColumns = 3; highlight(3) }
        btn4.setOnClickListener { productColumns = 4; highlight(4) }
    }

    // ——— Category Columns (2-6) ———

    private fun setupCategoryColumnButtons() {
        val btn2 = findViewById<TextView>(R.id.btn_catcol_2)
        val btn3 = findViewById<TextView>(R.id.btn_catcol_3)
        val btn4 = findViewById<TextView>(R.id.btn_catcol_4)
        val btn5 = findViewById<TextView>(R.id.btn_catcol_5)
        val btn6 = findViewById<TextView>(R.id.btn_catcol_6)
        val buttons = listOf(btn2, btn3, btn4, btn5, btn6)

        fun highlight(selected: Int) {
            buttons.forEachIndexed { index, btn ->
                if (index + 2 == selected) {
                    btn.setBackgroundResource(R.drawable.btn_rounded)
                    btn.setTextColor(resources.getColor(R.color.white, null))
                } else {
                    btn.setBackgroundResource(R.drawable.stroke_btn)
                    btn.setTextColor(resources.getColor(R.color.black, null))
                }
            }
        }

        highlight(categoryColumns)

        btn2.setOnClickListener { categoryColumns = 2; highlight(2) }
        btn3.setOnClickListener { categoryColumns = 3; highlight(3) }
        btn4.setOnClickListener { categoryColumns = 4; highlight(4) }
        btn5.setOnClickListener { categoryColumns = 5; highlight(5) }
        btn6.setOnClickListener { categoryColumns = 6; highlight(6) }
    }

    // ——— Category Max Lines (1-4) ———

    private fun setupCategoryMaxLineButtons() {
        val btn1 = findViewById<TextView>(R.id.btn_cat_1)
        val btn2 = findViewById<TextView>(R.id.btn_cat_2)
        val btn3 = findViewById<TextView>(R.id.btn_cat_3)
        val btn4 = findViewById<TextView>(R.id.btn_cat_4)
        val buttons = listOf(btn1, btn2, btn3, btn4)

        fun highlight(selected: Int) {
            buttons.forEachIndexed { index, btn ->
                if (index + 1 == selected) {
                    btn.setBackgroundResource(R.drawable.btn_rounded)
                    btn.setTextColor(resources.getColor(R.color.white, null))
                } else {
                    btn.setBackgroundResource(R.drawable.stroke_btn)
                    btn.setTextColor(resources.getColor(R.color.black, null))
                }
            }
        }

        highlight(categoryMaxLines)

        btn1.setOnClickListener { categoryMaxLines = 1; highlight(1) }
        btn2.setOnClickListener { categoryMaxLines = 2; highlight(2) }
        btn3.setOnClickListener { categoryMaxLines = 3; highlight(3) }
        btn4.setOnClickListener { categoryMaxLines = 4; highlight(4) }
    }

    // ——— Switches ———

    private fun setupSwitches() {
        bindSwitch(R.id.switch_categories, showCategories) { showCategories = it }
        bindSwitch(R.id.switch_product_images, showProductImages) { showProductImages = it }
        bindSwitch(R.id.switch_product_price, showProductPrice) { showProductPrice = it }
        bindSwitch(R.id.switch_require_removal_note, cartRemovalRequireNote) { cartRemovalRequireNote = it }
        bindSwitch(R.id.switch_require_removal_pin, cartRemovalRequirePin) { cartRemovalRequirePin = it }
        bindSwitch(R.id.switch_require_customer, requireCustomerBeforeCheckout) { requireCustomerBeforeCheckout = it }
    }

    private fun bindSwitch(id: Int, initialValue: Boolean, onChanged: (Boolean) -> Unit) {
        val switch = findViewById<SwitchCompat>(id)
        switch.isChecked = initialValue
        switch.setOnCheckedChangeListener { _, isChecked -> onChanged(isChecked) }
    }

    // ——— Business Type Toggle ———

    private fun setupBusinessTypeToggle() {
        val btnRetail = findViewById<TextView>(R.id.btn_retail)
        val btnRestaurant = findViewById<TextView>(R.id.btn_restaurant)

        fun highlight(type: String) {
            if (type == "retail") {
                btnRetail.setBackgroundResource(R.drawable.btn_rounded)
                btnRetail.setTextColor(resources.getColor(R.color.white, null))
                btnRestaurant.setBackgroundResource(R.drawable.stroke_btn)
                btnRestaurant.setTextColor(resources.getColor(R.color.black, null))
            } else {
                btnRestaurant.setBackgroundResource(R.drawable.btn_rounded)
                btnRestaurant.setTextColor(resources.getColor(R.color.white, null))
                btnRetail.setBackgroundResource(R.drawable.stroke_btn)
                btnRetail.setTextColor(resources.getColor(R.color.black, null))
            }
        }

        highlight(businessType)

        btnRetail.setOnClickListener { businessType = "retail"; highlight("retail") }
        btnRestaurant.setOnClickListener { businessType = "restaurant"; highlight("restaurant") }
    }

    // ——— Bottom Buttons ———

    private fun setupBottomButtons() {
        val btnSave = findViewById<MaterialButton>(R.id.btn_save)
        val btnDelete = findViewById<MaterialButton>(R.id.btn_delete)

        btnSave.setOnClickListener { saveTerminal() }
        btnDelete.setOnClickListener { confirmDelete() }
    }

    private fun saveTerminal() {
        val name = findViewById<TextInputEditText>(R.id.et_terminal_name).text?.toString()?.trim() ?: ""
        val prefix = findViewById<TextInputEditText>(R.id.et_receipt_prefix).text?.toString()?.trim() ?: ""
        val floatAmt = findViewById<TextInputEditText>(R.id.et_float_amount).text?.toString()?.trim()?.toDoubleOrNull() ?: 0.0

        if (name.isEmpty()) {
            findViewById<TextInputLayout>(R.id.til_terminal_name).error = "Terminal name is required"
            return
        }
        findViewById<TextInputLayout>(R.id.til_terminal_name).error = null

        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                if (isEditMode && terminal != null) {
                    val updated = terminal!!.copy(
                        name = name,
                        prefix = prefix,
                        floatamt = floatAmt,
                        store_id = selectedStoreId
                    )
                    db.terminalDao().updateTerminal(updated)
                    if (terminal!!.terminalId == prefsManager.terminalId) {
                        prefsManager.setTerminalNameSync(name)
                    }
                } else {
                    val maxId = db.terminalDao().getMaxTerminalId() ?: 0
                    val newTerminal = Terminal(
                        terminalId = maxId + 1,
                        name = name,
                        prefix = prefix,
                        floatamt = floatAmt,
                        store_id = selectedStoreId,
                        isactive = "Y"
                    )
                    db.terminalDao().insertTerminal(newTerminal)
                }

                // Save POS config to prefs
                prefsManager.productColumns = productColumns
                prefsManager.categoryColumns = categoryColumns
                prefsManager.categoryMaxLines = categoryMaxLines
                prefsManager.showCategories = showCategories
                prefsManager.showProductImages = showProductImages
                prefsManager.showProductPrice = showProductPrice
                prefsManager.businessType = businessType
                prefsManager.cartRemovalRequireNote = cartRemovalRequireNote
                prefsManager.cartRemovalRequirePin = cartRemovalRequirePin
                prefsManager.requireCustomerBeforeCheckout = requireCustomerBeforeCheckout
            }

            Toast.makeText(
                this@EditTerminalActivity,
                if (isEditMode) "Terminal updated" else "Terminal added",
                Toast.LENGTH_SHORT
            ).show()
            setResult(RESULT_OK)
            finish()
        }
    }

    private fun confirmDelete() {
        if (terminal == null) return
        if (terminal!!.terminalId == prefsManager.terminalId) {
            Toast.makeText(this, "Cannot delete the active terminal", Toast.LENGTH_SHORT).show()
            return
        }
        MaterialAlertDialogBuilder(this)
            .setTitle("Delete Terminal")
            .setMessage("Are you sure you want to delete '${terminal!!.name}'?")
            .setPositiveButton("Delete") { _, _ ->
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) { db.terminalDao().deleteTerminal(terminal!!) }
                    Toast.makeText(this@EditTerminalActivity, "Terminal deleted", Toast.LENGTH_SHORT).show()
                    setResult(RESULT_OK)
                    finish()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    // ——— QR Code Generation & Export ———

    private fun generateQrBitmap(content: String, size: Int): Bitmap? {
        return try {
            val writer = QRCodeWriter()
            val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size)
            val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)
            for (x in 0 until size) {
                for (y in 0 until size) {
                    bitmap.setPixel(x, y, if (bitMatrix[x, y]) Color.BLACK else Color.WHITE)
                }
            }
            bitmap
        } catch (e: Exception) {
            AppErrorLogger.warn(this, "EditTerminalActivity", "Failed to generate QR bitmap", e)
            null
        }
    }

    private fun exportQrPdf() {
        val t = terminal ?: return
        val accountId = prefsManager.accountId
        val storeIdForQr = t.store_id.takeIf { it > 0 } ?: prefsManager.storeId
        val qrContent = "POSTERITA:1:$accountId:$storeIdForQr:${t.terminalId}"
        val qrBitmap = generateQrBitmap(qrContent, 512) ?: return

        try {
            val document = android.graphics.pdf.PdfDocument()
            val pageInfo = android.graphics.pdf.PdfDocument.PageInfo.Builder(595, 842, 1).create() // A4
            val page = document.startPage(pageInfo)
            val canvas = page.canvas

            val paint = android.graphics.Paint().apply {
                isAntiAlias = true
                color = Color.BLACK
            }

            // Title
            paint.textSize = 28f
            paint.typeface = android.graphics.Typeface.create(android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD)
            val title = "Terminal Enrollment"
            canvas.drawText(title, (595 - paint.measureText(title)) / 2, 80f, paint)

            // Terminal name
            paint.textSize = 22f
            paint.typeface = android.graphics.Typeface.DEFAULT
            val name = t.name ?: "Terminal ${t.terminalId}"
            canvas.drawText(name, (595 - paint.measureText(name)) / 2, 120f, paint)

            // Store name
            val storeName = allStores.find { it.storeId == t.store_id }?.name
            if (storeName != null) {
                paint.textSize = 16f
                paint.color = Color.GRAY
                canvas.drawText(storeName, (595 - paint.measureText(storeName)) / 2, 150f, paint)
                paint.color = Color.BLACK
            }

            // QR code centered
            val qrSize = 300
            val qrLeft = (595 - qrSize) / 2f
            val qrTop = 200f
            val dst = android.graphics.RectF(qrLeft, qrTop, qrLeft + qrSize, qrTop + qrSize)
            canvas.drawBitmap(qrBitmap, null, dst, paint)

            // Instructions
            paint.textSize = 14f
            paint.color = Color.GRAY
            val instruction = "Scan this QR code to enroll a device to this terminal"
            canvas.drawText(instruction, (595 - paint.measureText(instruction)) / 2, qrTop + qrSize + 40, paint)

            // Terminal ID
            paint.textSize = 12f
            val idLine = "Terminal ID: ${t.terminalId}  |  Prefix: ${t.prefix ?: "N/A"}"
            canvas.drawText(idLine, (595 - paint.measureText(idLine)) / 2, qrTop + qrSize + 70, paint)

            document.finishPage(page)

            // Save to cache and share
            val file = java.io.File(cacheDir, "terminal_${t.terminalId}_qr.pdf")
            document.writeTo(java.io.FileOutputStream(file))
            document.close()

            val uri = androidx.core.content.FileProvider.getUriForFile(
                this, "$packageName.fileprovider", file
            )
            val shareIntent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                type = "application/pdf"
                putExtra(android.content.Intent.EXTRA_STREAM, uri)
                addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            startActivity(android.content.Intent.createChooser(shareIntent, "Export QR Code"))
        } catch (e: Exception) {
            AppErrorLogger.warn(this, "EditTerminalActivity", "Failed to export QR PDF", e)
            Toast.makeText(this, "Failed to export PDF: ${e.message}", Toast.LENGTH_SHORT).show()
        }
    }
}
