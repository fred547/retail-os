package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.StaffSchedule

@Dao
interface StaffScheduleDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<StaffSchedule>)

    @Query("SELECT * FROM staff_schedule WHERE account_id = :accountId ORDER BY date DESC")
    suspend fun getByAccount(accountId: String): List<StaffSchedule>

    @Query("SELECT * FROM staff_schedule WHERE account_id = :accountId AND user_id = :userId ORDER BY date DESC")
    suspend fun getByUser(accountId: String, userId: Int): List<StaffSchedule>

    @Query("DELETE FROM staff_schedule WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
