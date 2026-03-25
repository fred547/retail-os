package com.posterita.pos.android.data.local.dao

import androidx.room.Dao
import androidx.room.Delete
import androidx.room.Insert
import androidx.room.Query
import com.posterita.pos.android.data.local.entity.PendingConsentUpdate

@Dao
interface PendingConsentUpdateDao {

    @Insert
    suspend fun insert(consent: PendingConsentUpdate)

    @Query("SELECT * FROM pending_consent_update ORDER BY createdAt ASC")
    suspend fun getAll(): List<PendingConsentUpdate>

    @Delete
    suspend fun delete(consent: PendingConsentUpdate)
}
