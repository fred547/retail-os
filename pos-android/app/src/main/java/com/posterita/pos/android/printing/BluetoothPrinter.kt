package com.posterita.pos.android.printing

import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothSocket
import android.graphics.Bitmap
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
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

    fun printReceipt(orderDetails: OrderDetails, width: Int, deviceName: String, whatsappNumber: String? = null) {
        connect(deviceName)
        try {
            val out = java.io.ByteArrayOutputStream()
            out.write(ReceiptPrinter.INIT)
            out.write(ReceiptPrinter.CENTER_ALIGN)
            out.write(ReceiptPrinter.FONT_H2)
            out.write("${orderDetails.account?.businessname ?: ""}\n".toByteArray())
            out.write(ReceiptPrinter.FONT_NORMAL)
            // MRA compliance: BRN + TAN
            val brn = orderDetails.account?.brn
            val tan = orderDetails.account?.tan
            if (!brn.isNullOrBlank()) out.write("BRN: $brn\n".toByteArray())
            if (!tan.isNullOrBlank()) out.write("TAN: $tan\n".toByteArray())
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

            // WhatsApp QR code
            if (!whatsappNumber.isNullOrBlank()) {
                try {
                    val url = "https://wa.me/$whatsappNumber?text=RECEIPT%20${orderDetails.documentno}"
                    val qrBitmap = generateQRBitmap(url, 200)
                    if (qrBitmap != null) {
                        out.write(ReceiptPrinter.LINE_FEED)
                        out.write(ReceiptPrinter.CENTER_ALIGN)
                        out.write(bitmapToEscPos(qrBitmap))
                        out.write(ReceiptPrinter.FONT_SMALL)
                        out.write("Scan for digital receipt\n".toByteArray())
                        out.write(ReceiptPrinter.FONT_NORMAL)
                    }
                } catch (_: Exception) { }
            }

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

            // Station header from note "[StationName] ..." format
            val stationHeader = orderDetails.note?.let { Regex("^\\[(.+?)]").find(it)?.groupValues?.get(1) }
            out.write(ReceiptPrinter.FONT_H1)
            out.write("${stationHeader?.uppercase() ?: "KITCHEN COPY"}\n".toByteArray())

            out.write(ReceiptPrinter.FONT_NORMAL)
            out.write(ReceiptPrinter.LEFT_ALIGN)

            val displayNote = orderDetails.note?.replace(Regex("^\\[.+?]\\s*"), "")?.ifBlank { null }
            if (!displayNote.isNullOrBlank()) {
                out.write("$displayNote\n".toByteArray())
            }
            if (orderDetails.documentno != null) {
                out.write("Order: ${orderDetails.documentno}\n".toByteArray())
            }

            for (line in orderDetails.lines) {
                if (line.isKitchenItem == "Y") {
                    out.write(ReceiptPrinter.FONT_BOLD)
                    out.write("${com.posterita.pos.android.util.NumberUtils.formatQuantity(line.qtyentered)} x ${line.name}\n".toByteArray())
                    out.write(ReceiptPrinter.FONT_NORMAL)
                    if (!line.modifiers.isNullOrBlank()) {
                        out.write("  ${line.modifiers}\n".toByteArray())
                    }
                    if (!line.note.isNullOrBlank()) {
                        out.write("  * ${line.note}\n".toByteArray())
                    }
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

    private fun generateQRBitmap(content: String, size: Int): Bitmap? {
        return try {
            val writer = QRCodeWriter()
            val bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, size, size)
            val w = bitMatrix.width
            val h = bitMatrix.height
            val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.RGB_565)
            for (x in 0 until w) {
                for (y in 0 until h) {
                    bmp.setPixel(x, y, if (bitMatrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
                }
            }
            bmp
        } catch (_: Exception) {
            null
        }
    }

    private fun bitmapToEscPos(bitmap: Bitmap): ByteArray {
        val width = bitmap.width
        val height = bitmap.height
        val bytesPerRow = (width + 7) / 8
        val out = java.io.ByteArrayOutputStream()

        // GS v 0 — print raster bit image
        out.write(byteArrayOf(0x1D, 0x76, 0x30, 0x00))
        out.write(byteArrayOf((bytesPerRow and 0xFF).toByte(), ((bytesPerRow shr 8) and 0xFF).toByte()))
        out.write(byteArrayOf((height and 0xFF).toByte(), ((height shr 8) and 0xFF).toByte()))

        for (y in 0 until height) {
            for (byteX in 0 until bytesPerRow) {
                var b = 0
                for (bit in 0 until 8) {
                    val x = byteX * 8 + bit
                    if (x < width) {
                        val pixel = bitmap.getPixel(x, y)
                        val r = (pixel shr 16) and 0xFF
                        val g = (pixel shr 8) and 0xFF
                        val blue = pixel and 0xFF
                        if (r < 128 || g < 128 || blue < 128) {
                            b = b or (0x80 shr bit)
                        }
                    }
                }
                out.write(b)
            }
        }
        return out.toByteArray()
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

    fun printQueueTicket(orderNumber: String, width: Int, deviceName: String) {
        connect(deviceName)
        try {
            val out = java.io.ByteArrayOutputStream()
            out.write(ReceiptPrinter.INIT)
            out.write(ReceiptPrinter.CENTER_ALIGN)
            out.write(ReceiptPrinter.LINE_FEED)
            out.write(ReceiptPrinter.FONT_H1)
            out.write("ORDER\n".toByteArray())
            out.write(byteArrayOf(0x1B, 0x21, 0x38)) // bold + double height + double width
            out.write("$orderNumber\n".toByteArray())
            out.write(ReceiptPrinter.FONT_NORMAL)
            out.write(ReceiptPrinter.LINE_FEED)
            out.write("Thank you!\n".toByteArray())
            out.write(ReceiptPrinter.LINE_FEED)
            out.write(ReceiptPrinter.LINE_FEED)
            out.write(ReceiptPrinter.PAPER_CUT)
            print(out.toByteArray())
        } finally {
            disconnect()
        }
    }
}
