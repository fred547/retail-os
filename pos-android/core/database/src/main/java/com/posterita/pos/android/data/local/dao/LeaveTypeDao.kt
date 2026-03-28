package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.LeaveType

@Dao
interface LeaveTypeDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<LeaveType>)

    @Query("SELECT * FROM leave_type WHERE account_id = :accountId AND is_active = 1 ORDER BY name")
    suspend fun getActiveTypes(accountId: String): List<LeaveType>

    @Query("DELETE FROM leave_type WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
