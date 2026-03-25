package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.Store

@Dao
interface StoreDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStores(stores: List<Store>)

    @Query("SELECT * FROM store WHERE isactive='Y'")
    suspend fun getAllStores(): List<Store>

    @Query("SELECT * FROM store WHERE storeid = :storeId AND isactive='Y'")
    suspend fun getStoreById(storeId: Int): Store?

    @Query("SELECT * FROM store WHERE name = :storeName AND isactive='Y'")
    suspend fun getStoreByName(storeName: String): Store?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertStore(store: Store): Long

    @Update
    suspend fun updateStore(store: Store)

    @Delete
    suspend fun deleteStore(store: Store)

    @Query("SELECT MAX(storeid) FROM store")
    suspend fun getMaxStoreId(): Int?
}
