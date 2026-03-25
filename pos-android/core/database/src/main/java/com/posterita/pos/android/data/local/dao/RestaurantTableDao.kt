package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.RestaurantTable

@Dao
interface RestaurantTableDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTable(table: RestaurantTable): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTables(tables: List<RestaurantTable>)

    @Update
    suspend fun updateTable(table: RestaurantTable)

    @Delete
    suspend fun deleteTable(table: RestaurantTable)

    @Query("SELECT * FROM restaurant_table WHERE store_id = :storeId ORDER BY table_name")
    suspend fun getTablesByStore(storeId: Int): List<RestaurantTable>

    @Query("SELECT * FROM restaurant_table WHERE table_id = :tableId")
    suspend fun getTableById(tableId: Int): RestaurantTable?

    @Query("SELECT * FROM restaurant_table WHERE is_occupied = 1 AND store_id = :storeId ORDER BY table_name")
    suspend fun getOccupiedTables(storeId: Int): List<RestaurantTable>

    @Query("SELECT * FROM restaurant_table WHERE is_occupied = 0 AND store_id = :storeId ORDER BY table_name")
    suspend fun getFreeTables(storeId: Int): List<RestaurantTable>

    @Query("UPDATE restaurant_table SET is_occupied = :occupied, current_order_id = :orderId, updated = :updated WHERE table_id = :tableId")
    suspend fun updateTableStatus(tableId: Int, occupied: Boolean, orderId: String?, updated: Long = System.currentTimeMillis())

    @Query("SELECT COUNT(*) FROM restaurant_table WHERE store_id = :storeId")
    suspend fun getTableCount(storeId: Int): Int
}
