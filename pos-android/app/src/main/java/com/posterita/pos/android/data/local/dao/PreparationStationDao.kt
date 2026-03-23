package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.PreparationStation

@Dao
interface PreparationStationDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(stations: List<PreparationStation>)

    @Query("SELECT * FROM preparation_station WHERE store_id = :storeId AND is_active = 1 ORDER BY display_order")
    suspend fun getStationsByStore(storeId: Int): List<PreparationStation>

    @Query("SELECT * FROM preparation_station WHERE station_id = :stationId")
    suspend fun getStationById(stationId: Int): PreparationStation?

    @Query("SELECT * FROM preparation_station WHERE station_type = :type AND store_id = :storeId AND is_active = 1 ORDER BY display_order")
    suspend fun getStationsByType(type: String, storeId: Int): List<PreparationStation>

    @Query("DELETE FROM preparation_station WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
