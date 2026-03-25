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

    // ── Low-level print dispatch (hardware-agnostic) ──

    private fun sendReceipt(orderDetails: OrderDetails, printer: Printer, whatsappNumber: String?) {
        if (printer.printerType == "Bluetooth") {
            BluetoothPrinter().printReceipt(orderDetails, printer.width, printer.deviceName ?: "", whatsappNumber)
        } else {
            ReceiptPrinter(printer.ip ?: "", printer.width, whatsappNumber).printReceipt(orderDetails)
        }
    }

    private fun sendKitchenTicket(orderDetails: OrderDetails, printer: Printer) {
        if (printer.printerType == "Bluetooth") {
            BluetoothPrinter().printKitchenReceipt(orderDetails, printer.width, printer.deviceName ?: "")
        } else {
            ReceiptPrinter(printer.ip ?: "", printer.width).printKitchenReceipt(orderDetails)
        }
    }

    private fun sendQueueTicket(orderNumber: String, printer: Printer) {
        if (printer.printerType == "Bluetooth") {
            BluetoothPrinter().printQueueTicket(orderNumber, printer.width, printer.deviceName ?: "")
        } else {
            ReceiptPrinter(printer.ip ?: "", printer.width).printQueueTicket(orderNumber)
        }
    }

    private fun sendTillReceipt(details: ClosedTillDetails, printer: Printer) {
        if (printer.printerType == "Bluetooth") {
            BluetoothPrinter().printCloseTillReceipt(details, printer.width, printer.deviceName ?: "")
        } else {
            ReceiptPrinter(printer.ip ?: "", printer.width).printCloseTillReceipt(details)
        }
    }

    // ── Public API: role-based routing ──

    /**
     * Print customer receipt to a specific printer.
     */
    suspend fun printReceipt(orderDetails: OrderDetails, printer: Printer, callback: PrintResultCallback) {
        withContext(Dispatchers.IO) {
            try {
                val whatsappNumber = sessionManager.account?.whatsappNumber
                sendReceipt(orderDetails, printer, whatsappNumber)
                withContext(Dispatchers.Main) { callback.onSuccess() }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { callback.onError(e.message ?: "Print failed") }
            }
        }
    }

    /**
     * Print kitchen ticket to a specific printer.
     */
    suspend fun printKitchenReceipt(orderDetails: OrderDetails, printer: Printer, callback: PrintResultCallback) {
        withContext(Dispatchers.IO) {
            try {
                sendKitchenTicket(orderDetails, printer)
                withContext(Dispatchers.Main) { callback.onSuccess() }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { callback.onError(e.message ?: "Print failed") }
            }
        }
    }

    /**
     * Print close-till receipt to a specific printer.
     */
    suspend fun printCloseTillReceipt(details: ClosedTillDetails, printer: Printer, callback: PrintResultCallback) {
        withContext(Dispatchers.IO) {
            try {
                sendTillReceipt(details, printer)
                withContext(Dispatchers.Main) { callback.onSuccess() }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { callback.onError(e.message ?: "Print failed") }
            }
        }
    }

    /**
     * Print test receipt on a specific printer.
     */
    suspend fun printTestReceipt(printer: Printer, callback: PrintResultCallback) {
        withContext(Dispatchers.IO) {
            try {
                if (printer.printerType == "Bluetooth") {
                    BluetoothPrinter().printTestReceipt(printer.width, printer.deviceName ?: "")
                } else {
                    ReceiptPrinter(printer.ip ?: "", printer.width).printTestReceipt()
                }
                withContext(Dispatchers.Main) { callback.onSuccess() }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { callback.onError(e.message ?: "Print failed") }
            }
        }
    }

    /**
     * Open the cash drawer on any printer that supports it.
     */
    suspend fun openCashDrawer() {
        withContext(Dispatchers.IO) {
            val printers = printerDao.getAllPrinters()
            val drawerPrinter = printers.find { it.cashDrawer == "Yes" }
            if (drawerPrinter != null) {
                ReceiptPrinter(drawerPrinter.ip ?: "", drawerPrinter.width).openCashDrawer()
            }
        }
    }

    // ── Role-based batch printing ──

    /**
     * Print to all receipt-role printers only (skip kitchen/queue/label).
     * Used when completing a kitchen order that was already printed to kitchen.
     */
    suspend fun printReceiptOnly(orderDetails: OrderDetails) {
        val whatsappNumber = sessionManager.account?.whatsappNumber
        val printers = printerDao.getAllPrinters()
        for (printer in printers) {
            if (printer.printsReceipts) {
                try { sendReceipt(orderDetails, printer, whatsappNumber) } catch (_: Exception) {}
            }
        }
    }

    /**
     * Print to all kitchen/bar-role printers (skip receipt/queue/label).
     * Legacy: no station routing. Used when no stations are configured.
     */
    suspend fun printKitchenOnly(orderDetails: OrderDetails) {
        val printers = printerDao.getAllPrinters()
        for (printer in printers) {
            if (printer.printsKitchen) {
                try { sendKitchenTicket(orderDetails, printer) } catch (_: Exception) {}
            }
        }
    }

    /**
     * Print queue ticket to all queue-role printers.
     * Called after order creation with the order/document number.
     */
    suspend fun printQueueTicket(orderNumber: String) {
        val printers = printerDao.getPrintersByRole(Printer.ROLE_QUEUE)
        for (printer in printers) {
            try { sendQueueTicket(orderNumber, printer) } catch (_: Exception) {}
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
            printKitchenOnly(orderDetails)
            return
        }

        // Build station → printer lookup
        val stationToPrinter = mutableMapOf<Int, Printer?>()
        val stationIds = orderDetails.lines.mapNotNull { it.station_id }.distinct()
        for (sid in stationIds) {
            val station = preparationStationDao.getStationById(sid)
            stationToPrinter[sid] = station?.printer_id?.let { printerMap[it] }
        }

        // Group kitchen items by station_id
        val grouped = orderDetails.lines
            .filter { it.isKitchenItem == "Y" }
            .groupBy { it.station_id }

        for ((stationId, stationLines) in grouped) {
            val printer = if (stationId != null) {
                stationToPrinter[stationId]
                    ?: allPrinters.find { it.printsKitchen } // fallback
            } else {
                allPrinters.find { it.printsKitchen } // unassigned → any kitchen printer
            }

            if (printer == null) continue

            val stationName = stationLines.firstOrNull()?.station_name
            val stationOrder = orderDetails.copy(
                lines = stationLines,
                note = if (stationName != null) {
                    "[$stationName] ${orderDetails.note ?: ""}"
                } else {
                    orderDetails.note
                }
            )

            try { sendKitchenTicket(stationOrder, printer) } catch (_: Exception) {}
        }
    }

    /**
     * Print to all printers based on their role.
     * Receipt printers get customer receipt, kitchen printers get kitchen ticket.
     * Queue printers get queue ticket (if order number available).
     */
    suspend fun printAllReceipts(orderDetails: OrderDetails) {
        val whatsappNumber = sessionManager.account?.whatsappNumber
        val printers = printerDao.getAllPrinters()
        for (printer in printers) {
            try {
                if (printer.printsKitchen) {
                    sendKitchenTicket(orderDetails, printer)
                }
                if (printer.printsReceipts) {
                    sendReceipt(orderDetails, printer, whatsappNumber)
                }
                if (printer.printsQueue && orderDetails.documentno != null) {
                    sendQueueTicket(orderDetails.documentno!!, printer)
                }
            } catch (_: Exception) {}
        }
    }
}
