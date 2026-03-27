package com.posterita.pos.android.data.local.dao

import androidx.lifecycle.LiveData
import androidx.room.*
import com.posterita.pos.android.data.local.entity.ProductCategory

@Dao
interface ProductCategoryDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProductCategories(categories: List<ProductCategory>)

    @Query("SELECT * FROM productcategory WHERE productcategory_id = :id AND isactive='Y'")
    fun getProductCategoryById(id: Int): LiveData<ProductCategory?>

    @Query("SELECT * FROM productcategory WHERE isactive='Y'")
    fun getAllProductCategories(): LiveData<List<ProductCategory>>

    @Query("SELECT * FROM productcategory WHERE isactive='Y'")
    suspend fun getAllProductCategoriesSync(): List<ProductCategory>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProductCategory(category: ProductCategory): Long

    @Update
    suspend fun updateProductCategory(category: ProductCategory)

    @Delete
    suspend fun deleteProductCategory(category: ProductCategory)

    @Query("SELECT MAX(productcategory_id) FROM productcategory")
    suspend fun getMaxCategoryId(): Int?

    @Query("SELECT * FROM productcategory WHERE isactive='Y' AND (parent_category_id IS NULL OR parent_category_id = 0) ORDER BY position, name")
    fun getRootCategories(): LiveData<List<ProductCategory>>

    @Query("SELECT * FROM productcategory WHERE isactive='Y' AND parent_category_id = :parentId ORDER BY position, name")
    fun getChildCategories(parentId: Int): LiveData<List<ProductCategory>>

    @Query("SELECT * FROM productcategory WHERE isactive='Y' AND parent_category_id = :parentId ORDER BY position, name")
    suspend fun getChildCategoriesSync(parentId: Int): List<ProductCategory>

    @Query("SELECT * FROM productcategory WHERE isactive='Y' ORDER BY level, position, name")
    suspend fun getAllCategoriesOrderedByLevel(): List<ProductCategory>
}
