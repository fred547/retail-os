package com.posterita.pos.android.service

import android.util.Log
import com.posterita.pos.android.data.local.dao.ShiftDao
import com.posterita.pos.android.data.local.entity.Shift
import com.posterita.pos.android.util.SharedPreferencesManager
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Manages staff shift clock in/out — offline-first.
 *
 * Writes to Room immediately (works without internet).
 * CloudSyncWorker pushes unsynced shifts to the server during regular sync.
 */
@Singleton
class ShiftService @Inject constructor(
    private val shiftDao: ShiftDao,
    private val prefsManager: SharedPreferencesManager
) {
    companion object {
        private const val TAG = "ShiftService"
    }

    private fun nowIso(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(Date())
    }

    /**
     * Get active shift for current user from local Room DB.
     */
    suspend fun getActiveShift(userId: Int): Shift? {
        val accountId = prefsManager.accountId
        if (accountId.isEmpty()) return null
        return shiftDao.getActiveShift(accountId, userId)
    }

    /**
     * Clock in — writes to Room immediately (works offline).
     * Shift is marked is_synced=false, pushed to server by CloudSync.
     */
    suspend fun clockIn(
        userId: Int,
        userName: String,
        storeId: Int,
        terminalId: Int
    ): Result<Shift> {
        val accountId = prefsManager.accountId
        if (accountId.isEmpty()) return Result.failure(Exception("No active account"))

        return try {
            // Check for existing active shift
            val existing = shiftDao.getActiveShift(accountId, userId)
            if (existing != null) {
                return Result.failure(Exception("Already clocked in since ${existing.clock_in}"))
            }

            val now = nowIso()
            val shift = Shift(
                account_id = accountId,
                store_id = storeId,
                terminal_id = terminalId,
                user_id = userId,
                user_name = userName,
                clock_in = now,
                status = Shift.STATUS_ACTIVE,
                created_at = now,
                uuid = UUID.randomUUID().toString(),
                is_synced = false
            )

            val localId = shiftDao.insert(shift)
            val saved = shift.copy(id = localId.toInt())
            Log.d(TAG, "Clocked in: user=$userId, localId=$localId, uuid=${shift.uuid}")
            Result.success(saved)
        } catch (e: Exception) {
            Log.e(TAG, "Clock in failed", e)
            Result.failure(e)
        }
    }

    /**
     * Clock out — updates the local shift in Room (works offline).
     * Computes hours_worked locally. Pushed to server by CloudSync.
     */
    suspend fun clockOut(shiftId: Int, breakMinutes: Int = 0, notes: String? = null): Result<Shift> {
        val accountId = prefsManager.accountId
        if (accountId.isEmpty()) return Result.failure(Exception("No active account"))

        return try {
            val shift = shiftDao.getShiftById(shiftId)
                ?: return Result.failure(Exception("Shift not found"))

            val now = nowIso()

            // Compute hours worked
            var hoursWorked: Double? = null
            val clockInStr = shift.clock_in
            if (clockInStr != null) {
                try {
                    val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
                    sdf.timeZone = TimeZone.getTimeZone("UTC")
                    val clockInTime = sdf.parse(clockInStr.take(19))
                    val clockOutTime = sdf.parse(now.take(19))
                    if (clockInTime != null && clockOutTime != null) {
                        val diffMs = clockOutTime.time - clockInTime.time
                        val diffHours = diffMs / 3600000.0
                        hoursWorked = Math.max(0.0, diffHours - breakMinutes / 60.0)
                        hoursWorked = Math.round(hoursWorked * 100) / 100.0
                    }
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to compute hours: ${e.message}")
                }
            }

            val updated = shift.copy(
                clock_out = now,
                break_minutes = breakMinutes,
                hours_worked = hoursWorked,
                notes = notes,
                status = Shift.STATUS_COMPLETED,
                is_synced = false
            )

            shiftDao.updateShift(updated)
            Log.d(TAG, "Clocked out: shiftId=$shiftId, hours=$hoursWorked")
            Result.success(updated)
        } catch (e: Exception) {
            Log.e(TAG, "Clock out failed", e)
            Result.failure(e)
        }
    }
}
