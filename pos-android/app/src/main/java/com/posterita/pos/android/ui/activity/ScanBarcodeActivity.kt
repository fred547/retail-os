package com.posterita.pos.android.ui.activity

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.journeyapps.barcodescanner.BarcodeCallback
import com.journeyapps.barcodescanner.BarcodeResult
import com.posterita.pos.android.databinding.ActivityScanBarcodeBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class ScanBarcodeActivity : AppCompatActivity() {

    private lateinit var binding: ActivityScanBarcodeBinding
    private var isFlashOn = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityScanBarcodeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupBarcodeScanner()
        setupFlashToggle()
        setupMyCartButton()
    }

    private fun setupBarcodeScanner() {
        binding.cameraPreview.decodeContinuous(object : BarcodeCallback {
            override fun barcodeResult(result: BarcodeResult?) {
                result?.text?.let { barcode ->
                    if (barcode.isNotEmpty()) {
                        binding.cameraPreview.pause()
                        returnBarcode(barcode)
                    }
                }
            }
        })
    }

    private fun setupFlashToggle() {
        binding.btnToogleFlashlight.setOnClickListener {
            isFlashOn = !isFlashOn
            if (isFlashOn) {
                binding.cameraPreview.setTorchOn()
            } else {
                binding.cameraPreview.setTorchOff()
            }
        }

        binding.btnSwitchCamera.setOnClickListener {
            // Camera switch functionality
            Toast.makeText(this, "Camera switch", Toast.LENGTH_SHORT).show()
        }
    }

    private fun setupMyCartButton() {
        binding.buttonMyCart.setOnClickListener {
            finish()
        }
    }

    private fun returnBarcode(barcode: String) {
        val resultIntent = Intent()
        resultIntent.putExtra("BARCODE_RESULT", barcode)
        setResult(Activity.RESULT_OK, resultIntent)
        finish()
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
