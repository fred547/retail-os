package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.Quotation

@Dao
interface QuotationDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(quotations: List<Quotation>)

    @Query("SELECT * FROM quotation WHERE account_id = :accountId AND is_deleted = 0 ORDER BY created_at DESC")
    suspend fun getAll(accountId: String): List<Quotation>

    @Query("SELECT * FROM quotation WHERE account_id = :accountId AND status = :status AND is_deleted = 0 ORDER BY created_at DESC")
    suspend fun getByStatus(accountId: String, status: String): List<Quotation>

    @Query("SELECT * FROM quotation WHERE quotation_id = :id")
    suspend fun getById(id: Int): Quotation?

    @Query("DELETE FROM quotation WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
