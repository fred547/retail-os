package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.PendingLoyaltyAward

@Dao
interface PendingLoyaltyAwardDao {

    @Insert
    suspend fun insert(award: PendingLoyaltyAward)

    @Query("SELECT * FROM pending_loyalty_award ORDER BY createdAt ASC")
    suspend fun getAll(): List<PendingLoyaltyAward>

    @Delete
    suspend fun delete(award: PendingLoyaltyAward)
}
