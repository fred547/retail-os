package com.posterita.pos.android.ui.activity

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.CheckBox
import android.widget.LinearLayout
import android.widget.Toast
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Printer
import com.posterita.pos.android.data.local.entity.PreparationStation
import com.posterita.pos.android.databinding.ActivityCreatePrinterBinding
import com.posterita.pos.android.printing.PrinterManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class CreatePrinterActivity : BaseActivity() {

    companion object {
        const val EXTRA_PRINTER_ROLE = "printer_role"
    }

    private lateinit var binding: ActivityCreatePrinterBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var printerManager: PrinterManager
    @Inject lateinit var prefsManager: SharedPreferencesManager

    private var selectedInterface = ""
    private var selectedBluetoothDevice = ""
    private var selectedWidth = 48
    private var printerRole = Printer.ROLE_RECEIPT

    private val allStations = mutableListOf<PreparationStation>()
    private val selectedStationIds = mutableSetOf<Int>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCreatePrinterBinding.inflate(layoutInflater)
        setContentView(binding.root)

        printerRole = intent.getStringExtra(EXTRA_PRINTER_ROLE) ?: Printer.ROLE_RECEIPT

        setupInterfaceSpinner()
        setupPaperWidthSpinner()
        setupButtons()
        setupKitchenStations()
    }

    private fun setupInterfaceSpinner() {
        val interfaces = arrayOf("Network", "Bluetooth", "USB")
        val adapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, interfaces)
        binding.interfaceSpinner.setAdapter(adapter)

        binding.interfaceSpinner.setOnItemClickListener { _, _, position, _ ->
            selectedInterface = interfaces[position]
            when (selectedInterface) {
                "Network" -> {
                    binding.networkLayout.visibility = View.VISIBLE
                    binding.bluetoothLayout.visibility = View.GONE
                    binding.usbDevicesLayout.visibility = View.GONE
                }
                "Bluetooth" -> {
                    binding.networkLayout.visibility = View.GONE
                    binding.bluetoothLayout.visibility = View.VISIBLE
                    binding.usbDevicesLayout.visibility = View.GONE
                }
                "USB" -> {
                    binding.networkLayout.visibility = View.GONE
                    binding.bluetoothLayout.visibility = View.GONE
                    binding.usbDevicesLayout.visibility = View.VISIBLE
                }
            }
        }
    }

    private fun setupPaperWidthSpinner() {
        val widths = arrayOf("48 (80mm)", "32 (58mm)")
        val adapter = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, widths)
        binding.paperWidth.setAdapter(adapter)

        binding.paperWidth.setOnItemClickListener { _, _, position, _ ->
            selectedWidth = if (position == 0) 48 else 32
        }
    }

    private fun setupButtons() {
        binding.buttonScanBluetooth.setOnClickListener {
            scanBluetoothDevices()
        }

        binding.printTestButton.setOnClickListener {
            testPrint()
        }

        binding.buttonSavePrinter.setOnClickListener {
            savePrinter()
        }
    }

    private fun setupKitchenStations() {
        val stationsContainer = binding.stationsContainer
        val stationsLabel = binding.labelStations

        // Show/hide stations when kitchen toggle changes
        binding.printKitchenReceiptSwitch.setOnCheckedChangeListener { _, isChecked ->
            val vis = if (isChecked) View.VISIBLE else View.GONE
            stationsLabel.visibility = vis
            stationsContainer.visibility = vis
            if (isChecked && allStations.isEmpty()) {
                loadStations()
            }
        }

        // If role is already kitchen/bar, load stations immediately
        if (printerRole == Printer.ROLE_KITCHEN || printerRole == Printer.ROLE_BAR) {
            binding.printKitchenReceiptSwitch.isChecked = true
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
                    val cb = CheckBox(this@CreatePrinterActivity).apply {
                        text = "${station.name} (${station.station_type})"
                        textSize = 14f
                        isChecked = selectedStationIds.contains(station.station_id)
                        setPadding(0, 8, 0, 8)
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

    private fun scanBluetoothDevices() {
        try {
            val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            val bluetoothAdapter = bluetoothManager.adapter

            if (bluetoothAdapter == null) {
                Toast.makeText(this, "Bluetooth not supported", Toast.LENGTH_SHORT).show()
                return
            }

            if (!bluetoothAdapter.isEnabled) {
                Toast.makeText(this, "Please enable Bluetooth", Toast.LENGTH_SHORT).show()
                return
            }

            @Suppress("MissingPermission")
            val pairedDevices = bluetoothAdapter.bondedDevices
            if (pairedDevices.isEmpty()) {
                Toast.makeText(this, "No paired Bluetooth devices found", Toast.LENGTH_SHORT).show()
                return
            }

            val deviceNames = pairedDevices.map { it.name ?: "Unknown" }.toTypedArray()
            val deviceList = pairedDevices.toList()

            android.app.AlertDialog.Builder(this)
                .setTitle("Select Bluetooth Printer")
                .setItems(deviceNames) { _, which ->
                    selectedBluetoothDevice = deviceList[which].name ?: ""
                    binding.printerBluetooth.setText(selectedBluetoothDevice)
                }
                .show()
        } catch (e: SecurityException) {
            Toast.makeText(this, "Bluetooth permission required", Toast.LENGTH_SHORT).show()
        }
    }

    private fun testPrint() {
        val printerName = binding.editTextPrinterName.text.toString().trim()
        if (printerName.isEmpty()) {
            Toast.makeText(this, "Please enter a printer name", Toast.LENGTH_SHORT).show()
            return
        }

        val printer = buildPrinter()

        lifecycleScope.launch(Dispatchers.IO) {
            printerManager.printTestReceipt(printer, object : PrinterManager.PrintResultCallback {
                override fun onSuccess() {
                    runOnUiThread {
                        Toast.makeText(this@CreatePrinterActivity, "Test print successful", Toast.LENGTH_SHORT).show()
                    }
                }
                override fun onError(message: String) {
                    runOnUiThread {
                        Toast.makeText(this@CreatePrinterActivity, "Test print failed: $message", Toast.LENGTH_SHORT).show()
                    }
                }
            })
        }
    }

    private fun savePrinter() {
        val printerName = binding.editTextPrinterName.text.toString().trim()
        if (printerName.isEmpty()) {
            Toast.makeText(this, "Please enter a printer name", Toast.LENGTH_SHORT).show()
            return
        }

        if (selectedInterface.isEmpty()) {
            Toast.makeText(this, "Please select an interface", Toast.LENGTH_SHORT).show()
            return
        }

        if (selectedInterface == "Network") {
            val ip = binding.printerIp.text.toString().trim()
            if (ip.isEmpty()) {
                Toast.makeText(this, "Please enter the printer IP address", Toast.LENGTH_SHORT).show()
                return
            }
        }

        if (selectedInterface == "Bluetooth" && selectedBluetoothDevice.isEmpty()) {
            Toast.makeText(this, "Please select a Bluetooth device", Toast.LENGTH_SHORT).show()
            return
        }

        val printer = buildPrinter()

        lifecycleScope.launch(Dispatchers.IO) {
            val printerId = db.printerDao().insertPrinter(printer).toInt()

            // Assign selected stations to this printer
            if (selectedStationIds.isNotEmpty()) {
                for (stationId in selectedStationIds) {
                    val station = db.preparationStationDao().getStationById(stationId)
                    if (station != null) {
                        db.preparationStationDao().insertAll(listOf(station.copy(printer_id = printerId)))
                    }
                }
                // Clear printer_id from stations that were un-checked
                for (station in allStations) {
                    if (station.printer_id == printerId && !selectedStationIds.contains(station.station_id)) {
                        db.preparationStationDao().insertAll(listOf(station.copy(printer_id = null)))
                    }
                }
            }

            withContext(Dispatchers.Main) {
                Toast.makeText(this@CreatePrinterActivity, "Printer saved successfully", Toast.LENGTH_SHORT).show()
                finish()
            }
        }
    }

    private fun buildPrinter(): Printer {
        val printerName = binding.editTextPrinterName.text.toString().trim()
        val ip = if (selectedInterface == "Network") binding.printerIp.text.toString().trim() else null
        val deviceName = if (selectedInterface == "Bluetooth") selectedBluetoothDevice else null
        val printKitchen = binding.printKitchenReceiptSwitch.isChecked
        val cashDrawer = if (binding.cashDrawerSwitch.isChecked) "Yes" else "No"

        // Role determines behavior — keep booleans in sync for backward compat
        val role = if (printKitchen) Printer.ROLE_KITCHEN else printerRole

        return Printer(
            name = printerName,
            printerType = selectedInterface,
            width = selectedWidth,
            ip = ip,
            deviceName = deviceName,
            printReceipt = !printKitchen, // receipt printers don't print kitchen, and vice versa
            printKitchen = printKitchen,
            cashDrawer = cashDrawer,
            role = role
        )
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        finish()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }
}
