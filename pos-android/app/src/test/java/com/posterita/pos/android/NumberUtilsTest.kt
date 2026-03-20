package com.posterita.pos.android

import com.posterita.pos.android.util.NumberUtils
import org.junit.Assert.*
import org.junit.Test

class NumberUtilsTest {

    @Test
    fun formatPrice_wholeNumber_showsTwoDecimals() {
        assertEquals("10.00", NumberUtils.formatPrice(10.0))
    }

    @Test
    fun formatPrice_withDecimals_roundsToTwo() {
        assertEquals("10.50", NumberUtils.formatPrice(10.5))
    }

    @Test
    fun formatPrice_zeroValue() {
        assertEquals("0.00", NumberUtils.formatPrice(0.0))
    }

    @Test
    fun formatPrice_negativeValue() {
        assertEquals("-5.25", NumberUtils.formatPrice(-5.25))
    }

    @Test
    fun formatPrice_manyDecimals_roundsCorrectly() {
        assertEquals("10.57", NumberUtils.formatPrice(10.567))
    }

    @Test
    fun formatPrice_largeNumber() {
        assertEquals("99999.99", NumberUtils.formatPrice(99999.99))
    }

    @Test
    fun formatQuantity_wholeNumber_noDecimals() {
        assertEquals("3", NumberUtils.formatQuantity(3.0))
    }

    @Test
    fun formatQuantity_withOneDecimal() {
        assertEquals("1.5", NumberUtils.formatQuantity(1.5))
    }

    @Test
    fun formatQuantity_withTwoDecimals() {
        assertEquals("2.25", NumberUtils.formatQuantity(2.25))
    }

    @Test
    fun formatQuantity_zero() {
        assertEquals("0", NumberUtils.formatQuantity(0.0))
    }

    @Test
    fun parseDouble_validNumber() {
        assertEquals(10.5, NumberUtils.parseDouble("10.5"), 0.001)
    }

    @Test
    fun parseDouble_wholeNumber() {
        assertEquals(42.0, NumberUtils.parseDouble("42"), 0.001)
    }

    @Test
    fun parseDouble_emptyString_returnsZero() {
        assertEquals(0.0, NumberUtils.parseDouble(""), 0.001)
    }

    @Test
    fun parseDouble_invalidString_returnsZero() {
        assertEquals(0.0, NumberUtils.parseDouble("abc"), 0.001)
    }

    @Test
    fun parseDouble_negativeNumber() {
        assertEquals(-5.5, NumberUtils.parseDouble("-5.5"), 0.001)
    }

    @Test
    fun parseDouble_zero() {
        assertEquals(0.0, NumberUtils.parseDouble("0"), 0.001)
    }
}
