package com.posterita.pos.android.service

import android.util.Log
import com.posterita.pos.android.util.SharedPreferencesManager
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Adjusts stock quantities via the /api/stock endpoint.
 * Used by warehouse staff for manual adjustments and count reconciliation.
 */
@Singleton
class StockAdjustmentService @Inject constructor(
    private val prefsManager: SharedPreferencesManager
) {
    companion object {
        private const val TAG = "StockAdjustment"
        private const val STOCK_URL = "https://web.posterita.com/api/stock"
    }

    data class AdjustmentResult(
        val success: Boolean,
        val newQuantity: Double = 0.0,
        val error: String? = null
    )

    /**
     * Set stock quantity to a specific value.
     * @param productId The product to adjust
     * @param storeId The store where stock is adjusted
     * @param newQuantity The new absolute quantity
     * @param reason adjustment/count_reconcile/receive/return/transfer
     * @param notes Optional notes about the adjustment
     * @param userId The user making the adjustment
     */
    suspend fun adjustStock(
        productId: Int,
        storeId: Int,
        newQuantity: Double,
        reason: String = "adjustment",
        notes: String? = null,
        userId: Int = 0
    ): AdjustmentResult {
        val accountId = prefsManager.accountId
        return try {
            val payload = JSONObject().apply {
                put("account_id", accountId)
                put("product_id", productId)
                put("store_id", storeId)
                put("new_quantity", newQuantity)
                put("reason", reason)
                if (!notes.isNullOrBlank()) put("notes", notes)
                if (userId > 0) put("user_id", userId)
            }

            val url = URL(STOCK_URL)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.connectTimeout = 10000
            conn.readTimeout = 10000
            conn.doOutput = true

            conn.outputStream.bufferedWriter().use { it.write(payload.toString()) }

            val responseCode = conn.responseCode
            val body = if (responseCode in 200..299) {
                conn.inputStream.bufferedReader().readText()
            } else {
                conn.errorStream?.bufferedReader()?.readText() ?: """{"error":"HTTP $responseCode"}"""
            }
            conn.disconnect()

            val json = JSONObject(body)
            if (responseCode in 200..299) {
                AdjustmentResult(
                    success = true,
                    newQuantity = json.optDouble("new_quantity", newQuantity)
                )
            } else {
                AdjustmentResult(
                    success = false,
                    error = json.optString("error", "Adjustment failed")
                )
            }
        } catch (e: Exception) {
            Log.e(TAG, "Stock adjustment failed", e)
            AdjustmentResult(success = false, error = e.message)
        }
    }

    /**
     * Reconcile inventory count: set stock to counted quantity for each entry.
     */
    suspend fun reconcileCount(
        entries: List<Pair<Int, Int>>, // productId to countedQty
        storeId: Int,
        userId: Int,
        sessionName: String? = null
    ): Int {
        var reconciled = 0
        for ((productId, countedQty) in entries) {
            val result = adjustStock(
                productId = productId,
                storeId = storeId,
                newQuantity = countedQty.toDouble(),
                reason = "count_reconcile",
                notes = "Inventory count${if (sessionName != null) ": $sessionName" else ""}",
                userId = userId
            )
            if (result.success) reconciled++
        }
        return reconciled
    }
}
