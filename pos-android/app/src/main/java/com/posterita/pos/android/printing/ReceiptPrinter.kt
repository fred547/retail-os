package com.posterita.pos.android.printing

import com.posterita.pos.android.domain.model.ClosedTillDetails
import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.util.DateUtils
import com.posterita.pos.android.util.NumberUtils
import java.io.ByteArrayOutputStream
import java.net.Socket

class ReceiptPrinter(
    private val printerIp: String,
    private val lineWidth: Int
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

        // Receipt message
        order.account?.receiptmessage?.let {
            if (it.isNotEmpty()) {
                out.write(LINE_FEED)
                out.write(CENTER_ALIGN)
                out.write("$it\n".toByteArray())
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
        out.write(FONT_H1)
        out.write("KITCHEN COPY\n".toByteArray())
        out.write(FONT_NORMAL)
        out.write(LEFT_ALIGN)
        out.write("Order: ${order.documentno}\n".toByteArray())
        out.write("Customer: ${order.customer_name ?: "Walk-In"}\n".toByteArray())
        out.write((padLine("-", lineWidth) + "\n").toByteArray())

        var itemCount = 0
        for (line in order.lines) {
            if (line.isKitchenItem == "Y") {
                out.write("${NumberUtils.formatQuantity(line.qtyentered)} x ${line.name}\n".toByteArray())
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

    private fun padLine(char: String, width: Int): String = char.repeat(width)

    private fun formatLine(left: String, right: String, width: Int): ByteArray {
        val spaces = width - left.length - right.length
        val line = if (spaces > 0) "$left${" ".repeat(spaces)}$right\n"
        else "$left $right\n"
        return line.toByteArray()
    }
}
