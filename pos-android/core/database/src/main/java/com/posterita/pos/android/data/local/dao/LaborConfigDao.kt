package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.LaborConfig

@Dao
interface LaborConfigDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(configs: List<LaborConfig>)

    @Query("SELECT * FROM labor_config WHERE account_id = :accountId LIMIT 1")
    suspend fun getConfig(accountId: String): LaborConfig?

    @Query("DELETE FROM labor_config WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
