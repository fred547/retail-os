package com.posterita.pos.android.printing

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothSocket
import com.posterita.pos.android.domain.model.ClosedTillDetails
import com.posterita.pos.android.domain.model.OrderDetails
import java.io.OutputStream
import java.util.UUID

class BluetoothPrinter {
    companion object {
        val PRINTER_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    }

    private var socket: BluetoothSocket? = null
    private var outputStream: OutputStream? = null

    @Suppress("MissingPermission")
    private fun connect(deviceName: String) {
        val adapter = BluetoothAdapter.getDefaultAdapter()
            ?: throw IllegalStateException("Bluetooth not available")
        val device = adapter.bondedDevices?.find { it.name == deviceName }
            ?: throw IllegalStateException("Device '$deviceName' not found")

        socket = device.createRfcommSocketToServiceRecord(PRINTER_UUID)
        socket?.connect()
        outputStream = socket?.outputStream
    }

    private fun print(data: ByteArray) {
        outputStream?.write(data)
        outputStream?.flush()
    }

    private fun disconnect() {
        try { outputStream?.close() } catch (_: Exception) {}
        try { socket?.close() } catch (_: Exception) {}
        outputStream = null
        socket = null
    }

    fun printReceipt(orderDetails: OrderDetails, width: Int, deviceName: String) {
        connect(deviceName)
        try {
            val out = java.io.ByteArrayOutputStream()
            out.write(ReceiptPrinter.INIT)
            out.write(ReceiptPrinter.CENTER_ALIGN)
            out.write(ReceiptPrinter.FONT_H2)
            out.write("${orderDetails.account?.businessname ?: ""}\n".toByteArray())
            out.write(ReceiptPrinter.FONT_NORMAL)
            out.write(ReceiptPrinter.LEFT_ALIGN)
            out.write("Receipt: ${orderDetails.documentno}\n".toByteArray())
            out.write("Date: ${orderDetails.dateorderedtext ?: ""}\n".toByteArray())
            out.write(("-".repeat(width) + "\n").toByteArray())
            for (line in orderDetails.lines) {
                out.write("${com.posterita.pos.android.util.NumberUtils.formatQuantity(line.qtyentered)} x ${line.name}\n".toByteArray())
                out.write("  ${com.posterita.pos.android.util.NumberUtils.formatPrice(line.linenetamt)}\n".toByteArray())
            }
            out.write(("-".repeat(width) + "\n").toByteArray())
            out.write("TOTAL: ${com.posterita.pos.android.util.NumberUtils.formatPrice(orderDetails.grandtotal)}\n".toByteArray())
            out.write(ReceiptPrinter.LINE_FEED)
            out.write(ReceiptPrinter.LINE_FEED)
            out.write(ReceiptPrinter.PAPER_CUT)
            print(out.toByteArray())
        } finally {
            disconnect()
        }
    }

    fun printKitchenReceipt(orderDetails: OrderDetails, width: Int, deviceName: String) {
        connect(deviceName)
        try {
            val out = java.io.ByteArrayOutputStream()
            out.write(ReceiptPrinter.INIT)
            out.write(ReceiptPrinter.CENTER_ALIGN)
            out.write(ReceiptPrinter.FONT_H1)
            out.write("KITCHEN COPY\n".toByteArray())
            out.write(ReceiptPrinter.FONT_NORMAL)
            out.write(ReceiptPrinter.LEFT_ALIGN)
            out.write("Order: ${orderDetails.documentno}\n".toByteArray())
            for (line in orderDetails.lines) {
                if (line.isKitchenItem == "Y") {
                    out.write("${com.posterita.pos.android.util.NumberUtils.formatQuantity(line.qtyentered)} x ${line.name}\n".toByteArray())
                }
            }
            out.write(ReceiptPrinter.LINE_FEED)
            out.write(ReceiptPrinter.LINE_FEED)
            out.write(ReceiptPrinter.PAPER_CUT)
            print(out.toByteArray())
        } finally {
            disconnect()
        }
    }

    fun printCloseTillReceipt(details: ClosedTillDetails, width: Int, deviceName: String) {
        connect(deviceName)
        try {
            val out = java.io.ByteArrayOutputStream()
            out.write(ReceiptPrinter.INIT)
            out.write(ReceiptPrinter.CENTER_ALIGN)
            out.write("CLOSE TILL\n".toByteArray())
            out.write(ReceiptPrinter.FONT_NORMAL)
            out.write(ReceiptPrinter.LEFT_ALIGN)
            out.write("Document: ${details.documentNo}\n".toByteArray())
            out.write("Total: ${com.posterita.pos.android.util.NumberUtils.formatPrice(details.salesTotal)}\n".toByteArray())
            out.write(ReceiptPrinter.LINE_FEED)
            out.write(ReceiptPrinter.LINE_FEED)
            out.write(ReceiptPrinter.PAPER_CUT)
            print(out.toByteArray())
        } finally {
            disconnect()
        }
    }

    fun printRawText(text: String, width: Int, deviceName: String) {
        connect(deviceName)
        try {
            val out = java.io.ByteArrayOutputStream()
            out.write(ReceiptPrinter.INIT)
            out.write(ReceiptPrinter.LEFT_ALIGN)
            out.write(ReceiptPrinter.FONT_NORMAL)
            out.write(text.toByteArray())
            out.write(ReceiptPrinter.LINE_FEED)
            out.write(ReceiptPrinter.LINE_FEED)
            out.write(ReceiptPrinter.PAPER_CUT)
            print(out.toByteArray())
        } finally {
            disconnect()
        }
    }

    fun printTestReceipt(width: Int, deviceName: String) {
        connect(deviceName)
        try {
            val out = java.io.ByteArrayOutputStream()
            out.write(ReceiptPrinter.INIT)
            out.write("TEST PRINT\n".toByteArray())
            out.write("Bluetooth OK\n".toByteArray())
            out.write(ReceiptPrinter.LINE_FEED)
            out.write(ReceiptPrinter.LINE_FEED)
            out.write(ReceiptPrinter.PAPER_CUT)
            print(out.toByteArray())
        } finally {
            disconnect()
        }
    }
}
