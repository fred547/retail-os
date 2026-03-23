package com.posterita.pos.android.printing

import com.posterita.pos.android.data.local.dao.PreparationStationDao
import com.posterita.pos.android.data.local.dao.PrinterDao
import com.posterita.pos.android.data.local.entity.Printer
import com.posterita.pos.android.domain.model.ClosedTillDetails
import com.posterita.pos.android.domain.model.OrderDetails
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class PrinterManager @Inject constructor(
    private val printerDao: PrinterDao,
    private val preparationStationDao: PreparationStationDao,
    private val sessionManager: com.posterita.pos.android.util.SessionManager
) {

    interface PrintResultCallback {
        fun onSuccess()
        fun onError(message: String)
    }

    suspend fun printReceipt(orderDetails: OrderDetails, printer: Printer, callback: PrintResultCallback) {
        withContext(Dispatchers.IO) {
            try {
                val whatsappNumber = sessionManager.account?.whatsappNumber
                if (printer.printerType == "Bluetooth") {
                    val btPrinter = BluetoothPrinter()
                    btPrinter.printReceipt(orderDetails, printer.width, printer.deviceName ?: "", whatsappNumber)
                } else {
                    val receiptPrinter = ReceiptPrinter(printer.ip ?: "", printer.width, whatsappNumber)
                    receiptPrinter.printReceipt(orderDetails)
                }
                withContext(Dispatchers.Main) { callback.onSuccess() }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { callback.onError(e.message ?: "Print failed") }
            }
        }
    }

    suspend fun printKitchenReceipt(orderDetails: OrderDetails, printer: Printer, callback: PrintResultCallback) {
        withContext(Dispatchers.IO) {
            try {
                if (printer.printerType == "Bluetooth") {
                    val btPrinter = BluetoothPrinter()
                    btPrinter.printKitchenReceipt(orderDetails, printer.width, printer.deviceName ?: "")
                } else {
                    val receiptPrinter = ReceiptPrinter(printer.ip ?: "", printer.width)
                    receiptPrinter.printKitchenReceipt(orderDetails)
                }
                withContext(Dispatchers.Main) { callback.onSuccess() }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { callback.onError(e.message ?: "Print failed") }
            }
        }
    }

    suspend fun printCloseTillReceipt(details: ClosedTillDetails, printer: Printer, callback: PrintResultCallback) {
        withContext(Dispatchers.IO) {
            try {
                if (printer.printerType == "Bluetooth") {
                    val btPrinter = BluetoothPrinter()
                    btPrinter.printCloseTillReceipt(details, printer.width, printer.deviceName ?: "")
                } else {
                    val receiptPrinter = ReceiptPrinter(printer.ip ?: "", printer.width)
                    receiptPrinter.printCloseTillReceipt(details)
                }
                withContext(Dispatchers.Main) { callback.onSuccess() }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { callback.onError(e.message ?: "Print failed") }
            }
        }
    }

    suspend fun printTestReceipt(printer: Printer, callback: PrintResultCallback) {
        withContext(Dispatchers.IO) {
            try {
                if (printer.printerType == "Bluetooth") {
                    val btPrinter = BluetoothPrinter()
                    btPrinter.printTestReceipt(printer.width, printer.deviceName ?: "")
                } else {
                    val receiptPrinter = ReceiptPrinter(printer.ip ?: "", printer.width)
                    receiptPrinter.printTestReceipt()
                }
                withContext(Dispatchers.Main) { callback.onSuccess() }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { callback.onError(e.message ?: "Print failed") }
            }
        }
    }

    suspend fun openCashDrawer() {
        withContext(Dispatchers.IO) {
            val printers = printerDao.getAllPrinters()
            val drawerPrinter = printers.find { it.cashDrawer == "Yes" }
            if (drawerPrinter != null) {
                val receiptPrinter = ReceiptPrinter(drawerPrinter.ip ?: "", drawerPrinter.width)
                receiptPrinter.openCashDrawer()
            }
        }
    }

    /**
     * Print only to receipt printers (skip kitchen printers).
     * Used when completing a kitchen order that was already printed to kitchen.
     */
    suspend fun printReceiptOnly(orderDetails: OrderDetails) {
        val printers = printerDao.getAllPrinters()
        for (printer in printers) {
            if (printer.printReceipt) {
                printReceipt(orderDetails, printer, object : PrintResultCallback {
                    override fun onSuccess() {}
                    override fun onError(message: String) {}
                })
            }
        }
    }

    /**
     * Print only to kitchen printers (skip receipt printers).
     * Used when sending order to kitchen. Legacy: no station routing.
     */
    suspend fun printKitchenOnly(orderDetails: OrderDetails) {
        val printers = printerDao.getAllPrinters()
        for (printer in printers) {
            if (printer.printKitchen) {
                printKitchenReceipt(orderDetails, printer, object : PrintResultCallback {
                    override fun onSuccess() {}
                    override fun onError(message: String) {}
                })
            }
        }
    }

    /**
     * Station-based kitchen printing. Groups items by station_id,
     * routes each group to the station's linked printer.
     * Falls back to printKitchenOnly if no stations are configured.
     */
    suspend fun printKitchenByStation(orderDetails: OrderDetails) {
        val allPrinters = printerDao.getAllPrinters()
        val printerMap = allPrinters.associateBy { it.printerId }

        // Check if any lines have station routing
        val hasStations = orderDetails.lines.any { it.station_id != null }
        if (!hasStations) {
            // No station routing — fall back to legacy behavior
            printKitchenOnly(orderDetails)
            return
        }

        // Build station → printer lookup from preparation_station.printer_id
        // (a printer can serve many stations; the link is on the station side)
        val stationToPrinter = mutableMapOf<Int, Printer?>()
        val stationIds = orderDetails.lines.mapNotNull { it.station_id }.distinct()
        for (sid in stationIds) {
            val station = preparationStationDao.getStationById(sid)
            stationToPrinter[sid] = station?.printer_id?.let { printerMap[it] }
        }

        // Group kitchen items by station_id (null = unassigned)
        val grouped = orderDetails.lines
            .filter { it.isKitchenItem == "Y" }
            .groupBy { it.station_id }

        for ((stationId, stationLines) in grouped) {
            // Find the printer for this station via station.printer_id
            val printer = if (stationId != null) {
                stationToPrinter[stationId]
                    // Fallback: any kitchen printer
                    ?: allPrinters.find { it.printKitchen }
            } else {
                // Unassigned items → any kitchen printer
                allPrinters.find { it.printKitchen }
            }

            if (printer == null) continue

            // Build a filtered OrderDetails with only this station's items
            val stationName = stationLines.firstOrNull()?.station_name
            val stationOrder = orderDetails.copy(
                lines = stationLines,
                // Put station name in the note for the receipt header
                note = if (stationName != null) {
                    "[$stationName] ${orderDetails.note ?: ""}"
                } else {
                    orderDetails.note
                }
            )

            printKitchenReceipt(stationOrder, printer, object : PrintResultCallback {
                override fun onSuccess() {}
                override fun onError(message: String) {}
            })
        }
    }

    suspend fun printAllReceipts(orderDetails: OrderDetails) {
        val printers = printerDao.getAllPrinters()
        for (printer in printers) {
            if (printer.printKitchen && printer.printReceipt) {
                printKitchenReceipt(orderDetails, printer, object : PrintResultCallback {
                    override fun onSuccess() {}
                    override fun onError(message: String) {}
                })
                printReceipt(orderDetails, printer, object : PrintResultCallback {
                    override fun onSuccess() {}
                    override fun onError(message: String) {}
                })
            } else if (printer.printKitchen) {
                printKitchenReceipt(orderDetails, printer, object : PrintResultCallback {
                    override fun onSuccess() {}
                    override fun onError(message: String) {}
                })
            } else if (printer.printReceipt) {
                printReceipt(orderDetails, printer, object : PrintResultCallback {
                    override fun onSuccess() {}
                    override fun onError(message: String) {}
                })
            }
        }
    }
}
