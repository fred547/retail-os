package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.AuditEvent

@Dao
interface AuditEventDao {
    @Insert
    suspend fun insert(event: AuditEvent): Long

    @Query("SELECT * FROM audit_event ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getRecentEvents(limit: Int = 100): List<AuditEvent>

    @Query("SELECT * FROM audit_event WHERE action = :action ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getEventsByAction(action: String, limit: Int = 50): List<AuditEvent>

    @Query("SELECT * FROM audit_event WHERE userId = :userId ORDER BY timestamp DESC LIMIT :limit")
    suspend fun getEventsByUser(userId: Int, limit: Int = 50): List<AuditEvent>

    @Query("SELECT * FROM audit_event WHERE isSynced = 'N' ORDER BY timestamp ASC")
    suspend fun getUnsyncedEvents(): List<AuditEvent>

    @Query("UPDATE audit_event SET isSynced = 'Y' WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<Long>)

    @Query("DELETE FROM audit_event WHERE timestamp < :before AND isSynced = 'Y'")
    suspend fun deleteOldSyncedEvents(before: Long)
}
