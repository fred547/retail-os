package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.Order

@Dao
interface OrderDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrder(order: Order)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrders(orders: List<Order>)

    @Update
    suspend fun updateOrder(order: Order)

    @Query("SELECT * FROM orders WHERE documentNo = :documentNo")
    suspend fun getOrderByDocumentNo(documentNo: String): Order?

    @Query("SELECT * FROM orders")
    suspend fun getAllOrders(): List<Order>

    @Query("SELECT * FROM orders ORDER BY orderId DESC LIMIT 1")
    suspend fun getLastOrder(): Order?

    @Query("SELECT * FROM orders WHERE orderId = :orderId")
    suspend fun getOrderById(orderId: Int): Order?

    @Query("SELECT * FROM orders ORDER BY dateordered DESC")
    suspend fun getAllOrdersInDescendingOrder(): List<Order>

    @Query("SELECT * FROM orders WHERE uuid = :uuid")
    suspend fun getOrderByUuid(uuid: String): Order?

    @Query("SELECT * FROM orders WHERE isSync = 0")
    suspend fun getUnSyncedOrders(): List<Order>

    @Query("SELECT COUNT(*) FROM orders WHERE isSync = 0")
    suspend fun getUnSyncedOrderCount(): Int

    @Query("SELECT * FROM orders WHERE tillId = :tillId AND docStatus = 'CO'")
    suspend fun getOrdersByTillId(tillId: Int): List<Order>

    @Query("SELECT * FROM orders WHERE customerId = :customerId ORDER BY dateordered DESC")
    suspend fun getOrdersByCustomerId(customerId: Int): List<Order>

    @Query("SELECT COUNT(*) FROM orders WHERE customerId = :customerId")
    suspend fun getOrderCountForCustomer(customerId: Int): Int

    @Query("SELECT COUNT(*) FROM orders")
    suspend fun getOrderCount(): Int

    @Query("SELECT COALESCE(SUM(grandTotal), 0.0) FROM orders WHERE customerId = :customerId AND docStatus = 'CO'")
    suspend fun getTotalSpentByCustomer(customerId: Int): Double
}
