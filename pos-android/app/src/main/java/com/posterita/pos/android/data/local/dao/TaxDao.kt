package com.posterita.pos.android.data.local.dao

import androidx.lifecycle.LiveData
import androidx.room.*
import com.posterita.pos.android.data.local.entity.Tax

@Dao
interface TaxDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTaxes(taxes: List<Tax>)

    @Query("SELECT * FROM tax WHERE tax_id = :taxId AND isactive='Y'")
    fun getTaxById(taxId: Int): LiveData<Tax?>

    @Query("SELECT * FROM tax WHERE tax_id = :taxId AND isactive='Y'")
    suspend fun getTaxByIdSync(taxId: Int): Tax?

    @Query("SELECT * FROM tax WHERE isactive='Y'")
    fun getAllTaxes(): LiveData<List<Tax>>

    @Query("SELECT * FROM tax WHERE isactive='Y'")
    suspend fun getAllTaxesSync(): List<Tax>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTax(tax: Tax): Long

    @Update
    suspend fun updateTax(tax: Tax)

    @Delete
    suspend fun deleteTax(tax: Tax)

    @Query("SELECT MAX(tax_id) FROM tax")
    suspend fun getMaxTaxId(): Int?
}
