package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.Promotion

@Dao
interface PromotionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(promotions: List<Promotion>)

    @Query("SELECT * FROM promotion WHERE account_id = :accountId AND is_active = 1 AND is_deleted = 0 ORDER BY priority DESC")
    suspend fun getActivePromotions(accountId: String): List<Promotion>

    @Query("SELECT * FROM promotion WHERE account_id = :accountId AND is_active = 1 AND is_deleted = 0 AND (store_id IS NULL OR store_id = :storeId) ORDER BY priority DESC")
    suspend fun getActivePromotionsForStore(accountId: String, storeId: Int): List<Promotion>

    @Query("SELECT * FROM promotion WHERE id = :id")
    suspend fun getPromotionById(id: Int): Promotion?

    @Query("SELECT * FROM promotion WHERE account_id = :accountId AND promo_code = :code AND is_active = 1 AND is_deleted = 0 LIMIT 1")
    suspend fun getByPromoCode(accountId: String, code: String): Promotion?

    @Query("DELETE FROM promotion WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
