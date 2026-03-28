package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.CountScan

@Dao
interface CountScanDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(scan: CountScan): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(scans: List<CountScan>)

    @Query("SELECT * FROM count_scan WHERE plan_id = :planId ORDER BY scanned_at DESC")
    suspend fun getByPlanId(planId: Int): List<CountScan>

    @Query("SELECT * FROM count_scan WHERE plan_id = :planId AND shelf = :shelf AND height = :height ORDER BY scanned_at DESC")
    suspend fun getByLocation(planId: Int, shelf: Int, height: String): List<CountScan>

    @Query("SELECT * FROM count_scan WHERE plan_id = :planId AND is_synced = 0")
    suspend fun getUnsynced(planId: Int): List<CountScan>

    @Query("UPDATE count_scan SET is_synced = 1 WHERE id IN (:ids)")
    suspend fun markSynced(ids: List<Long>)

    @Query("SELECT COUNT(*) FROM count_scan WHERE plan_id = :planId")
    suspend fun countByPlan(planId: Int): Int

    @Query("SELECT COUNT(*) FROM count_scan WHERE plan_id = :planId AND is_unknown = 1")
    suspend fun countUnknownByPlan(planId: Int): Int

    @Query("DELETE FROM count_scan WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
