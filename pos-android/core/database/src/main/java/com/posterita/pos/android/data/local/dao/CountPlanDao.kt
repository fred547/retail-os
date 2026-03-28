package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.CountPlan

@Dao
interface CountPlanDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(plans: List<CountPlan>)

    @Query("SELECT * FROM count_plan WHERE account_id = :accountId AND is_deleted = 0 ORDER BY created_at DESC")
    suspend fun getAll(accountId: String): List<CountPlan>

    @Query("SELECT * FROM count_plan WHERE account_id = :accountId AND status = 'active' AND is_deleted = 0")
    suspend fun getActivePlans(accountId: String): List<CountPlan>

    @Query("SELECT * FROM count_plan WHERE id = :id")
    suspend fun getById(id: Int): CountPlan?

    @Query("DELETE FROM count_plan WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
