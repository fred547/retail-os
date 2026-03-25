package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.Payment

@Dao
interface PaymentDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPayment(payment: Payment)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPayments(payments: List<Payment>)

    @Query("SELECT * FROM payment WHERE orderId = :orderId")
    suspend fun getPaymentsByOrderId(orderId: Int): List<Payment>

    @Query("SELECT * FROM payment WHERE paymentId = :paymentId")
    suspend fun getPaymentById(paymentId: Int): Payment?

    @Query("SELECT * FROM payment")
    suspend fun getAllPayments(): List<Payment>
}
