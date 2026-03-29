package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.Delivery

@Dao
interface DeliveryDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(deliveries: List<Delivery>)

    @Query("SELECT * FROM delivery WHERE account_id = :accountId AND is_deleted = 0 ORDER BY created_at DESC")
    suspend fun getDeliveries(accountId: String): List<Delivery>

    @Query("SELECT * FROM delivery WHERE account_id = :accountId AND store_id = :storeId AND is_deleted = 0 AND status NOT IN ('delivered', 'cancelled') ORDER BY created_at DESC")
    suspend fun getActiveDeliveries(accountId: String, storeId: Int): List<Delivery>

    @Query("SELECT * FROM delivery WHERE id = :id")
    suspend fun getDeliveryById(id: Int): Delivery?

    @Query("SELECT * FROM delivery WHERE order_id = :orderId AND account_id = :accountId LIMIT 1")
    suspend fun getDeliveryByOrderId(orderId: Int, accountId: String): Delivery?

    @Query("SELECT * FROM delivery WHERE account_id = :accountId AND id = 0")
    suspend fun getUnsyncedDeliveries(accountId: String): List<Delivery>

    @Query("DELETE FROM delivery WHERE id = 0 AND account_id = :accountId")
    suspend fun deleteUnsyncedByAccount(accountId: String)

    @Update
    suspend fun update(delivery: Delivery)

    @Query("UPDATE delivery SET status = :status, updated_at = :updatedAt WHERE id = :id")
    suspend fun updateStatus(id: Int, status: String, updatedAt: String)

    @Query("UPDATE delivery SET driver_id = :driverId, driver_name = :driverName, status = :status, assigned_at = :assignedAt, updated_at = :updatedAt WHERE id = :id")
    suspend fun assignDriver(id: Int, driverId: Int, driverName: String, status: String, assignedAt: String, updatedAt: String)

    @Query("DELETE FROM delivery WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
