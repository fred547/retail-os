package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.Shift

@Dao
interface ShiftDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(shifts: List<Shift>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(shift: Shift): Long

    @Update
    suspend fun updateShift(shift: Shift)

    @Query("SELECT * FROM shift WHERE account_id = :accountId AND user_id = :userId AND status = 'active' LIMIT 1")
    suspend fun getActiveShift(accountId: String, userId: Int): Shift?

    @Query("SELECT * FROM shift WHERE account_id = :accountId AND store_id = :storeId ORDER BY created_at DESC")
    suspend fun getShiftsByStore(accountId: String, storeId: Int): List<Shift>

    @Query("SELECT * FROM shift WHERE id = :id")
    suspend fun getShiftById(id: Int): Shift?

    @Query("SELECT * FROM shift WHERE account_id = :accountId AND is_synced = 0")
    suspend fun getUnsyncedShifts(accountId: String): List<Shift>

    @Query("UPDATE shift SET is_synced = 1 WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<Int>)

    @Query("DELETE FROM shift WHERE account_id = :accountId AND is_synced = 0 AND uuid IS NOT NULL")
    suspend fun deleteUnsyncedByAccount(accountId: String)

    @Query("DELETE FROM shift WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
