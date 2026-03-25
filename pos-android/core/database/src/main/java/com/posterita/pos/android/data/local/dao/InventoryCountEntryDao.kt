package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.InventoryCountEntry

@Dao
interface InventoryCountEntryDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(entry: InventoryCountEntry): Long

    @Query("SELECT * FROM inventory_count_entry WHERE session_id = :sessionId ORDER BY scanned_at DESC")
    suspend fun getEntriesBySession(sessionId: Int): List<InventoryCountEntry>

    @Query("SELECT * FROM inventory_count_entry WHERE session_id = :sessionId AND product_id = :productId LIMIT 1")
    suspend fun getEntryBySessionAndProduct(sessionId: Int, productId: Int): InventoryCountEntry?

    @Query("UPDATE inventory_count_entry SET quantity = quantity + :amount, scanned_at = :scannedAt WHERE entry_id = :entryId")
    suspend fun incrementQuantity(entryId: Int, amount: Int = 1, scannedAt: Long = System.currentTimeMillis())

    @Query("SELECT * FROM inventory_count_entry WHERE is_synced = 'N'")
    suspend fun getUnsyncedEntries(): List<InventoryCountEntry>

    @Query("UPDATE inventory_count_entry SET is_synced = 'Y' WHERE entry_id IN (:ids)")
    suspend fun markSynced(ids: List<Int>)

    @Query("SELECT SUM(quantity) FROM inventory_count_entry WHERE session_id = :sessionId")
    suspend fun getTotalQuantity(sessionId: Int): Int?

    @Query("SELECT COUNT(DISTINCT product_id) FROM inventory_count_entry WHERE session_id = :sessionId")
    suspend fun getUniqueProductCount(sessionId: Int): Int
}
