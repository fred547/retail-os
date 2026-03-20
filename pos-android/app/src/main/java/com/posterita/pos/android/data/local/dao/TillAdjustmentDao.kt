package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.TillAdjustment

@Dao
interface TillAdjustmentDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTillAdjustment(adjustment: TillAdjustment)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTillAdjustments(adjustments: List<TillAdjustment>)

    @Query("SELECT * FROM till_adjustment WHERE till_id = :tillId")
    suspend fun getAdjustmentsByTillId(tillId: Int): List<TillAdjustment>

    @Query("SELECT * FROM till_adjustment")
    suspend fun getAll(): List<TillAdjustment>
}
