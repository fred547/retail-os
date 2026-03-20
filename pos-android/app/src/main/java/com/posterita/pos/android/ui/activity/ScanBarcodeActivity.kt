package com.posterita.pos.android.ui.activity

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.journeyapps.barcodescanner.BarcodeCallback
import com.journeyapps.barcodescanner.BarcodeResult
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ActivityScanBarcodeBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class ScanBarcodeActivity : AppCompatActivity() {

    private lateinit var binding: ActivityScanBarcodeBinding
    private var isFlashOn = false
    private var isContinuousMode = true
    private var scannedCount = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityScanBarcodeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupBarcodeScanner()
        setupControls()
    }

    private fun setupBarcodeScanner() {
        binding.cameraPreview.decodeContinuous(object : BarcodeCallback {
            override fun barcodeResult(result: BarcodeResult?) {
                result?.text?.let { barcode ->
                    if (barcode.isNotEmpty()) {
                        scannedCount++
                        showScanResult(barcode)

                        if (!isContinuousMode) {
                            binding.cameraPreview.pause()
                        }

                        returnBarcode(barcode)
                    }
                }
            }
        })
    }

    private fun showScanResult(barcode: String) {
        binding.layoutScanResult?.visibility = View.VISIBLE
        binding.textScannedBarcode?.text = barcode
        binding.textScannedProduct?.text = "Scanned ($scannedCount)"
        binding.textScanStatus?.text = if (isContinuousMode) "Auto-scanning · $scannedCount scanned" else "Paused"
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

        // Scan again (resume after pause)
        binding.buttonScanAgain?.setOnClickListener {
            binding.layoutScanResult?.visibility = View.GONE
            binding.textScanStatus?.text = "Auto-scanning · Point at barcode"
            binding.cameraPreview.resume()
        }

        // Cancel
        binding.buttonCancel?.setOnClickListener {
            setResult(Activity.RESULT_CANCELED)
            finish()
        }

        // My Cart
        binding.buttonMyCart.setOnClickListener {
            finish()
        }
    }

    private fun returnBarcode(barcode: String) {
        val resultIntent = Intent()
        resultIntent.putExtra("BARCODE_RESULT", barcode)
        setResult(Activity.RESULT_OK, resultIntent)
        // In continuous mode, don't finish — let user keep scanning
        if (!isContinuousMode) {
            finish()
        }
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
