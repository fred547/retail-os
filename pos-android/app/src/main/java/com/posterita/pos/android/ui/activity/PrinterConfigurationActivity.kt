package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.widget.Toast
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Printer
import com.posterita.pos.android.databinding.ActivityPrinterConfigurationBinding
import com.posterita.pos.android.printing.PrinterManager
import dagger.hilt.android.AndroidEntryPoint
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class PrinterConfigurationActivity : BaseActivity() {

    private lateinit var binding: ActivityPrinterConfigurationBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var printerManager: PrinterManager

    private var printer: Printer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPrinterConfigurationBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val printerId = intent.getIntExtra("printer_id", 0)

        if (printerId > 0) {
            loadPrinter(printerId)
        }

        binding.printTestButton.setOnClickListener {
            testPrint()
        }
    }

    private fun loadPrinter(printerId: Int) {
        lifecycleScope.launch(Dispatchers.IO) {
            printer = db.printerDao().getPrinterById(printerId)
            withContext(Dispatchers.Main) {
                printer?.let { p ->
                    binding.editTextPrinterName.setText(p.name ?: "")
                } ?: run {
                    Toast.makeText(this@PrinterConfigurationActivity, "Printer not found", Toast.LENGTH_SHORT).show()
                    finish()
                }
            }
        }
    }

    private fun testPrint() {
        val p = printer
        if (p == null) {
            Toast.makeText(this, "No printer configured", Toast.LENGTH_SHORT).show()
            return
        }

        lifecycleScope.launch(Dispatchers.IO) {
            printerManager.printTestReceipt(p, object : PrinterManager.PrintResultCallback {
                override fun onSuccess() {
                    runOnUiThread {
                        Toast.makeText(this@PrinterConfigurationActivity, "Test print successful", Toast.LENGTH_SHORT).show()
                    }
                }
                override fun onError(message: String) {
                    runOnUiThread {
                        Toast.makeText(this@PrinterConfigurationActivity, "Test print failed: $message", Toast.LENGTH_SHORT).show()
                    }
                }
            })
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        finish()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }
}
