package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.OrderLine

@Dao
interface OrderLineDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrderLines(orderLines: List<OrderLine>)

    @Query("SELECT * FROM orderline WHERE order_id = :orderId")
    suspend fun getOrderLinesByOrderId(orderId: Int): List<OrderLine>

    @Query("SELECT * FROM orderline")
    suspend fun getAllOrderLines(): List<OrderLine>
}
