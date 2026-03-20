package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.Terminal

@Dao
interface TerminalDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTerminals(terminals: List<Terminal>)

    @Query("SELECT * FROM terminal WHERE isactive='Y'")
    suspend fun getAllTerminals(): List<Terminal>

    @Query("SELECT * FROM terminal WHERE store_id = :storeId AND isactive='Y'")
    suspend fun getTerminalsForStore(storeId: Int): List<Terminal>

    @Query("SELECT * FROM terminal WHERE terminalid = :terminalId AND isactive='Y'")
    suspend fun getTerminalById(terminalId: Int): Terminal?

    @Update
    suspend fun updateTerminal(terminal: Terminal)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTerminal(terminal: Terminal): Long

    @Delete
    suspend fun deleteTerminal(terminal: Terminal)

    @Query("SELECT MAX(terminalid) FROM terminal")
    suspend fun getMaxTerminalId(): Int?
}
