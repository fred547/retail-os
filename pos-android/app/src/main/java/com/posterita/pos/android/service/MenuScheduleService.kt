package com.posterita.pos.android.service

import com.posterita.pos.android.data.local.dao.MenuScheduleDao
import com.posterita.pos.android.data.local.entity.MenuSchedule
import com.posterita.pos.android.util.SharedPreferencesManager
import org.json.JSONArray
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Determines which product categories should be visible based on active menu schedules.
 * If no schedules are configured, all categories are shown (no filtering).
 * If schedules exist, only categories in the active schedule(s) are shown.
 */
@Singleton
class MenuScheduleService @Inject constructor(
    private val menuScheduleDao: MenuScheduleDao,
    private val prefsManager: SharedPreferencesManager
) {
    /**
     * Get the set of category IDs that should be visible right now.
     * Returns null if no schedules are configured (show all categories).
     * Returns empty set if schedules exist but none are active (show nothing — edge case).
     */
    suspend fun getActiveCategoryIds(storeId: Int): Set<Int>? {
        val accountId = prefsManager.accountId
        if (accountId.isEmpty()) return null

        val schedules = menuScheduleDao.getActiveSchedules(accountId, storeId)
        if (schedules.isEmpty()) return null // No schedules = show all

        val now = Calendar.getInstance()
        val activeSchedules = schedules.filter { isActiveNow(it, now) }
        if (activeSchedules.isEmpty()) return null // None active right now = show all (graceful fallback)

        // Merge category IDs from all active schedules
        val categoryIds = mutableSetOf<Int>()
        for (schedule in activeSchedules) {
            categoryIds.addAll(parseCategoryIds(schedule.category_ids))
        }

        return categoryIds
    }

    private fun isActiveNow(schedule: MenuSchedule, now: Calendar): Boolean {
        // Check day of week
        val daysJson = schedule.days_of_week
        if (daysJson != null) {
            try {
                val arr = JSONArray(daysJson)
                val dayNames = (0 until arr.length()).map { arr.getString(it).lowercase() }
                if (dayNames.isNotEmpty()) {
                    val todayName = when (now.get(Calendar.DAY_OF_WEEK)) {
                        Calendar.MONDAY -> "monday"
                        Calendar.TUESDAY -> "tuesday"
                        Calendar.WEDNESDAY -> "wednesday"
                        Calendar.THURSDAY -> "thursday"
                        Calendar.FRIDAY -> "friday"
                        Calendar.SATURDAY -> "saturday"
                        Calendar.SUNDAY -> "sunday"
                        else -> ""
                    }
                    if (todayName !in dayNames) return false
                }
            } catch (_: Exception) { /* ignore parse errors */ }
        }

        // Check time range
        val startTime = schedule.start_time
        val endTime = schedule.end_time
        if (startTime != null || endTime != null) {
            val currentTime = String.format(
                "%02d:%02d",
                now.get(Calendar.HOUR_OF_DAY),
                now.get(Calendar.MINUTE)
            )
            if (startTime != null && currentTime < startTime) return false
            if (endTime != null && currentTime > endTime) return false
        }

        return true
    }

    private fun parseCategoryIds(json: String?): Set<Int> {
        if (json.isNullOrBlank()) return emptySet()
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { arr.getInt(it) }.toSet()
        } catch (_: Exception) {
            emptySet()
        }
    }
}
