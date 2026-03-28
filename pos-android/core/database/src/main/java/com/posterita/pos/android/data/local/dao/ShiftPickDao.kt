package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.ShiftPick

@Dao
interface ShiftPickDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(picks: List<ShiftPick>)

    @Query("SELECT * FROM shift_pick WHERE account_id = :accountId AND user_id = :userId AND status != 'cancelled' ORDER BY date")
    suspend fun getByUser(accountId: String, userId: Int): List<ShiftPick>

    @Query("SELECT * FROM shift_pick WHERE account_id = :accountId AND roster_period_id = :periodId AND status != 'cancelled' ORDER BY date")
    suspend fun getByPeriod(accountId: String, periodId: Int): List<ShiftPick>

    @Query("DELETE FROM shift_pick WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
