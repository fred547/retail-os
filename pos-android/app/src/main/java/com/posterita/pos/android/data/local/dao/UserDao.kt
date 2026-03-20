package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.User

@Dao
interface UserDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUsers(users: List<User>)

    @Query("SELECT * FROM user WHERE user_id = :userId AND isactive='Y'")
    suspend fun getUserById(userId: Int): User?

    @Query("SELECT * FROM user WHERE isactive='Y'")
    suspend fun getAllUsers(): List<User>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertUser(user: User): Long

    @Update
    suspend fun updateUser(user: User)

    @Delete
    suspend fun deleteUser(user: User)

    @Query("SELECT MAX(user_id) FROM user")
    suspend fun getMaxUserId(): Int?

    @Query("SELECT * FROM user WHERE pin = :pin")
    suspend fun getUserByPin(pin: String): User?

    @Query("SELECT * FROM user WHERE role = 'owner' LIMIT 1")
    suspend fun getOwner(): User?
}
