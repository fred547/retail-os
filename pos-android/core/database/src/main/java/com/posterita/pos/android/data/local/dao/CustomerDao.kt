package com.posterita.pos.android.data.local.dao

import androidx.lifecycle.LiveData
import androidx.room.*
import com.posterita.pos.android.data.local.entity.Customer

@Dao
interface CustomerDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertCustomers(customers: List<Customer>)

    @Query("SELECT * FROM customer WHERE customer_id = :customerId AND isactive='Y'")
    fun getCustomerById(customerId: Int): LiveData<Customer?>

    @Query("SELECT * FROM customer WHERE isactive='Y'")
    fun getAllCustomers(): LiveData<List<Customer>>

    @Query("SELECT * FROM customer WHERE isactive='Y'")
    suspend fun getAllCustomersSync(): List<Customer>

    @Query("SELECT * FROM customer WHERE (name LIKE :query OR identifier LIKE :query) AND isactive='Y'")
    suspend fun searchCustomersByName(query: String): List<Customer>

    @Query("SELECT * FROM customer WHERE (phone1 LIKE :phone OR phone2 LIKE :phone OR mobile LIKE :phone OR name LIKE :phone) AND isactive='Y'")
    suspend fun searchCustomersByPhone(phone: String): List<Customer>
}
