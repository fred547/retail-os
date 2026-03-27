package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.Tag

@Dao
interface TagDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(tags: List<Tag>)

    @Query("SELECT * FROM tag WHERE account_id = :accountId AND is_deleted = 0 AND is_active = 1 ORDER BY position")
    suspend fun getAllActiveTags(accountId: String): List<Tag>

    @Query("SELECT * FROM tag WHERE account_id = :accountId AND tag_group_id = :groupId AND is_deleted = 0 AND is_active = 1 ORDER BY position")
    suspend fun getActiveTagsByGroup(accountId: String, groupId: Int): List<Tag>

    @Query("DELETE FROM tag WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
