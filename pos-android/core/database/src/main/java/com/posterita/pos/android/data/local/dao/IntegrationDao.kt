package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.Integration

@Dao
interface IntegrationDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertIntegrations(integrations: List<Integration>)

    @Query("SELECT * FROM integration WHERE integration_id = :id AND isactive='Y'")
    suspend fun getIntegrationById(id: Int): Integration?

    @Query("SELECT * FROM integration WHERE isactive='Y'")
    suspend fun getAllIntegrations(): List<Integration>

    @Query("SELECT * FROM integration WHERE name = :name AND isactive='Y' LIMIT 1")
    suspend fun getIntegrationByName(name: String): Integration?
}
