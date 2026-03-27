package com.posterita.pos.android.ui.activity

import android.app.Activity
import android.content.Intent
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.databinding.ActivityPutAwayBinding
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Put-away workflow:
 * 1. Scan product barcode → shows product info
 * 2. Scan shelf/location barcode OR type location manually
 * 3. Save shelf_location to product
 * 4. Repeat for next item
 */
@AndroidEntryPoint
class PutAwayActivity : BaseActivity() {

    private lateinit var binding: ActivityPutAwayBinding

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    private var currentProduct: Product? = null
    private var itemsProcessed = 0

    private val barcodeLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val barcode = result.data?.getStringExtra("BARCODE_RESULT") ?: return@registerForActivityResult
            handleScan(barcode)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPutAwayBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupHelpButton("put_away")
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)

        binding.buttonBack.setOnClickListener { finish() }
        binding.buttonScan.setOnClickListener {
            barcodeLauncher.launch(Intent(this, ScanBarcodeActivity::class.java))
        }
        binding.buttonAssign.setOnClickListener { assignLocation() }
        binding.buttonAssign.isEnabled = false

        updateStatus()
    }

    private fun handleScan(barcode: String) {
        if (currentProduct == null) {
            // First scan: product barcode
            lookupProduct(barcode)
        } else {
            // Second scan: shelf/location barcode
            binding.editLocation.setText(barcode)
            playScanFeedback()
        }
    }

    private fun lookupProduct(barcode: String) {
        lifecycleScope.launch {
            val product = withContext(Dispatchers.IO) {
                db.productDao().getProductByUpc(barcode)
            }
            if (product == null) {
                playErrorFeedback()
                Toast.makeText(this@PutAwayActivity, "Product not found: $barcode", Toast.LENGTH_SHORT).show()
                return@launch
            }
            currentProduct = product
            playScanFeedback()
            binding.textProductName.text = product.name ?: "Product #${product.product_id}"
            binding.textProductUpc.text = product.upc ?: ""
            binding.textCurrentLocation.text = "Current: ${product.shelf_location ?: "Not assigned"}"
            binding.textProductStock.text = "Stock: ${product.quantity_on_hand.toInt()}"
            binding.buttonAssign.isEnabled = true
            binding.editLocation.requestFocus()

            Toast.makeText(this@PutAwayActivity, "Now scan shelf barcode or type location", Toast.LENGTH_SHORT).show()
        }
    }

    private fun assignLocation() {
        val product = currentProduct ?: return
        val location = binding.editLocation.text.toString().trim()
        if (location.isBlank()) {
            Toast.makeText(this, "Enter or scan a shelf location", Toast.LENGTH_SHORT).show()
            return
        }

        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                // Update product shelf_location locally
                val updated = product.copy(shelf_location = location)
                db.productDao().updateProduct(updated)
            }
            itemsProcessed++
            playScanFeedback()
            Toast.makeText(this@PutAwayActivity, "${product.name} → $location ✓", Toast.LENGTH_SHORT).show()

            // Reset for next item
            currentProduct = null
            binding.textProductName.text = "Scan a product barcode"
            binding.textProductUpc.text = ""
            binding.textCurrentLocation.text = ""
            binding.textProductStock.text = ""
            binding.editLocation.setText("")
            binding.buttonAssign.isEnabled = false
            updateStatus()
        }
    }

    private fun updateStatus() {
        binding.textItemsProcessed.text = "$itemsProcessed items assigned"
    }

    private fun playScanFeedback() {
        try {
            ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80).startTone(ToneGenerator.TONE_PROP_ACK, 100)
            (getSystemService(VIBRATOR_SERVICE) as? Vibrator)?.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE))
        } catch (_: Exception) {}
    }

    private fun playErrorFeedback() {
        try {
            ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80).startTone(ToneGenerator.TONE_PROP_NACK, 200)
            (getSystemService(VIBRATOR_SERVICE) as? Vibrator)?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 100, 50, 100), -1))
        } catch (_: Exception) {}
    }
}
