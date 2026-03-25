package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.view.View
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.Toast
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Printer
import com.posterita.pos.android.data.local.entity.PreparationStation
import com.posterita.pos.android.databinding.ActivityPrinterConfigurationBinding
import com.posterita.pos.android.printing.PrinterManager
import com.posterita.pos.android.util.SharedPreferencesManager
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
    @Inject lateinit var prefsManager: SharedPreferencesManager

    private var printer: Printer? = null
    private val allStations = mutableListOf<PreparationStation>()
    private val selectedStationIds = mutableSetOf<Int>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPrinterConfigurationBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val printerId = intent.getIntExtra("printer_id", 0)

        if (printerId > 0) {
            loadPrinter(printerId)
        }

        setupKitchenStations()

        binding.printTestButton.setOnClickListener {
            testPrint()
        }

        binding.buttonSave.setOnClickListener {
            savePrinter()
        }
    }

    private fun setupKitchenStations() {
        binding.printKitchenSwitch.setOnCheckedChangeListener { _, isChecked ->
            val vis = if (isChecked) View.VISIBLE else View.GONE
            binding.labelStations.visibility = vis
            binding.stationsContainer.visibility = vis
            if (isChecked && allStations.isEmpty()) {
                loadStations()
            }
        }
    }

    private fun loadStations() {
        val storeId = prefsManager.storeId
        lifecycleScope.launch(Dispatchers.IO) {
            val stations = db.preparationStationDao().getStationsByStore(storeId)
            allStations.clear()
            allStations.addAll(stations)

            withContext(Dispatchers.Main) {
                val container = binding.stationsContainer
                container.removeAllViews()

                if (stations.isEmpty()) {
                    binding.labelStations.text = "No stations configured — set up stations in the web console"
                    return@withContext
                }

                binding.labelStations.text = "Stations this printer handles:"

                for (station in stations) {
                    val cb = CheckBox(this@PrinterConfigurationActivity).apply {
                        text = "${station.name} (${station.station_type})"
                        textSize = 14f
                        isChecked = selectedStationIds.contains(station.station_id)
                        setOnCheckedChangeListener { _, checked ->
                            if (checked) selectedStationIds.add(station.station_id)
                            else selectedStationIds.remove(station.station_id)
                        }
                    }
                    container.addView(cb)
                }
            }
        }
    }

    private fun loadPrinter(printerId: Int) {
        lifecycleScope.launch(Dispatchers.IO) {
            printer = db.printerDao().getPrinterById(printerId)
            // Pre-load assigned stations
            val assignedStations = db.preparationStationDao().getStationsByPrinter(printerId)
            selectedStationIds.addAll(assignedStations.map { it.station_id })

            withContext(Dispatchers.Main) {
                printer?.let { p ->
                    binding.editTextPrinterName.setText(p.name ?: "")
                    // Set kitchen switch based on role
                    val isKitchen = p.role == Printer.ROLE_KITCHEN || p.role == Printer.ROLE_BAR
                    binding.printKitchenSwitch.isChecked = isKitchen
                    binding.printReceiptsSwitch.isChecked = p.printReceipt
                } ?: run {
                    Toast.makeText(this@PrinterConfigurationActivity, "Printer not found", Toast.LENGTH_SHORT).show()
                    finish()
                }
            }
        }
    }

    private fun savePrinter() {
        val p = printer ?: return
        val newName = binding.editTextPrinterName.text.toString().trim()
        if (newName.isBlank()) {
            Toast.makeText(this, "Enter a printer name", Toast.LENGTH_SHORT).show()
            return
        }

        val isKitchen = binding.printKitchenSwitch.isChecked
        val newRole = if (isKitchen) Printer.ROLE_KITCHEN else Printer.ROLE_RECEIPT

        lifecycleScope.launch(Dispatchers.IO) {
            // Update printer
            val updated = p.copy(
                name = newName,
                role = newRole,
                printReceipt = binding.printReceiptsSwitch.isChecked,
                printKitchen = isKitchen
            )
            db.printerDao().insertPrinter(updated)

            // Update station assignments
            if (isKitchen) {
                for (stationId in selectedStationIds) {
                    val station = db.preparationStationDao().getStationById(stationId)
                    if (station != null) {
                        db.preparationStationDao().insertAll(listOf(station.copy(printer_id = p.printerId)))
                    }
                }
                // Clear unselected stations
                for (station in allStations) {
                    if (station.printer_id == p.printerId && !selectedStationIds.contains(station.station_id)) {
                        db.preparationStationDao().insertAll(listOf(station.copy(printer_id = null)))
                    }
                }
            }

            withContext(Dispatchers.Main) {
                Toast.makeText(this@PrinterConfigurationActivity, "Printer saved", Toast.LENGTH_SHORT).show()
                finish()
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
