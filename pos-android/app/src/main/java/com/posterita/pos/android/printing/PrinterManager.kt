package com.posterita.pos.android.printing

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
    private val printerDao: PrinterDao
) {

    interface PrintResultCallback {
        fun onSuccess()
        fun onError(message: String)
    }

    suspend fun printReceipt(orderDetails: OrderDetails, printer: Printer, callback: PrintResultCallback) {
        withContext(Dispatchers.IO) {
            try {
                if (printer.printerType == "Bluetooth") {
                    val btPrinter = BluetoothPrinter()
                    btPrinter.printReceipt(orderDetails, printer.width, printer.deviceName ?: "")
                } else {
                    val receiptPrinter = ReceiptPrinter(printer.ip ?: "", printer.width)
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
     * Used when sending order to kitchen.
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
