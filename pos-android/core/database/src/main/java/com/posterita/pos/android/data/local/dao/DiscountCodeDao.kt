package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.DiscountCode

@Dao
interface DiscountCodeDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertDiscountCodes(codes: List<DiscountCode>)

    @Query("SELECT * FROM discountcode WHERE discountcode_id = :id AND isactive='Y'")
    suspend fun getDiscountCodeById(id: Int): DiscountCode?

    @Query("SELECT * FROM discountcode WHERE isactive='Y'")
    suspend fun getAllDiscountCodes(): List<DiscountCode>
}
