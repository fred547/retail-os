package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.TagGroup

@Dao
interface TagGroupDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(groups: List<TagGroup>)

    @Query("SELECT * FROM tag_group WHERE account_id = :accountId AND is_deleted = 0 AND is_active = 1 ORDER BY name")
    suspend fun getActiveGroups(accountId: String): List<TagGroup>

    @Query("DELETE FROM tag_group WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
