package com.posterita.pos.android.data.local.dao

import androidx.room.*
import com.posterita.pos.android.data.local.entity.Account

@Dao
interface AccountDao {
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAccounts(accounts: List<Account>)

    @Query("SELECT * FROM account WHERE account_id = :accountId")
    suspend fun getAccountById(accountId: String): Account?

    @Query("SELECT * FROM account")
    suspend fun getAllAccounts(): List<Account>
}
