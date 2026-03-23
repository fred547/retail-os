package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.TableSection

@Dao
interface TableSectionDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(sections: List<TableSection>)

    @Query("SELECT * FROM table_section WHERE store_id = :storeId AND is_active = 1 ORDER BY display_order")
    suspend fun getSectionsByStore(storeId: Int): List<TableSection>

    @Query("SELECT * FROM table_section WHERE section_id = :sectionId")
    suspend fun getSectionById(sectionId: Int): TableSection?

    @Query("DELETE FROM table_section WHERE account_id = :accountId")
    suspend fun deleteByAccount(accountId: String)
}
