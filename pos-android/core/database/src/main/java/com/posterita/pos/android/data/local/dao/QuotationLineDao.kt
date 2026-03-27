package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.QuotationLine

@Dao
interface QuotationLineDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(lines: List<QuotationLine>)

    @Query("SELECT * FROM quotation_line WHERE quotation_id = :quotationId ORDER BY position")
    suspend fun getByQuotationId(quotationId: Int): List<QuotationLine>

    @Query("DELETE FROM quotation_line WHERE quotation_id IN (SELECT quotation_id FROM quotation WHERE account_id = :accountId)")
    suspend fun deleteByAccount(accountId: String)
}
