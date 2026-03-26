package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.MenuSchedule

@Dao
interface MenuScheduleDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(schedules: List<MenuSchedule>)

    @Query("SELECT * FROM menu_schedule WHERE account_id = :accountId AND store_id = :storeId AND is_active = 1 ORDER BY priority DESC")
    suspend fun getActiveSchedules(accountId: String, storeId: Int): List<MenuSchedule>

    @Query("SELECT * FROM menu_schedule WHERE id = :id")
    suspend fun getScheduleById(id: Int): MenuSchedule?

    @Query("DELETE FROM menu_schedule WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
