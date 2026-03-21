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
import androidx.appcompat.app.AppCompatActivity
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
class ScanBarcodeActivity : AppCompatActivity() {

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

                        // Check for terminal enrollment QR
                        if (barcode.startsWith("TERMINAL:")) {
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

    private fun handleTerminalEnrollment(qrContent: String) {
        // Format: TERMINAL:{terminalId}:{accountId}
        val parts = qrContent.split(":")
        if (parts.size != 3) {
            showProductToast("Invalid QR", "Not a valid terminal enrollment code")
            return
        }
        val terminalId = parts[1].toIntOrNull()
        val accountId = parts[2]
        if (terminalId == null || accountId.isBlank()) {
            showProductToast("Invalid QR", "Could not read terminal data")
            return
        }

        // Pause scanning while dialog is shown
        binding.cameraPreview.pause()

        lifecycleScope.launch {
            val terminal = withContext(Dispatchers.IO) {
                db.terminalDao().getTerminalById(terminalId)
            }
            val terminalName = terminal?.name ?: "Terminal $terminalId"
            val storeName = withContext(Dispatchers.IO) {
                terminal?.let { db.storeDao().getStoreById(it.store_id)?.name }
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
                            if (terminal != null) {
                                db.terminalDao().updateTerminal(terminal.copy(isselected = "Y"))
                                sessionManager.terminal = terminal
                            }
                            // Update prefs
                            prefsManager.setTerminalIdSync(terminalId)
                            prefsManager.setTerminalNameSync(terminalName)
                            if (terminal != null) {
                                prefsManager.setStoreIdSync(terminal.store_id)
                                prefsManager.setStoreNameSync(storeName)
                                val store = db.storeDao().getStoreById(terminal.store_id)
                                if (store != null) sessionManager.store = store
                            }
                        }
                        Toast.makeText(this@ScanBarcodeActivity,
                            "Device enrolled to $terminalName", Toast.LENGTH_LONG).show()
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
