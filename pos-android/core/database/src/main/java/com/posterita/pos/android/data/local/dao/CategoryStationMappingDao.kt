package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.CategoryStationMapping

@Dao
interface CategoryStationMappingDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(mappings: List<CategoryStationMapping>)

    @Query("SELECT * FROM category_station_mapping WHERE account_id = :accountId")
    suspend fun getMappingsByAccount(accountId: String): List<CategoryStationMapping>

    @Query("SELECT station_id FROM category_station_mapping WHERE account_id = :accountId AND category_id = :categoryId")
    suspend fun getStationForCategory(accountId: String, categoryId: Int): Int?

    @Query("DELETE FROM category_station_mapping WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
