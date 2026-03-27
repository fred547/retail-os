package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import com.posterita.pos.android.data.local.entity.ProductTag

@Dao
interface ProductTagDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(tags: List<ProductTag>)

    @Query("SELECT tag_id FROM product_tag WHERE product_id = :productId")
    suspend fun getTagIdsForProduct(productId: Int): List<Int>

    @Query("SELECT product_id FROM product_tag WHERE tag_id = :tagId")
    suspend fun getProductIdsForTag(tagId: Int): List<Int>

    @Query("DELETE FROM product_tag WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)

    @Transaction
    suspend fun replaceForAccount(accountId: String, tags: List<ProductTag>) {
        deleteByAccount(accountId)
        insertAll(tags)
    }
}
