package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.Shift

@Dao
interface ShiftDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(shifts: List<Shift>)

    @Query("SELECT * FROM shift WHERE account_id = :accountId AND user_id = :userId AND status = 'active' LIMIT 1")
    suspend fun getActiveShift(accountId: String, userId: Int): Shift?

    @Query("SELECT * FROM shift WHERE account_id = :accountId AND store_id = :storeId ORDER BY created_at DESC")
    suspend fun getShiftsByStore(accountId: String, storeId: Int): List<Shift>

    @Query("SELECT * FROM shift WHERE id = :id")
    suspend fun getShiftById(id: Int): Shift?

    @Query("DELETE FROM shift WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
