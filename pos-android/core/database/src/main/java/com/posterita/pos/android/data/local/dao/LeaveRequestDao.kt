package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.LeaveRequest

@Dao
interface LeaveRequestDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<LeaveRequest>)

    @Query("SELECT * FROM leave_request WHERE account_id = :accountId AND user_id = :userId ORDER BY start_date DESC")
    suspend fun getByUser(accountId: String, userId: Int): List<LeaveRequest>

    @Query("DELETE FROM leave_request WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
