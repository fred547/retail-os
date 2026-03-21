package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.ErrorLog

@Dao
interface ErrorLogDao {
    @Insert
    suspend fun insert(log: ErrorLog): Long

    @Query("SELECT * FROM error_log WHERE isSynced = 'N' ORDER BY timestamp ASC LIMIT 100")
    suspend fun getUnsyncedLogs(): List<ErrorLog>

    @Query("UPDATE error_log SET isSynced = 'Y' WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<Long>)

    @Query("SELECT * FROM error_log ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getRecentLogs(limit: Int = 50): List<ErrorLog>

    @Query("SELECT * FROM error_log WHERE severity = 'FATAL' ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getFatalLogs(limit: Int = 20): List<ErrorLog>

    @Query("DELETE FROM error_log WHERE isSynced = 'Y' AND timestamp < :before")
    suspend fun deleteOldSyncedLogs(before: Long)

    @Query("SELECT COUNT(*) FROM error_log WHERE isSynced = 'N'")
    suspend fun getUnsyncedCount(): Int
}
