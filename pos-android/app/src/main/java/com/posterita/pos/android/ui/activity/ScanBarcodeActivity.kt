package com.posterita.pos.android.ui.activity

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.journeyapps.barcodescanner.BarcodeCallback
import com.journeyapps.barcodescanner.BarcodeResult
import com.posterita.pos.android.databinding.ActivityScanBarcodeBinding
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class ScanBarcodeActivity : AppCompatActivity() {

    private lateinit var binding: ActivityScanBarcodeBinding

    @Inject
    lateinit var prefsManager: SharedPreferencesManager

    private var isFlashOn = false
    private var isAutoScan = true
    private var scannedCount = 0
    private var lastBarcode: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityScanBarcodeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        isAutoScan = prefsManager.scannerAutoScan

        setupBarcodeScanner()
        setupControls()
        updateStatusText()
    }

    private fun setupBarcodeScanner() {
        binding.cameraPreview.decodeContinuous(object : BarcodeCallback {
            override fun barcodeResult(result: BarcodeResult?) {
                result?.text?.let { barcode ->
                    if (barcode.isNotEmpty() && barcode != lastBarcode) {
                        lastBarcode = barcode
                        scannedCount++
                        showScanResult(barcode)

                        // Return result
                        val resultIntent = Intent()
                        resultIntent.putExtra("BARCODE_RESULT", barcode)
                        setResult(Activity.RESULT_OK, resultIntent)

                        if (!isAutoScan) {
                            // Single scan mode — pause and wait
                            binding.cameraPreview.pause()
                        }
                    }
                }
            }
        })
    }

    private fun showScanResult(barcode: String) {
        binding.layoutScanResult?.visibility = View.VISIBLE
        binding.textScannedBarcode?.text = barcode
        binding.textScannedProduct?.text = "Scanned ($scannedCount)"
        updateStatusText()
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
            lastBarcode = null // Reset so next scan works
            updateStatusText()
            Toast.makeText(this, if (isAutoScan) "Auto-scan enabled" else "Auto-scan disabled", Toast.LENGTH_SHORT).show()
            // Resume if we were paused in single-scan mode
            binding.cameraPreview.resume()
        }

        // Scan again (resume after pause in single-scan mode)
        binding.buttonScanAgain?.setOnClickListener {
            binding.layoutScanResult?.visibility = View.GONE
            lastBarcode = null
            binding.cameraPreview.resume()
            updateStatusText()
        }

        // Cancel
        binding.buttonCancel?.setOnClickListener {
            setResult(Activity.RESULT_CANCELED)
            finish()
        }

        // Take Picture — freeze and attempt decode
        binding.buttonTakePicture?.setOnClickListener {
            binding.cameraPreview.pause()
            binding.textScanStatus?.text = "Processing..."
            // Resume after short pause
            binding.cameraPreview.postDelayed({
                binding.cameraPreview.resume()
                updateStatusText()
            }, 1500)
        }

        // Hidden binding compat
        binding.buttonMyCart?.setOnClickListener { finish() }
    }

    override fun onResume() {
        super.onResume()
        binding.cameraPreview.resume()
    }

    override fun onPause() {
        super.onPause()
        binding.cameraPreview.pause()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        setResult(Activity.RESULT_CANCELED)
        finish()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }
}
