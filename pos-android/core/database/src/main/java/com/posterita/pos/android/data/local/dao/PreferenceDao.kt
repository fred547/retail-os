package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.Preference

@Dao
interface PreferenceDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPreferences(preferences: List<Preference>)

    @Query("SELECT * FROM preference WHERE preference_id = :id")
    suspend fun getPreferenceById(id: Int): Preference?

    @Query("SELECT * FROM preference")
    suspend fun getAllPreferences(): List<Preference>
}
