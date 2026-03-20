package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.HoldOrder

@Dao
interface HoldOrderDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertHoldOrder(holdOrder: HoldOrder): Long

    @Query("SELECT * FROM hold_orders WHERE terminalId = :terminalId")
    suspend fun getHoldOrdersByTerminal(terminalId: Int): List<HoldOrder>

    @Query("SELECT * FROM hold_orders")
    suspend fun getAllHoldOrders(): List<HoldOrder>

    @Delete
    suspend fun deleteHoldOrder(holdOrder: HoldOrder)

    @Query("DELETE FROM hold_orders WHERE holdOrderId = :id")
    suspend fun deleteHoldOrderById(id: Int)
}
