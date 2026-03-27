package com.posterita.pos.android.data.local.dao

import androidx.lifecycle.LiveData
import androidx.room.*
import com.posterita.pos.android.data.local.entity.Product

@Dao
interface ProductDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProducts(products: List<Product>)

    @Query("SELECT * FROM product WHERE product_id = :productId AND isactive='Y'")
    fun getProductById(productId: Int): LiveData<Product?>

    @Query("SELECT * FROM product WHERE product_id = :productId AND isactive='Y'")
    suspend fun getProductByIdSync(productId: Int): Product?

    @Query("SELECT * FROM product WHERE isactive = 'Y'")
    fun getAllProducts(): LiveData<List<Product>>

    @Query("SELECT * FROM product WHERE name LIKE '%' || :searchTerm || '%' AND isactive='Y'")
    fun searchProductsByName(searchTerm: String): LiveData<List<Product>>

    @Query("SELECT * FROM product WHERE upc = :upc AND isactive='Y'")
    suspend fun getProductByUpc(upc: String): Product?

    @Query("SELECT * FROM product WHERE productcategory_id = :categoryId AND isactive='Y'")
    fun getProductsByCategoryId(categoryId: Int): LiveData<List<Product>>

    @Query("SELECT * FROM product WHERE (name LIKE '%' || :searchTerm || '%' OR description LIKE '%' || :searchTerm || '%' OR upc LIKE '%' || :searchTerm || '%') AND isactive='Y'")
    fun searchProducts(searchTerm: String): LiveData<List<Product>>

    @Query("SELECT * FROM product WHERE isactive = 'Y'")
    suspend fun getAllProductsSync(): List<Product>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProduct(product: Product): Long

    @Update
    suspend fun updateProduct(product: Product)

    @Delete
    suspend fun deleteProduct(product: Product)

    @Query("SELECT MAX(product_id) FROM product")
    suspend fun getMaxProductId(): Int?

    /** Update the selling price and review flag for a product */
    @Query("UPDATE product SET sellingprice = :price, taxamount = :taxAmount, needs_price_review = :needsReview, price_set_by = :setByUserId WHERE product_id = :productId")
    suspend fun updateProductPrice(productId: Int, price: Double, taxAmount: Double, needsReview: String?, setByUserId: Int)

    /** Get all products flagged for price review */
    @Query("SELECT * FROM product WHERE needs_price_review = 'Y' AND isactive = 'Y' ORDER BY name")
    suspend fun getProductsNeedingPriceReview(): List<Product>

    /** Count products needing price review */
    @Query("SELECT COUNT(*) FROM product WHERE needs_price_review = 'Y' AND isactive = 'Y'")
    suspend fun countProductsNeedingPriceReview(): Int

    /** Clear the review flag (owner approved the price) */
    @Query("UPDATE product SET needs_price_review = NULL WHERE product_id = :productId")
    suspend fun clearPriceReviewFlag(productId: Int)

    /** Clear all review flags at once */
    @Query("UPDATE product SET needs_price_review = NULL WHERE needs_price_review = 'Y'")
    suspend fun clearAllPriceReviewFlags()

    /** Update stock quantity locally (after server-side adjustment) */
    @Query("UPDATE product SET quantity_on_hand = :qty WHERE product_id = :productId")
    suspend fun updateStockQuantity(productId: Int, qty: Double)
}
