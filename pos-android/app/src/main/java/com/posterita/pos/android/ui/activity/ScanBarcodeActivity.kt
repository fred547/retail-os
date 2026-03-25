package com.posterita.pos.android.ui.activity

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import com.journeyapps.barcodescanner.BarcodeCallback
import com.journeyapps.barcodescanner.BarcodeResult
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.databinding.ActivityScanBarcodeBinding
import com.posterita.pos.android.ui.viewmodel.ShoppingCartViewModel
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import androidx.activity.viewModels
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class ScanBarcodeActivity : BaseActivity() {

    private lateinit var binding: ActivityScanBarcodeBinding

    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var db: AppDatabase

    private val shoppingCartViewModel: ShoppingCartViewModel by viewModels()

    private var isFlashOn = false
    private var isAutoScan = true
    private var scannedCount = 0
    private var lastBarcode: String? = null
    private val handler = Handler(Looper.getMainLooper())
    private var toastDismissRunnable: Runnable? = null
    private var laserAnimator: ObjectAnimator? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityScanBarcodeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        isAutoScan = prefsManager.scannerAutoScan

        setupBarcodeScanner()
        setupControls()
        updateStatusText()
        updateCartBadge()
        observeCart()
        startLaserAnimation()
    }

    private fun setupBarcodeScanner() {
        binding.cameraPreview.decodeContinuous(object : BarcodeCallback {
            override fun barcodeResult(result: BarcodeResult?) {
                result?.text?.let { barcode ->
                    if (barcode.isNotEmpty() && barcode != lastBarcode) {
                        lastBarcode = barcode
                        scannedCount++
                        updateStatusText()

                        // Check for terminal enrollment QR (new and old formats)
                        if (barcode.startsWith("POSTERITA:") || barcode.startsWith("TERMINAL:")) {
                            handleTerminalEnrollment(barcode)
                            return
                        }

                        // Look up product and add to cart
                        lookupAndAddProduct(barcode)

                        // Allow re-scanning same barcode after 2s
                        handler.postDelayed({ lastBarcode = null }, 2000)

                        if (!isAutoScan) {
                            binding.cameraPreview.pause()
                        }
                    }
                }
            }
        })
    }

    /**
     * Parse enrollment QR data. Supports two formats:
     * - New: POSTERITA:1:{accountId}:{storeId}:{terminalId}
     * - Old: TERMINAL:{terminalId}:{accountId} (storeId = 0, lookup required)
     */
    private data class EnrollmentData(val accountId: String, val storeId: Int, val terminalId: Int)

    private fun parseEnrollmentQr(qrContent: String): EnrollmentData? {
        val parts = qrContent.split(":")
        return when {
            // New format: POSTERITA:1:{accountId}:{storeId}:{terminalId}
            parts.size == 5 && parts[0] == "POSTERITA" -> {
                val accountId = parts[2]
                val storeId = parts[3].toIntOrNull() ?: return null
                val terminalId = parts[4].toIntOrNull() ?: return null
                if (accountId.isBlank()) return null
                EnrollmentData(accountId, storeId, terminalId)
            }
            // Old format: TERMINAL:{terminalId}:{accountId}
            parts.size == 3 && parts[0] == "TERMINAL" -> {
                val terminalId = parts[1].toIntOrNull() ?: return null
                val accountId = parts[2]
                if (accountId.isBlank()) return null
                EnrollmentData(accountId, 0, terminalId)
            }
            else -> null
        }
    }

    private fun handleTerminalEnrollment(qrContent: String) {
        val enrollData = parseEnrollmentQr(qrContent)
        if (enrollData == null) {
            showProductToast("Invalid QR", "Not a valid terminal enrollment code")
            return
        }

        val (accountId, storeId, terminalId) = enrollData

        // Pause scanning while processing
        binding.cameraPreview.pause()

        lifecycleScope.launch {
            // Check if terminal already exists locally (same-device re-enrollment)
            val localTerminal = withContext(Dispatchers.IO) {
                db.terminalDao().getTerminalById(terminalId)
            }

            if (localTerminal != null) {
                // Terminal found locally — do local enrollment (switch active terminal)
                handleLocalEnrollment(localTerminal, terminalId)
            } else {
                // New device — call cloud API to fetch bootstrap data
                handleCloudEnrollment(accountId, storeId, terminalId)
            }
        }
    }

    /**
     * Local enrollment: terminal already exists in Room DB. Just switch the active terminal.
     */
    private fun handleLocalEnrollment(terminal: com.posterita.pos.android.data.local.entity.Terminal, terminalId: Int) {
        lifecycleScope.launch {
            val terminalName = terminal.name ?: "Terminal $terminalId"
            val storeName = withContext(Dispatchers.IO) {
                db.storeDao().getStoreById(terminal.store_id)?.name
            } ?: "Unknown Store"

            AlertDialog.Builder(this@ScanBarcodeActivity)
                .setTitle("Enroll Device")
                .setMessage("Link this device to:\n\nTerminal: $terminalName\nStore: $storeName\n\nThis will set this device as the active terminal.")
                .setPositiveButton("Enroll") { _, _ ->
                    lifecycleScope.launch {
                        withContext(Dispatchers.IO) {
                            // Mark all terminals as not selected
                            val allTerminals = db.terminalDao().getAllTerminals()
                            for (t in allTerminals) {
                                if (t.isselected == "Y") {
                                    db.terminalDao().updateTerminal(t.copy(isselected = "N"))
                                }
                            }
                            // Select the scanned terminal
                            db.terminalDao().updateTerminal(terminal.copy(isselected = "Y"))
                            sessionManager.terminal = terminal
                            // Update prefs
                            prefsManager.setTerminalIdSync(terminalId)
                            prefsManager.setTerminalNameSync(terminalName)
                            prefsManager.setStoreIdSync(terminal.store_id)
                            prefsManager.setStoreNameSync(storeName)
                            val store = db.storeDao().getStoreById(terminal.store_id)
                            if (store != null) sessionManager.store = store
                        }
                        Toast.makeText(this@ScanBarcodeActivity,
                            "Device enrolled to $terminalName", Toast.LENGTH_LONG).show()
                        setResult(Activity.RESULT_OK)
                        finish()
                    }
                }
                .setNegativeButton("Cancel") { _, _ ->
                    binding.cameraPreview.resume()
                }
                .setCancelable(false)
                .show()
        }
    }

    /**
     * Cloud enrollment: call POST /api/enroll to get full bootstrap data,
     * populate Room DB, set preferences, then navigate to Home.
     */
    private fun handleCloudEnrollment(accountId: String, storeId: Int, terminalId: Int) {
        lifecycleScope.launch {
            showProductToast("Enrolling...", "Downloading store data from server")

            val result = withContext(Dispatchers.IO) {
                callEnrollApi(accountId, storeId, terminalId)
            }

            if (result == null) {
                AlertDialog.Builder(this@ScanBarcodeActivity)
                    .setTitle("Enrollment Failed")
                    .setMessage("Could not connect to the server. Check your internet connection and try again.")
                    .setPositiveButton("OK") { _, _ -> binding.cameraPreview.resume() }
                    .setCancelable(false)
                    .show()
                return@launch
            }

            try {
                val success = result.optBoolean("success", false)
                if (!success) {
                    val errorMsg = result.optString("error", "Unknown error")
                    AlertDialog.Builder(this@ScanBarcodeActivity)
                        .setTitle("Enrollment Failed")
                        .setMessage(errorMsg)
                        .setPositiveButton("OK") { _, _ -> binding.cameraPreview.resume() }
                        .setCancelable(false)
                        .show()
                    return@launch
                }

                // Parse and populate local database
                withContext(Dispatchers.IO) {
                    populateFromEnrollment(result, accountId, storeId, terminalId)
                }

                // Get names for display
                val enrolledTerminal = result.optJSONObject("enrolled_terminal")
                val enrolledStore = result.optJSONObject("enrolled_store")
                val terminalName = enrolledTerminal?.optString("name") ?: "Terminal $terminalId"
                val storeName = enrolledStore?.optString("name") ?: "Store $storeId"

                AlertDialog.Builder(this@ScanBarcodeActivity)
                    .setTitle("Enrollment Complete")
                    .setMessage("This device is now linked to:\n\nTerminal: $terminalName\nStore: $storeName\n\nTap OK to start using the POS.")
                    .setPositiveButton("OK") { _, _ ->
                        setResult(Activity.RESULT_OK)
                        finish()
                    }
                    .setCancelable(false)
                    .show()

            } catch (e: Exception) {
                com.posterita.pos.android.util.AppErrorLogger.log(
                    this@ScanBarcodeActivity, "ScanBarcode", "Enrollment parsing failed", e
                )
                AlertDialog.Builder(this@ScanBarcodeActivity)
                    .setTitle("Enrollment Failed")
                    .setMessage("Failed to process enrollment data: ${e.message}")
                    .setPositiveButton("OK") { _, _ -> binding.cameraPreview.resume() }
                    .setCancelable(false)
                    .show()
            }
        }
    }

    /**
     * Call the enrollment API to get bootstrap data for a new device.
     */
    private fun callEnrollApi(accountId: String, storeId: Int, terminalId: Int): org.json.JSONObject? {
        return try {
            val baseUrl = com.posterita.pos.android.util.Constants.DEFAULT_CLOUD_SYNC_URL
            val enrollUrl = "${baseUrl}enroll"
            val url = java.net.URL(enrollUrl)
            val conn = url.openConnection() as java.net.HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.connectTimeout = 15_000
            conn.readTimeout = 30_000
            conn.doOutput = true

            val payload = org.json.JSONObject().apply {
                put("account_id", accountId)
                put("store_id", storeId)
                put("terminal_id", terminalId)
            }

            java.io.OutputStreamWriter(conn.outputStream).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            val responseCode = conn.responseCode
            val responseBody = if (responseCode in 200..299) {
                conn.inputStream.bufferedReader().readText()
            } else {
                conn.errorStream?.bufferedReader()?.readText()
            }

            conn.disconnect()

            if (responseBody != null) org.json.JSONObject(responseBody) else null
        } catch (e: Exception) {
            com.posterita.pos.android.util.AppErrorLogger.warn(
                this, "ScanBarcode", "Enroll API call failed", e
            )
            null
        }
    }

    /**
     * Populate local Room database from enrollment API response.
     */
    private suspend fun populateFromEnrollment(
        json: org.json.JSONObject,
        accountId: String,
        storeId: Int,
        terminalId: Int
    ) {
        // Reset database for new account
        AppDatabase.resetInstance()
        val freshDb = AppDatabase.getInstance(this@ScanBarcodeActivity, accountId)

        // Account
        val acct = json.optJSONObject("account")
        if (acct != null) {
            freshDb.accountDao().insertAccounts(listOf(
                com.posterita.pos.android.data.local.entity.Account(
                    account_id = accountId,
                    businessname = acct.optString("businessname"),
                    address1 = acct.optString("address1"),
                    address2 = acct.optString("address2"),
                    city = acct.optString("city"),
                    state = acct.optString("state"),
                    zip = acct.optString("zip"),
                    phone1 = acct.optString("phone1"),
                    phone2 = acct.optString("phone2"),
                    website = acct.optString("website"),
                    currency = acct.optString("currency"),
                    isactive = acct.optString("isactive", "Y"),
                    vatregno = acct.optString("vatregno"),
                    receiptmessage = acct.optString("receiptmessage"),
                    whatsappNumber = acct.optString("whatsapp_number"),
                    headOfficeAddress = acct.optString("head_office_address")
                )
            ))
        }

        // Stores
        val storesArr = json.optJSONArray("stores")
        if (storesArr != null) {
            val stores = mutableListOf<com.posterita.pos.android.data.local.entity.Store>()
            for (i in 0 until storesArr.length()) {
                val s = storesArr.getJSONObject(i)
                stores.add(com.posterita.pos.android.data.local.entity.Store(
                    storeId = s.optInt("store_id"),
                    name = s.optString("name"),
                    address = s.optString("address"),
                    city = s.optString("city"),
                    state = s.optString("state"),
                    zip = s.optString("zip"),
                    country = s.optString("country"),
                    currency = s.optString("currency"),
                    isactive = s.optString("isactive", "Y")
                ))
            }
            if (stores.isNotEmpty()) freshDb.storeDao().insertStores(stores)
        }

        // Terminals
        val terminalsArr = json.optJSONArray("terminals")
        if (terminalsArr != null) {
            val terminals = mutableListOf<com.posterita.pos.android.data.local.entity.Terminal>()
            for (i in 0 until terminalsArr.length()) {
                val t = terminalsArr.getJSONObject(i)
                val tid = t.optInt("terminal_id")
                terminals.add(com.posterita.pos.android.data.local.entity.Terminal(
                    terminalId = tid,
                    name = t.optString("name"),
                    store_id = t.optInt("store_id"),
                    prefix = t.optString("prefix"),
                    sequence = t.optInt("sequence"),
                    cash_up_sequence = t.optInt("cash_up_sequence"),
                    isactive = t.optString("isactive", "Y"),
                    isselected = if (tid == terminalId) "Y" else "N"
                ))
            }
            if (terminals.isNotEmpty()) freshDb.terminalDao().insertTerminals(terminals)
        }

        // Users
        val usersArr = json.optJSONArray("users")
        if (usersArr != null) {
            val users = mutableListOf<com.posterita.pos.android.data.local.entity.User>()
            for (i in 0 until usersArr.length()) {
                val u = usersArr.getJSONObject(i)
                users.add(com.posterita.pos.android.data.local.entity.User(
                    user_id = u.optInt("user_id"),
                    username = u.optString("username"),
                    firstname = u.optString("firstname"),
                    lastname = u.optString("lastname"),
                    pin = u.optString("pin"),
                    role = u.optString("role"),
                    isadmin = u.optString("isadmin"),
                    issalesrep = u.optString("issalesrep"),
                    permissions = u.optString("permissions"),
                    discountlimit = u.optDouble("discountlimit", 0.0),
                    isactive = u.optString("isactive", "Y")
                ))
            }
            if (users.isNotEmpty()) freshDb.userDao().insertUsers(users)
        }

        // Products
        val productsArr = json.optJSONArray("products")
        if (productsArr != null) {
            val products = mutableListOf<com.posterita.pos.android.data.local.entity.Product>()
            for (i in 0 until productsArr.length()) {
                val p = productsArr.getJSONObject(i)
                products.add(com.posterita.pos.android.data.local.entity.Product(
                    product_id = p.optInt("product_id"),
                    name = p.optString("name"),
                    description = p.optString("description"),
                    sellingprice = p.optDouble("sellingprice", 0.0),
                    costprice = p.optDouble("costprice", 0.0),
                    taxamount = p.optDouble("taxamount", 0.0),
                    tax_id = p.optInt("tax_id"),
                    productcategory_id = p.optInt("productcategory_id"),
                    image = p.optString("image"),
                    upc = p.optString("upc"),
                    itemcode = p.optString("itemcode"),
                    barcodetype = p.optString("barcodetype"),
                    isactive = p.optString("isactive", "Y"),
                    istaxincluded = p.optString("istaxincluded"),
                    isstock = p.optString("isstock"),
                    isvariableitem = p.optString("isvariableitem"),
                    iskitchenitem = p.optString("iskitchenitem"),
                    ismodifier = p.optString("ismodifier"),
                    isfavourite = p.optString("isfavourite"),
                    wholesaleprice = p.optDouble("wholesaleprice", 0.0),
                    product_status = p.optString("product_status", "live"),
                    source = p.optString("source", "manual")
                ))
            }
            if (products.isNotEmpty()) freshDb.productDao().insertProducts(products)
        }

        // Categories
        val catsArr = json.optJSONArray("categories")
        if (catsArr != null) {
            val categories = mutableListOf<com.posterita.pos.android.data.local.entity.ProductCategory>()
            for (i in 0 until catsArr.length()) {
                val c = catsArr.getJSONObject(i)
                categories.add(com.posterita.pos.android.data.local.entity.ProductCategory(
                    productcategory_id = c.optInt("productcategory_id"),
                    name = c.optString("name"),
                    isactive = c.optString("isactive", "Y"),
                    display = c.optString("display"),
                    position = c.optInt("position"),
                    tax_id = c.optString("tax_id")
                ))
            }
            if (categories.isNotEmpty()) freshDb.productCategoryDao().insertProductCategories(categories)
        }

        // Taxes
        val taxesArr = json.optJSONArray("taxes")
        if (taxesArr != null) {
            val taxes = mutableListOf<com.posterita.pos.android.data.local.entity.Tax>()
            for (i in 0 until taxesArr.length()) {
                val t = taxesArr.getJSONObject(i)
                taxes.add(com.posterita.pos.android.data.local.entity.Tax(
                    tax_id = t.optInt("tax_id"),
                    name = t.optString("name"),
                    rate = t.optDouble("rate", 0.0),
                    taxcode = t.optString("taxcode"),
                    isactive = t.optString("isactive", "Y")
                ))
            }
            if (taxes.isNotEmpty()) freshDb.taxDao().insertTaxes(taxes)
        }

        // Modifiers
        val modsArr = json.optJSONArray("modifiers")
        if (modsArr != null) {
            val modifiers = mutableListOf<com.posterita.pos.android.data.local.entity.Modifier>()
            for (i in 0 until modsArr.length()) {
                val m = modsArr.getJSONObject(i)
                modifiers.add(com.posterita.pos.android.data.local.entity.Modifier(
                    modifier_id = m.optInt("modifier_id"),
                    name = m.optString("name"),
                    sellingprice = m.optDouble("sellingprice", 0.0),
                    costprice = m.optDouble("costprice", 0.0),
                    tax_id = m.optInt("tax_id"),
                    productcategory_id = m.optInt("productcategory_id"),
                    isactive = m.optString("isactive", "Y"),
                    product_id = m.optInt("product_id")
                ))
            }
            if (modifiers.isNotEmpty()) freshDb.modifierDao().insertModifiers(modifiers)
        }

        // Set SharedPreferences
        prefsManager.setAccountIdSync(accountId)
        prefsManager.setStoreIdSync(storeId)
        prefsManager.setTerminalIdSync(terminalId)
        prefsManager.setString("setup_completed", "true")

        // Set store/terminal names from enrolled objects
        val enrolledStore = json.optJSONObject("enrolled_store")
        val enrolledTerminal = json.optJSONObject("enrolled_terminal")
        prefsManager.setStoreNameSync(enrolledStore?.optString("name") ?: "Store $storeId")
        prefsManager.setTerminalNameSync(enrolledTerminal?.optString("name") ?: "Terminal $terminalId")

        // Save sync secret if returned
        val syncSecret = json.optString("sync_secret", "")
        if (syncSecret.isNotEmpty()) {
            prefsManager.setStringSync("sync_secret", syncSecret)
        }

        // Set currency from account
        val currency = acct?.optString("currency") ?: ""
        if (currency.isNotEmpty()) {
            prefsManager.setStringSync("currency", currency)
        }
    }

    private fun lookupAndAddProduct(barcode: String) {
        lifecycleScope.launch(Dispatchers.IO) {
            val product = db.productDao().getProductByUpc(barcode)
            withContext(Dispatchers.Main) {
                if (product != null) {
                    shoppingCartViewModel.addProduct(product)
                    val currency = sessionManager.account?.currency ?: ""
                    showProductToast(
                        product.name ?: barcode,
                        "$currency ${NumberUtils.formatPrice(product.sellingprice)}"
                    )
                } else {
                    showProductToast(barcode, "Product not found")
                }
            }
        }
    }

    private fun showProductToast(name: String, price: String) {
        // Cancel any pending dismiss
        toastDismissRunnable?.let { handler.removeCallbacks(it) }

        binding.cardScanToast?.let { card ->
            binding.textToastProductName?.text = name
            binding.textToastProductPrice?.text = price
            binding.textToastCount?.text = "$scannedCount items"

            // Fade in
            card.visibility = View.VISIBLE
            card.alpha = 0f
            card.animate().alpha(1f).setDuration(200).start()

            // Auto-dismiss after 2 seconds
            toastDismissRunnable = Runnable {
                card.animate().alpha(0f).setDuration(300).withEndAction {
                    card.visibility = View.GONE
                }.start()
            }
            handler.postDelayed(toastDismissRunnable!!, 2000)
        }
    }

    private fun observeCart() {
        shoppingCartViewModel.totalQty.observe(this) { qty ->
            updateCartBadge()
            // Update button text with total
            val count = qty?.toInt() ?: 0
            val currency = sessionManager.account?.currency ?: ""
            val total = shoppingCartViewModel.grandTotalAmount.value ?: 0.0
            binding.buttonMyCart?.text = if (count > 0) {
                "MY CART  $currency ${NumberUtils.formatPrice(total)}"
            } else {
                ""
            }
        }

        shoppingCartViewModel.grandTotalAmount.observe(this) { _ ->
            val count = shoppingCartViewModel.totalQty.value?.toInt() ?: 0
            val currency = sessionManager.account?.currency ?: ""
            val total = shoppingCartViewModel.grandTotalAmount.value ?: 0.0
            binding.buttonMyCart?.text = if (count > 0) {
                "MY CART  $currency ${NumberUtils.formatPrice(total)}"
            } else {
                ""
            }
        }
    }

    private fun updateCartBadge() {
        val count = shoppingCartViewModel.totalQty.value?.toInt() ?: 0
        binding.textCartBadge?.let { badge ->
            if (count > 0) {
                badge.text = count.toString()
                badge.visibility = View.VISIBLE
            } else {
                badge.visibility = View.GONE
            }
        }
    }

    private fun updateStatusText() {
        binding.textScanStatus?.text = if (isAutoScan) {
            if (scannedCount > 0) "Auto-scan ON · $scannedCount scanned" else "Auto-scan ON · Point at barcode"
        } else {
            if (scannedCount > 0) "Auto-scan OFF · $scannedCount scanned" else "Auto-scan OFF · Tap to scan"
        }
    }

    private fun setupControls() {
        // Flash toggle
        binding.btnToogleFlashlight.setOnClickListener {
            isFlashOn = !isFlashOn
            if (isFlashOn) {
                binding.cameraPreview.setTorchOn()
            } else {
                binding.cameraPreview.setTorchOff()
            }
        }

        // Switch camera
        binding.btnSwitchCamera.setOnClickListener {
            Toast.makeText(this, "Camera switch", Toast.LENGTH_SHORT).show()
        }

        // Tap status text to toggle auto-scan
        binding.textScanStatus?.setOnClickListener {
            isAutoScan = !isAutoScan
            prefsManager.scannerAutoScan = isAutoScan
            lastBarcode = null
            updateStatusText()
            Toast.makeText(this, if (isAutoScan) "Auto-scan enabled" else "Auto-scan disabled", Toast.LENGTH_SHORT).show()
            binding.cameraPreview.resume()
        }

        // Scan again (resume after pause in single-scan mode)
        binding.buttonScanAgain?.setOnClickListener {
            lastBarcode = null
            binding.cameraPreview.resume()
            updateStatusText()
        }

        // Scan button — freeze frame and attempt decode, show error if nothing found
        binding.buttonTakePicture?.setOnClickListener {
            binding.cameraPreview.pause()
            binding.textScanStatus?.text = "Scanning..."
            val countBefore = scannedCount

            handler.postDelayed({
                if (scannedCount == countBefore) {
                    // No barcode was decoded during the freeze
                    showProductToast("No barcode found", "Point camera at a barcode and try again")
                }
                binding.cameraPreview.resume()
                updateStatusText()
            }, 1500)
        }

        // My Cart — go back to POS
        binding.buttonMyCart?.setOnClickListener {
            finish()
        }
    }

    private fun startLaserAnimation() {
        binding.viewLaserLine?.let { laser ->
            laser.post {
                val parent = laser.parent as? View ?: return@post
                val maxTravel = (parent.height - laser.height).toFloat()
                laserAnimator = ObjectAnimator.ofFloat(laser, "translationY", -maxTravel / 2, maxTravel / 2).apply {
                    duration = 1500
                    repeatMode = ValueAnimator.REVERSE
                    repeatCount = ValueAnimator.INFINITE
                    start()
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        binding.cameraPreview.resume()
        shoppingCartViewModel.refreshFromCart()
    }

    override fun onPause() {
        super.onPause()
        binding.cameraPreview.pause()
    }

    override fun onDestroy() {
        super.onDestroy()
        laserAnimator?.cancel()
        toastDismissRunnable?.let { handler.removeCallbacks(it) }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        finish()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }
}
