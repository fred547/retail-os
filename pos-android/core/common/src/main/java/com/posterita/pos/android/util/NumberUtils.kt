package com.posterita.pos.android.util

import java.text.DecimalFormat
import java.text.DecimalFormatSymbols
import java.util.Locale

object NumberUtils {
    // Force US locale to always use '.' as decimal separator
    private val symbols = DecimalFormatSymbols(Locale.US)
    private val priceFormat = DecimalFormat("#0.00", symbols)
    private val qtyFormat = DecimalFormat("#0.##", symbols)

    fun formatPrice(price: Double): String = priceFormat.format(price)
    fun formatQuantity(qty: Double): String = qtyFormat.format(qty)
    fun parseDouble(value: String): Double = try {
        value.replace(",", ".").toDouble()
    } catch (e: Exception) { 0.0 }
}
