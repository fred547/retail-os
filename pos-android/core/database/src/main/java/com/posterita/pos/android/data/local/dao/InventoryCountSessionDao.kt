package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.InventoryCountSession

@Dao
interface InventoryCountSessionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdate(session: InventoryCountSession)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSessions(sessions: List<InventoryCountSession>)

    @Query("SELECT * FROM inventory_count_session WHERE store_id = :storeId AND status IN ('created', 'active') ORDER BY created_at DESC")
    suspend fun getActiveSessions(storeId: Int): List<InventoryCountSession>

    @Query("SELECT * FROM inventory_count_session WHERE session_id = :sessionId")
    suspend fun getSessionById(sessionId: Int): InventoryCountSession?

    @Query("SELECT * FROM inventory_count_session ORDER BY created_at DESC")
    suspend fun getAllSessions(): List<InventoryCountSession>

    @Query("UPDATE inventory_count_session SET status = :status, updated_at = :updatedAt WHERE session_id = :sessionId")
    suspend fun updateStatus(sessionId: Int, status: String, updatedAt: String)
}
