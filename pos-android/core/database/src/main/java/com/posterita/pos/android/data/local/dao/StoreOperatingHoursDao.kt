package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.StoreOperatingHours

@Dao
interface StoreOperatingHoursDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(hours: List<StoreOperatingHours>)

    @Query("SELECT * FROM store_operating_hours WHERE account_id = :accountId AND store_id = :storeId ORDER BY day_type")
    suspend fun getByStore(accountId: String, storeId: Int): List<StoreOperatingHours>

    @Query("DELETE FROM store_operating_hours WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
