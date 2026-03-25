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

    @Query("SELECT COALESCE(SUM(ol.qtyentered), 0) FROM orderline ol INNER JOIN orders o ON ol.order_id = o.orderId WHERE ol.product_id = :productId AND o.dateOrdered >= :sinceDate AND o.docStatus = 'CO'")
    suspend fun getQtySoldSince(productId: Int, sinceDate: String): Double
}
