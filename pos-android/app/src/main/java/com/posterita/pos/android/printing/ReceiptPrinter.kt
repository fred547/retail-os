package com.posterita.pos.android.printing

import android.graphics.Bitmap
import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import com.posterita.pos.android.domain.model.ClosedTillDetails
import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.util.DateUtils
import com.posterita.pos.android.util.NumberUtils
import java.io.ByteArrayOutputStream
import java.net.Socket

class ReceiptPrinter(
    private val printerIp: String,
    private val lineWidth: Int,
    private val whatsappNumber: String? = null
) {
    companion object {
        private const val PORT = 9100
        private const val TIMEOUT = 1500

        // ESC/POS Commands
        val INIT = byteArrayOf(0x1B, 0x40)
        val LINE_FEED = byteArrayOf(0x0A)
        val PAPER_CUT = byteArrayOf(0x1D, 0x56, 0x42, 0x00)
        val FONT_NORMAL = byteArrayOf(0x1B, 0x21, 0x00)
        val FONT_BOLD = byteArrayOf(0x1B, 0x21, 0x08)
        val FONT_H1 = byteArrayOf(0x1B, 0x21, 0x30)
        val FONT_H2 = byteArrayOf(0x1B, 0x21, 0x20)
        val FONT_SMALL = byteArrayOf(0x1B, 0x21, 0x01)
        val LEFT_ALIGN = byteArrayOf(0x1B, 0x61, 0x00)
        val CENTER_ALIGN = byteArrayOf(0x1B, 0x61, 0x01)
        val RIGHT_ALIGN = byteArrayOf(0x1B, 0x61, 0x02)
        val OPEN_DRAWER = byteArrayOf(0x1B, 0x70, 0x00, 0x19, 0x78.toByte())
    }

    fun printReceipt(orderDetails: OrderDetails) {
        val data = formatReceipt(orderDetails)
        sendToPrinter(data)
    }

    fun printKitchenReceipt(orderDetails: OrderDetails) {
        val data = formatKitchenReceipt(orderDetails)
        sendToPrinter(data)
    }

    fun printCloseTillReceipt(details: ClosedTillDetails) {
        val data = formatCloseTillReceipt(details)
        sendToPrinter(data)
    }

    fun printTestReceipt() {
        val out = ByteArrayOutputStream()
        out.write(INIT)
        out.write(CENTER_ALIGN)
        out.write(FONT_H1)
        out.write("TEST RECEIPT\n".toByteArray())
        out.write(FONT_NORMAL)
        out.write("Printer is working correctly\n".toByteArray())
        out.write(LINE_FEED)
        out.write(LINE_FEED)
        out.write(PAPER_CUT)
        sendToPrinter(out.toByteArray())
    }

    fun printQueueTicket(orderNumber: String) {
        val out = ByteArrayOutputStream()
        out.write(INIT)
        out.write(CENTER_ALIGN)
        out.write(LINE_FEED)
        out.write(FONT_H1)
        out.write("ORDER\n".toByteArray())
        // Double-height + double-width for the number
        out.write(byteArrayOf(0x1B, 0x21, 0x38)) // bold + double height + double width
        out.write("$orderNumber\n".toByteArray())
        out.write(FONT_NORMAL)
        out.write(LINE_FEED)
        out.write("Thank you!\n".toByteArray())
        out.write(LINE_FEED)
        out.write(LINE_FEED)
        out.write(PAPER_CUT)
        sendToPrinter(out.toByteArray())
    }

    fun openCashDrawer() {
        val out = ByteArrayOutputStream()
        out.write(OPEN_DRAWER)
        sendToPrinter(out.toByteArray())
    }

    fun printRawText(text: String) {
        val out = ByteArrayOutputStream()
        out.write(INIT)
        out.write(LEFT_ALIGN)
        out.write(FONT_NORMAL)
        out.write(text.toByteArray())
        out.write(LINE_FEED)
        out.write(LINE_FEED)
        out.write(PAPER_CUT)
        sendToPrinter(out.toByteArray())
    }

    private fun formatReceipt(order: OrderDetails): ByteArray {
        val out = ByteArrayOutputStream()
        out.write(INIT)

        // Header
        out.write(CENTER_ALIGN)
        out.write(FONT_H2)
        out.write("${order.account?.businessname ?: ""}\n".toByteArray())
        out.write(FONT_NORMAL)
        order.store?.address?.let { out.write("$it\n".toByteArray()) }
        order.store?.city?.let { out.write("$it\n".toByteArray()) }
        order.account?.phone1?.let { out.write("Tel: $it\n".toByteArray()) }
        // MRA compliance: BRN + TAN on every receipt
        val brn = order.account?.brn
        val tan = order.account?.tan
        if (!brn.isNullOrBlank() || !tan.isNullOrBlank()) {
            out.write(FONT_SMALL)
            if (!brn.isNullOrBlank()) out.write("BRN: $brn\n".toByteArray())
            if (!tan.isNullOrBlank()) out.write("TAN: $tan\n".toByteArray())
            out.write(FONT_NORMAL)
        }

        out.write(LINE_FEED)
        out.write(LEFT_ALIGN)
        out.write(FONT_BOLD)
        out.write("Receipt: ${order.documentno}\n".toByteArray())
        out.write(FONT_NORMAL)
        out.write("Date: ${order.dateorderedtext ?: DateUtils.formatDateTime(order.dateordered)}\n".toByteArray())
        out.write("Customer: ${order.customer_name ?: "Walk-In"}\n".toByteArray())
        out.write("Terminal: ${order.terminal_name ?: ""}\n".toByteArray())
        out.write("Sales Rep: ${order.user_name ?: ""}\n".toByteArray())

        // Separator
        out.write((padLine("-", lineWidth) + "\n").toByteArray())

        // Lines
        for (line in order.lines) {
            val name = line.name ?: ""
            val qty = NumberUtils.formatQuantity(line.qtyentered)
            val price = NumberUtils.formatPrice(line.linenetamt)
            out.write("$qty x $name\n".toByteArray())
            out.write(RIGHT_ALIGN)
            out.write("$price\n".toByteArray())
            out.write(LEFT_ALIGN)
            if ((line.discountamt) > 0) {
                out.write("  Discount: -${NumberUtils.formatPrice(line.discountamt)}\n".toByteArray())
            }
            line.note?.let {
                if (it.isNotBlank()) {
                    out.write("  Note: $it\n".toByteArray())
                }
            }
        }

        out.write((padLine("-", lineWidth) + "\n").toByteArray())

        // Totals
        out.write(formatLine("Subtotal:", NumberUtils.formatPrice(order.subtotal), lineWidth))
        out.write(formatLine("Tax:", NumberUtils.formatPrice(order.taxtotal), lineWidth))
        if (order.promotion_name != null && order.promotion_discount > 0) {
            out.write(formatLine("Promo (${order.promotion_name}):", "-${NumberUtils.formatPrice(order.promotion_discount)}", lineWidth))
        }
        if (order.tipsamt > 0) {
            out.write(formatLine("Tips:", NumberUtils.formatPrice(order.tipsamt), lineWidth))
        }
        out.write(FONT_BOLD)
        out.write(formatLine("TOTAL:", "${order.currency ?: ""} ${NumberUtils.formatPrice(order.grandtotal)}", lineWidth))
        out.write(FONT_NORMAL)
        out.write(formatLine("Items:", NumberUtils.formatQuantity(order.qtytotal), lineWidth))

        // Note
        order.note?.let {
            if (it.isNotEmpty()) {
                out.write(LINE_FEED)
                out.write("Note: $it\n".toByteArray())
            }
        }

        // Payment info
        out.write(LINE_FEED)
        for (payment in order.payments) {
            out.write(formatLine("${payment.paymenttype}:", NumberUtils.formatPrice(payment.amount), lineWidth))
            if (payment.change > 0) {
                out.write(formatLine("Change:", NumberUtils.formatPrice(payment.change), lineWidth))
            }
        }

        // MRA fiscal reference (shown on reprint when available)
        val fiscalId = order.mra_fiscal_id
        val invoiceCounter = order.mra_invoice_counter
        if (!fiscalId.isNullOrBlank() || invoiceCounter != null) {
            out.write(LINE_FEED)
            out.write((padLine("-", lineWidth) + "\n").toByteArray())
            out.write(FONT_SMALL)
            if (invoiceCounter != null) {
                out.write("MRA Invoice #: $invoiceCounter\n".toByteArray())
            }
            if (!fiscalId.isNullOrBlank()) {
                out.write("Fiscal ID: $fiscalId\n".toByteArray())
            }
            out.write(FONT_NORMAL)
        }

        // Receipt message
        order.account?.receiptmessage?.let {
            if (it.isNotEmpty()) {
                out.write(LINE_FEED)
                out.write(CENTER_ALIGN)
                out.write("$it\n".toByteArray())
            }
        }

        // WhatsApp QR code
        if (!whatsappNumber.isNullOrBlank()) {
            try {
                val url = "https://wa.me/$whatsappNumber?text=RECEIPT%20${order.documentno}"
                val qrBitmap = generateQRBitmap(url, 200) // ~25mm at 203 DPI
                if (qrBitmap != null) {
                    out.write(LINE_FEED)
                    out.write(CENTER_ALIGN)
                    out.write(bitmapToEscPos(qrBitmap))
                    out.write(FONT_SMALL)
                    out.write("Scan for digital receipt\n".toByteArray())
                    out.write(FONT_NORMAL)
                }
            } catch (_: Exception) {
                // QR generation failed — not critical, skip
            }
        }

        out.write(LINE_FEED)
        out.write(LINE_FEED)
        out.write(PAPER_CUT)
        return out.toByteArray()
    }

    private fun formatKitchenReceipt(order: OrderDetails): ByteArray {
        val out = ByteArrayOutputStream()
        out.write(INIT)
        out.write(CENTER_ALIGN)

        // Station header — if note starts with [StationName], show it prominently
        val stationHeader = order.note?.let { Regex("^\\[(.+?)]").find(it)?.groupValues?.get(1) }
        if (stationHeader != null) {
            out.write(FONT_H1)
            out.write("${stationHeader.uppercase()}\n".toByteArray())
        } else {
            out.write(FONT_H1)
            out.write("KITCHEN COPY\n".toByteArray())
        }

        out.write(FONT_NORMAL)
        out.write(LEFT_ALIGN)

        // Display note without station prefix
        val displayNote = order.note?.replace(Regex("^\\[.+?]\\s*"), "")?.ifBlank { null }
        if (!displayNote.isNullOrBlank()) {
            out.write("$displayNote\n".toByteArray())
        }
        if (order.documentno != null) {
            out.write("Order: ${order.documentno}\n".toByteArray())
        }
        if (order.customer_name != null) {
            out.write("Customer: ${order.customer_name}\n".toByteArray())
        }
        out.write((padLine("-", lineWidth) + "\n").toByteArray())

        var itemCount = 0
        for (line in order.lines) {
            if (line.isKitchenItem == "Y") {
                out.write(FONT_BOLD)
                out.write("${NumberUtils.formatQuantity(line.qtyentered)} x ${line.name}\n".toByteArray())
                out.write(FONT_NORMAL)
                if (!line.modifiers.isNullOrBlank()) {
                    out.write("  ${line.modifiers}\n".toByteArray())
                }
                if (!line.note.isNullOrBlank()) {
                    out.write("  * ${line.note}\n".toByteArray())
                }
                itemCount++
            }
        }

        out.write((padLine("-", lineWidth) + "\n").toByteArray())
        out.write("Items: $itemCount\n".toByteArray())
        out.write(LINE_FEED)
        out.write(LINE_FEED)
        out.write(PAPER_CUT)
        return out.toByteArray()
    }

    private fun formatCloseTillReceipt(details: ClosedTillDetails): ByteArray {
        val out = ByteArrayOutputStream()
        out.write(INIT)
        out.write(CENTER_ALIGN)
        out.write(FONT_H2)
        out.write("CLOSE TILL RECEIPT\n".toByteArray())
        out.write(FONT_NORMAL)
        out.write(LEFT_ALIGN)

        out.write("Store: ${details.storeName ?: ""}\n".toByteArray())
        out.write("Terminal: ${details.terminalName ?: ""}\n".toByteArray())
        out.write("Document No: ${details.documentNo ?: ""}\n".toByteArray())
        out.write("Opened by: ${details.openedBy ?: ""}\n".toByteArray())
        out.write("Closed by: ${details.closedBy ?: ""}\n".toByteArray())

        out.write((padLine("-", lineWidth) + "\n").toByteArray())
        out.write(formatLine("Opening Amount:", NumberUtils.formatPrice(details.openingAmt), lineWidth))
        out.write(formatLine("Cash Sales:", NumberUtils.formatPrice(details.cashAmt), lineWidth))
        out.write(formatLine("Expected Cash:", NumberUtils.formatPrice(details.expectedCash), lineWidth))
        out.write(formatLine("Cash Entered:", NumberUtils.formatPrice(details.cashAmt), lineWidth))
        out.write(formatLine("Difference:", NumberUtils.formatPrice(details.cashDifference), lineWidth))
        out.write(formatLine("Card Entered:", NumberUtils.formatPrice(details.cardAmt), lineWidth))

        out.write((padLine("-", lineWidth) + "\n").toByteArray())
        out.write(FONT_BOLD)
        out.write(formatLine("Sales Total:", NumberUtils.formatPrice(details.salesTotal), lineWidth))
        out.write(FONT_NORMAL)
        out.write(formatLine("Tax:", NumberUtils.formatPrice(details.taxTotal), lineWidth))
        out.write(formatLine("Orders:", details.numberOfOrders.toString(), lineWidth))
        out.write(formatLine("Items Sold:", details.itemsSold.toString(), lineWidth))

        out.write(LINE_FEED)
        out.write(LINE_FEED)
        out.write(PAPER_CUT)
        return out.toByteArray()
    }

    private fun sendToPrinter(data: ByteArray) {
        Socket(printerIp, PORT).use { socket ->
            socket.soTimeout = TIMEOUT
            socket.getOutputStream().use { outputStream ->
                outputStream.write(data)
                outputStream.flush()
            }
        }
    }

    /**
     * Generate a QR code as a monochrome Bitmap.
     */
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

    /**
     * Convert a monochrome Bitmap to ESC/POS raster image bytes (GS v 0).
     * Compatible with most 58mm/80mm thermal printers.
     */
    private fun bitmapToEscPos(bitmap: Bitmap): ByteArray {
        val width = bitmap.width
        val height = bitmap.height
        // Bytes per row (each byte = 8 horizontal pixels)
        val bytesPerRow = (width + 7) / 8
        val out = ByteArrayOutputStream()

        // GS v 0 command: print raster bit image
        out.write(byteArrayOf(0x1D, 0x76, 0x30, 0x00)) // GS v 0 m=0 (normal)
        out.write(byteArrayOf((bytesPerRow and 0xFF).toByte(), ((bytesPerRow shr 8) and 0xFF).toByte()))
        out.write(byteArrayOf((height and 0xFF).toByte(), ((height shr 8) and 0xFF).toByte()))

        for (y in 0 until height) {
            for (byteX in 0 until bytesPerRow) {
                var b = 0
                for (bit in 0 until 8) {
                    val x = byteX * 8 + bit
                    if (x < width) {
                        val pixel = bitmap.getPixel(x, y)
                        // If pixel is dark (not white), set the bit
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

    private fun padLine(char: String, width: Int): String = char.repeat(width)

    private fun formatLine(left: String, right: String, width: Int): ByteArray {
        val spaces = width - left.length - right.length
        val line = if (spaces > 0) "$left${" ".repeat(spaces)}$right\n"
        else "$left $right\n"
        return line.toByteArray()
    }
}
