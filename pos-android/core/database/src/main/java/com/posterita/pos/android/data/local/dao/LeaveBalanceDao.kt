package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.LeaveBalance

@Dao
interface LeaveBalanceDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<LeaveBalance>)

    @Query("SELECT * FROM leave_balance WHERE account_id = :accountId AND user_id = :userId")
    suspend fun getByUser(accountId: String, userId: Int): List<LeaveBalance>

    @Query("DELETE FROM leave_balance WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
