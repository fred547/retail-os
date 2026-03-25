package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.SerialItem

@Dao
interface SerialItemDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<SerialItem>)

    @Update
    suspend fun update(item: SerialItem)

    /** Barcode scan lookup — find by serial number within this account */
    @Query("SELECT * FROM serial_item WHERE serial_number = :serialNumber AND account_id = :accountId AND is_deleted = 0 LIMIT 1")
    suspend fun getBySerialNumber(serialNumber: String, accountId: String): SerialItem?

    /** Get all serial items for a product (optionally filtered by status) */
    @Query("SELECT * FROM serial_item WHERE product_id = :productId AND account_id = :accountId AND is_deleted = 0 ORDER BY serial_number")
    suspend fun getByProductId(productId: Int, accountId: String): List<SerialItem>

    /** Get available (in_stock) serial items for a product */
    @Query("SELECT * FROM serial_item WHERE product_id = :productId AND account_id = :accountId AND status = 'in_stock' AND is_deleted = 0 ORDER BY serial_number")
    suspend fun getAvailableByProductId(productId: Int, accountId: String): List<SerialItem>

    /** Count available stock for a serialized product */
    @Query("SELECT COUNT(*) FROM serial_item WHERE product_id = :productId AND account_id = :accountId AND status = 'in_stock' AND is_deleted = 0")
    suspend fun getAvailableCount(productId: Int, accountId: String): Int

    /** Get all in-stock items for a store (inventory count) */
    @Query("SELECT * FROM serial_item WHERE store_id = :storeId AND account_id = :accountId AND status = 'in_stock' AND is_deleted = 0 ORDER BY serial_number")
    suspend fun getInStockByStore(storeId: Int, accountId: String): List<SerialItem>

    /** Get items owned by a customer */
    @Query("SELECT * FROM serial_item WHERE customer_id = :customerId AND account_id = :accountId AND is_deleted = 0 ORDER BY sold_date DESC")
    suspend fun getByCustomerId(customerId: Int, accountId: String): List<SerialItem>

    /** Get unsynced items (status changed locally, needs push) */
    @Query("SELECT * FROM serial_item WHERE is_sync = 0")
    suspend fun getUnsyncedItems(): List<SerialItem>

    /** Get by ID */
    @Query("SELECT * FROM serial_item WHERE serial_item_id = :id")
    suspend fun getById(id: Int): SerialItem?

    /** Delete all for account (used during sync reset) */
    @Query("DELETE FROM serial_item WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
