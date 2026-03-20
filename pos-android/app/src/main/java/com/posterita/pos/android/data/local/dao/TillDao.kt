package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.Till

@Dao
interface TillDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTill(till: Till)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertTills(tills: List<Till>)

    @Update
    suspend fun updateTill(till: Till)

    @Query("SELECT * FROM till WHERE tillId = :tillId")
    suspend fun getTillById(tillId: Int): Till?

    @Query("SELECT * FROM till WHERE uuid = :uuid")
    suspend fun getTillByUUID(uuid: String): Till?

    @Query("SELECT * FROM till")
    suspend fun getAllTills(): List<Till>

    @Query("SELECT * FROM till WHERE terminal_id = :terminalId AND dateClosed IS NULL")
    suspend fun getOpenTillByTerminalId(terminalId: Int): Till?

    @Query("SELECT * FROM till WHERE terminal_id = :terminalId AND dateClosed IS NOT NULL")
    suspend fun getClosedTillByTerminalId(terminalId: Int): List<Till>

    @Query("SELECT COUNT(*) FROM till WHERE isSync = 0 AND terminal_id = :terminalId AND dateClosed IS NOT NULL")
    suspend fun getUnSyncedClosedTillCount(terminalId: Int): Int
}
