package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.RosterPeriod

@Dao
interface RosterPeriodDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(periods: List<RosterPeriod>)

    @Query("SELECT * FROM roster_period WHERE account_id = :accountId AND store_id = :storeId AND is_deleted = 0 ORDER BY start_date DESC")
    suspend fun getByStore(accountId: String, storeId: Int): List<RosterPeriod>

    @Query("SELECT * FROM roster_period WHERE account_id = :accountId AND status = :status AND is_deleted = 0 ORDER BY start_date DESC")
    suspend fun getByStatus(accountId: String, status: String): List<RosterPeriod>

    @Query("DELETE FROM roster_period WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
