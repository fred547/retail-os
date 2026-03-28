package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.PublicHoliday

@Dao
interface PublicHolidayDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(holidays: List<PublicHoliday>)

    @Query("SELECT * FROM public_holiday WHERE account_id = :accountId AND is_deleted = 0 ORDER BY date")
    suspend fun getAll(accountId: String): List<PublicHoliday>

    @Query("SELECT * FROM public_holiday WHERE account_id = :accountId AND date = :date AND is_deleted = 0 LIMIT 1")
    suspend fun getByDate(accountId: String, date: String): PublicHoliday?

    @Query("DELETE FROM public_holiday WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
