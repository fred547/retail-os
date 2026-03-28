package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.RosterTemplateSlot

@Dao
interface RosterTemplateSlotDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(slots: List<RosterTemplateSlot>)

    @Query("SELECT * FROM roster_template_slot WHERE account_id = :accountId AND store_id = :storeId AND is_deleted = 0 ORDER BY day_of_week, start_time")
    suspend fun getByStore(accountId: String, storeId: Int): List<RosterTemplateSlot>

    @Query("SELECT * FROM roster_template_slot WHERE account_id = :accountId AND is_deleted = 0 ORDER BY day_of_week, start_time")
    suspend fun getAll(accountId: String): List<RosterTemplateSlot>

    @Query("DELETE FROM roster_template_slot WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
