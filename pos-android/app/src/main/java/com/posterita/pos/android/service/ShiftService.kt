package com.posterita.pos.android.service

import android.util.Log
import com.posterita.pos.android.data.local.dao.ShiftDao
import com.posterita.pos.android.data.local.entity.Shift
import com.posterita.pos.android.util.SharedPreferencesManager
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages staff shift clock in/out.
 * Calls the /api/shifts endpoint and caches locally in Room.
 */
@Singleton
class ShiftService @Inject constructor(
    private val shiftDao: ShiftDao,
    private val prefsManager: SharedPreferencesManager
) {
    companion object {
        private const val TAG = "ShiftService"
        private const val BASE_URL = "https://web.posterita.com/api/shifts"
    }

    /**
     * Get active shift for current user from local cache.
     */
    suspend fun getActiveShift(userId: Int): Shift? {
        val accountId = prefsManager.accountId
        if (accountId.isEmpty()) return null
        return shiftDao.getActiveShift(accountId, userId)
    }

    /**
     * Clock in: POST to /api/shifts with action=clock_in.
     * Returns the new shift on success.
     */
    suspend fun clockIn(
        userId: Int,
        userName: String,
        storeId: Int,
        terminalId: Int
    ): Result<Shift> {
        val accountId = prefsManager.accountId
        return try {
            val payload = JSONObject().apply {
                put("account_id", accountId)
                put("action", "clock_in")
                put("user_id", userId)
                put("user_name", userName)
                put("store_id", storeId)
                put("terminal_id", terminalId)
            }

            val response = postShiftApi(payload)
            if (response.has("id")) {
                val shift = Shift(
                    id = response.getInt("id"),
                    account_id = accountId,
                    store_id = storeId,
                    terminal_id = terminalId,
                    user_id = userId,
                    user_name = userName,
                    clock_in = response.optString("clock_in"),
                    status = "active",
                    created_at = response.optString("created_at")
                )
                shiftDao.insertAll(listOf(shift))
                Result.success(shift)
            } else {
                Result.failure(Exception(response.optString("error", "Clock in failed")))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Clock in failed", e)
            Result.failure(e)
        }
    }

    /**
     * Clock out: POST to /api/shifts with action=clock_out.
     * Returns the completed shift on success.
     */
    suspend fun clockOut(shiftId: Int, breakMinutes: Int = 0, notes: String? = null): Result<Shift> {
        val accountId = prefsManager.accountId
        return try {
            val payload = JSONObject().apply {
                put("account_id", accountId)
                put("action", "clock_out")
                put("shift_id", shiftId)
                if (breakMinutes > 0) put("break_minutes", breakMinutes)
                if (!notes.isNullOrBlank()) put("notes", notes)
            }

            val response = postShiftApi(payload)
            if (response.optString("status") == "completed" || response.has("clock_out")) {
                val updated = Shift(
                    id = shiftId,
                    account_id = accountId,
                    store_id = response.optInt("store_id"),
                    terminal_id = response.optInt("terminal_id"),
                    user_id = response.optInt("user_id"),
                    user_name = response.optString("user_name"),
                    clock_in = response.optString("clock_in"),
                    clock_out = response.optString("clock_out"),
                    break_minutes = response.optInt("break_minutes"),
                    hours_worked = response.optDouble("hours_worked"),
                    notes = notes,
                    status = "completed",
                    created_at = response.optString("created_at")
                )
                shiftDao.insertAll(listOf(updated))
                Result.success(updated)
            } else {
                Result.failure(Exception(response.optString("error", "Clock out failed")))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Clock out failed", e)
            Result.failure(e)
        }
    }

    private fun postShiftApi(payload: JSONObject): JSONObject {
        val url = URL(BASE_URL)
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

        return JSONObject(body)
    }
}
