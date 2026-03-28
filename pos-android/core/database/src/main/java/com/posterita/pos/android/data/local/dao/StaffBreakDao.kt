package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.StaffBreak

@Dao
interface StaffBreakDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<StaffBreak>)

    @Query("SELECT * FROM staff_break WHERE account_id = :accountId ORDER BY created_at DESC")
    suspend fun getByAccount(accountId: String): List<StaffBreak>

    @Query("DELETE FROM staff_break WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
