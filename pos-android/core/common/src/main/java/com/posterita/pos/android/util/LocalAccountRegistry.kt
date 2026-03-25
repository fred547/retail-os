package com.posterita.pos.android.util

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import org.json.JSONArray
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

data class AccountEntry(
    val id: String,
    val name: String,
    val storeName: String,
    val createdAt: Long,
    val ownerEmail: String = "",
    val ownerPhone: String = "",
    val type: String = "trial",
    val status: String = "draft",
    val lastOpenedAt: Long = createdAt
)

@Singleton
class LocalAccountRegistry @Inject constructor(
    @ApplicationContext context: Context
) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("posterita_accounts_registry", Context.MODE_PRIVATE)

    private val KEY_ACCOUNTS = "accounts"

    fun addAccount(
        id: String,
        name: String,
        storeName: String,
        ownerEmail: String = "",
        ownerPhone: String = "",
        type: String = "trial",
        status: String = "draft"
    ) {
        val accounts = getAllAccountsInternal().toMutableList()
        val now = System.currentTimeMillis()
        val existing = accounts.firstOrNull { it.id == id }
        accounts.removeAll { it.id == id }
        accounts.add(
            AccountEntry(
                id = id,
                name = name,
                storeName = storeName,
                createdAt = existing?.createdAt ?: now,
                ownerEmail = ownerEmail.ifBlank { existing?.ownerEmail.orEmpty() },
                ownerPhone = ownerPhone.ifBlank { existing?.ownerPhone.orEmpty() },
                type = type.ifBlank { existing?.type ?: "trial" },
                status = status.ifBlank { existing?.status ?: "draft" },
                lastOpenedAt = existing?.lastOpenedAt ?: now
            )
        )
        saveAccounts(accounts)
    }

    fun getAllAccounts(): List<AccountEntry> {
        return getAllAccountsInternal().sortedWith(
            compareByDescending<AccountEntry> { it.lastOpenedAt }
                .thenByDescending { it.createdAt }
        )
    }

    fun getAccount(id: String): AccountEntry? {
        return getAllAccountsInternal().firstOrNull { it.id == id }
    }

    fun updateStatus(id: String, status: String) {
        updateAccount(id) { entry -> entry.copy(status = status) }
    }

    fun updateStoreName(id: String, storeName: String) {
        updateAccount(id) { entry ->
            entry.copy(
                storeName = storeName,
                name = if (entry.name == entry.storeName) storeName else entry.name
            )
        }
    }

    fun touchAccount(id: String) {
        updateAccount(id) { entry -> entry.copy(lastOpenedAt = System.currentTimeMillis()) }
    }

    fun updateOwnerEmail(id: String, ownerEmail: String) {
        if (ownerEmail.isBlank()) return
        updateAccount(id) { entry -> entry.copy(ownerEmail = ownerEmail) }
    }

    fun updateOwnerPhone(id: String, ownerPhone: String) {
        if (ownerPhone.isBlank()) return
        updateAccount(id) { entry -> entry.copy(ownerPhone = ownerPhone) }
    }

    fun removeAccount(id: String) {
        val accounts = getAllAccountsInternal().toMutableList()
        accounts.removeAll { it.id == id }
        saveAccounts(accounts)
    }

    fun getAccountCount(): Int {
        return getAllAccountsInternal().size
    }

    private fun getAllAccountsInternal(): List<AccountEntry> {
        val json = prefs.getString(KEY_ACCOUNTS, null) ?: return emptyList()
        return try {
            val array = JSONArray(json)
            (0 until array.length()).map { i ->
                val obj = array.getJSONObject(i)
                AccountEntry(
                    id = obj.getString("id"),
                    name = obj.getString("name"),
                    storeName = obj.getString("storeName"),
                    createdAt = obj.optLong("createdAt", System.currentTimeMillis()),
                    ownerEmail = obj.optString("ownerEmail"),
                    ownerPhone = obj.optString("ownerPhone"),
                    type = obj.optString("type", "trial"),
                    status = obj.optString("status", "draft"),
                    lastOpenedAt = obj.optLong("lastOpenedAt", obj.optLong("createdAt", System.currentTimeMillis()))
                )
            }
        } catch (e: Exception) {
            emptyList()
        }
    }

    private fun saveAccounts(accounts: List<AccountEntry>) {
        val array = JSONArray()
        for (account in accounts) {
            val obj = JSONObject()
            obj.put("id", account.id)
            obj.put("name", account.name)
            obj.put("storeName", account.storeName)
            obj.put("createdAt", account.createdAt)
            obj.put("ownerEmail", account.ownerEmail)
            obj.put("ownerPhone", account.ownerPhone)
            obj.put("type", account.type)
            obj.put("status", account.status)
            obj.put("lastOpenedAt", account.lastOpenedAt)
            array.put(obj)
        }
        prefs.edit().putString(KEY_ACCOUNTS, array.toString()).commit()
    }

    private fun updateAccount(id: String, transform: (AccountEntry) -> AccountEntry) {
        val accounts = getAllAccountsInternal().toMutableList()
        val index = accounts.indexOfFirst { it.id == id }
        if (index == -1) return
        accounts[index] = transform(accounts[index])
        saveAccounts(accounts)
    }
}
