package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.LoyaltyConfig

@Dao
interface LoyaltyConfigDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(configs: List<LoyaltyConfig>)

    @Query("SELECT * FROM loyalty_config WHERE account_id = :accountId AND is_active = 1 LIMIT 1")
    suspend fun getActiveConfig(accountId: String): LoyaltyConfig?

    @Query("DELETE FROM loyalty_config WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
