package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.Sequence

@Dao
interface SequenceDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSequence(sequence: Sequence)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertSequences(sequences: List<Sequence>)

    @Query("SELECT * FROM sequence")
    suspend fun getAllSequences(): List<Sequence>

    @Query("SELECT * FROM sequence WHERE name = :name")
    suspend fun getSequenceByName(name: String): Sequence?

    @Query("SELECT * FROM sequence WHERE name = :name AND terminal_id = :terminalId")
    suspend fun getSequenceByNameForTerminal(name: String, terminalId: Int): Sequence?

    @Update
    suspend fun updateSequence(sequence: Sequence)
}
