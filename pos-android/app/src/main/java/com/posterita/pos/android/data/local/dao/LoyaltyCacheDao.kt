package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.LoyaltyCache

@Dao
interface LoyaltyCacheDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(cache: LoyaltyCache)

    @Query("SELECT * FROM loyalty_cache WHERE phone = :phone")
    suspend fun getByPhone(phone: String): LoyaltyCache?

    @Query("DELETE FROM loyalty_cache WHERE phone = :phone")
    suspend fun deleteByPhone(phone: String)
}
