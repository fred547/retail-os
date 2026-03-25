package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.Modifier

@Dao
interface ModifierDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertModifiers(modifiers: List<Modifier>)

    @Query("SELECT * FROM modifier WHERE modifier_id = :id AND isactive='Y'")
    suspend fun getModifierById(id: Int): Modifier?

    @Query("SELECT * FROM modifier WHERE isactive='Y'")
    suspend fun getAllModifiers(): List<Modifier>

    @Query("SELECT * FROM modifier WHERE product_id = :productId AND isactive='Y'")
    suspend fun getModifiersByProductId(productId: Int): List<Modifier>

    /**
     * Get modifiers that apply to a given product category.
     * The productcategories field is a comma-separated string of category IDs (e.g. "424,1284").
     * We match using LIKE to find modifiers that contain the given category ID.
     */
    @Query("SELECT * FROM modifier WHERE (productcategories LIKE '%' || :categoryId || '%') AND isactive='Y'")
    suspend fun getModifiersByCategoryId(categoryId: Int): List<Modifier>
}
