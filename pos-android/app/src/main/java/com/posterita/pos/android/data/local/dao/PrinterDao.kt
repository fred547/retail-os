package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.Printer

@Dao
interface PrinterDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPrinter(printer: Printer)

    @Query("SELECT * FROM printer WHERE printer_id = :printerId")
    suspend fun getPrinterById(printerId: Int): Printer?

    @Query("SELECT * FROM printer")
    suspend fun getAllPrinters(): List<Printer>

    @Query("SELECT * FROM printer WHERE name = :name LIMIT 1")
    suspend fun getPrinterByName(name: String): Printer?

    @Query("DELETE FROM printer WHERE printer_id = :printerId")
    suspend fun deletePrinter(printerId: Int)
}
