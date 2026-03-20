package com.posterita.pos.android.util

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

data class OwnerAccountSnapshot(
    val accountId: String,
    val businessName: String,
    val ownerEmail: String,
    val ownerPhone: String,
    val type: String,
    val status: String,
    val createdAt: Long
)

@Singleton
class OwnerAccountCloudService @Inject constructor(
    private val prefsManager: SharedPreferencesManager
) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()

    suspend fun listOwnerAccounts(
        ownerPhone: String,
        ownerEmail: String
    ): Result<List<OwnerAccountSnapshot>> = withContext(Dispatchers.IO) {
        runCatching {
            if (ownerPhone.isBlank() && ownerEmail.isBlank()) return@runCatching emptyList()
            val query = buildList {
                if (ownerPhone.isNotBlank()) add("phone=${encode(ownerPhone)}")
                if (ownerEmail.isNotBlank()) add("email=${encode(ownerEmail)}")
            }.joinToString("&")
            val url = apiUrl("owner/accounts?$query")
            val request = Request.Builder().url(url).get().build()
            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    throw IllegalStateException("Could not load accounts (${response.code})")
                }
                val body = response.body?.string().orEmpty()
                val json = JSONObject(body)
                val accounts = json.optJSONArray("accounts") ?: JSONArray()
                parseAccounts(accounts)
            }
        }
    }

    suspend fun updateAccount(
        ownerPhone: String,
        ownerEmail: String,
        accountId: String,
        businessName: String,
        type: String,
        status: String
    ): Result<OwnerAccountSnapshot> = withContext(Dispatchers.IO) {
        runCatching {
            val payload = JSONObject()
                .put("phone", ownerPhone)
                .put("email", ownerEmail)
                .put("businessname", businessName)
                .put("type", type)
                .put("status", status)

            val request = Request.Builder()
                .url(apiUrl("owner/accounts/${encode(accountId)}"))
                .patch(payload.toString().toRequestBody(JSON_MEDIA_TYPE))
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    throw IllegalStateException("Could not update account (${response.code})")
                }
                val body = JSONObject(response.body?.string().orEmpty())
                parseAccount(body.getJSONObject("account"))
            }
        }
    }

    suspend fun deleteAccount(
        ownerPhone: String,
        ownerEmail: String,
        accountId: String,
        verificationPhone: String = "",
        ownerPin: String = ""
    ): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val payload = JSONObject()
                .put("phone", ownerPhone)
                .put("email", ownerEmail)
                .put("verification_phone", verificationPhone)
                .put("owner_pin", ownerPin)

            val request = Request.Builder()
                .url(apiUrl("owner/accounts/${encode(accountId)}"))
                .method("DELETE", payload.toString().toRequestBody(JSON_MEDIA_TYPE))
                .build()

            client.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    throw IllegalStateException("Could not delete account (${response.code})")
                }
            }
        }
    }

    private fun apiUrl(path: String): String {
        val base = prefsManager.cloudSyncUrl.trim().trimEnd('/')
        return "$base/$path"
    }

    private fun parseAccounts(array: JSONArray): List<OwnerAccountSnapshot> {
        return buildList {
            for (index in 0 until array.length()) {
                add(parseAccount(array.getJSONObject(index)))
            }
        }
    }

    private fun parseAccount(json: JSONObject): OwnerAccountSnapshot {
        return OwnerAccountSnapshot(
            accountId = json.optString("account_id"),
            businessName = json.optString("businessname"),
            ownerEmail = json.optString("owner_email"),
            ownerPhone = json.optString("owner_phone"),
            type = json.optString("type", "trial"),
            status = json.optString("status", "draft"),
            createdAt = json.optLong("created_at_ms", System.currentTimeMillis())
        )
    }

    private fun encode(value: String): String {
        return URLEncoder.encode(value, Charsets.UTF_8.name())
    }

    private companion object {
        val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
    }
}
