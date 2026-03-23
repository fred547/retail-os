package com.posterita.pos.android.worker

import android.content.Context
import android.util.Log
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.google.gson.Gson
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.remote.CloudSyncApi
import com.posterita.pos.android.service.CloudSyncService
import com.posterita.pos.android.service.SyncStatusManager
import com.posterita.pos.android.util.LocalAccountRegistry
import com.posterita.pos.android.util.SharedPreferencesManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * Background worker that syncs data between the local POS database and Posterita Cloud
 * every 5 minutes.
 *
 * On first run, auto-registers the account using the owner's email — no manual setup needed.
 * The account_id is permanent and never changes, even if the email is updated later.
 *
 * Strategy:
 * - Pushes: unsynced orders, order lines, payments, closed tills
 * - Pulls: products, categories, taxes, modifiers, customers, preferences, users
 * - Uses last_sync_at timestamp to only fetch changes since last sync
 * - Automatically retries with exponential backoff on failure
 */
class CloudSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "CloudSyncWorker"
        private const val WORK_NAME = "cloud_sync_work"
        private const val ONE_TIME_WORK_NAME = "cloud_sync_immediate"
        private const val REGISTERED_KEY = "cloud_account_registered"

        /**
         * Schedule periodic cloud sync every 5 minutes.
         */
        fun schedulePeriodicSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = PeriodicWorkRequestBuilder<CloudSyncWorker>(
                5, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                workRequest
            )

            Log.d(TAG, "Cloud sync scheduled (every 5 minutes)")
        }

        /**
         * Trigger an immediate one-time sync (e.g., after completing an order).
         */
        fun syncNow(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = OneTimeWorkRequestBuilder<CloudSyncWorker>()
                .setConstraints(constraints)
                .build()

            WorkManager.getInstance(context).enqueueUniqueWork(
                ONE_TIME_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                workRequest
            )

            Log.d(TAG, "Immediate cloud sync triggered")
        }

        /**
         * Cancel all cloud sync work.
         */
        fun cancelSync(context: Context) {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME)
            Log.d(TAG, "Cloud sync cancelled")
        }
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val prefsManager = SharedPreferencesManager(applicationContext)
            val activeAccountId = prefsManager.accountId

            if (activeAccountId.isEmpty() || activeAccountId == "null" || activeAccountId == "0") {
                Log.d(TAG, "No valid account configured (got '$activeAccountId'), skipping sync")
                return@withContext Result.success()
            }

            if (!prefsManager.cloudSyncEnabled) {
                Log.d(TAG, "Cloud sync disabled, skipping")
                return@withContext Result.success()
            }

            // Save active brand context to restore after multi-brand sync
            val savedStoreId = prefsManager.storeId
            val savedStoreName = prefsManager.storeName
            val savedTerminalId = prefsManager.terminalId
            val savedTerminalName = prefsManager.terminalName

            // Collect all brands to sync: active first, then others
            val accountRegistry = LocalAccountRegistry(applicationContext)
            val allBrands = accountRegistry.getAllAccounts()
            val brandIds = mutableListOf<String>()

            // Active brand always first
            brandIds.add(activeAccountId)
            // Add other brands (skip demo_account local demo, skip duplicates)
            for (brand in allBrands) {
                if (brand.id != activeAccountId && brand.id != "demo_account" && !brandIds.contains(brand.id)) {
                    brandIds.add(brand.id)
                }
            }

            Log.d(TAG, "Syncing ${brandIds.size} brand(s): ${brandIds.joinToString(", ")}")

            val cloudSyncUrl = prefsManager.cloudSyncUrl
            var anyFailed = false

            for ((index, accountId) in brandIds.withIndex()) {
                try {
                    val isActive = accountId == activeAccountId
                    if (isActive) {
                        SyncStatusManager.update(
                            SyncStatusManager.SyncState.CONNECTING,
                            "Syncing active brand..."
                        )
                    }

                    // Temporarily set accountId in prefs so CloudSyncService reads it
                    prefsManager.setAccountIdSync(accountId)
                    AppDatabase.resetInstance()
                    val db = AppDatabase.getInstance(applicationContext, accountId)

                    // Register if needed
                    val regKey = "${REGISTERED_KEY}_$accountId"
                    val isRegistered = prefsManager.getString(regKey) == "true"
                    if (!isRegistered) {
                        if (isActive) {
                            SyncStatusManager.update(
                                SyncStatusManager.SyncState.REGISTERING,
                                "Registering account with cloud..."
                            )
                        }
                        val registered = registerAccount(db, prefsManager, cloudSyncUrl)
                        if (registered) {
                            prefsManager.setString(regKey, "true")
                        } else {
                            Log.w(TAG, "Registration failed for $accountId, skipping")
                            continue
                        }
                    }

                    val cloudSyncApi = createCloudSyncApi(cloudSyncUrl)
                    val syncService = CloudSyncService(db, prefsManager)
                    val result = syncService.performSync(cloudSyncApi)

                    result.fold(
                        onSuccess = { stats ->
                            Log.d(TAG, "Sync [$accountId]: $stats")
                        },
                        onFailure = { error ->
                            Log.e(TAG, "Sync [$accountId] failed: ${error.message}")
                            if (isActive) anyFailed = true
                        }
                    )

                    // Register sibling brands from sync response
                    syncService.lastSiblingBrands?.let { brands ->
                        for (brand in brands) {
                            val brandId = brand["account_id"]?.toString() ?: continue
                            val brandName = brand["businessname"]?.toString() ?: "Brand"
                            val brandType = brand["type"]?.toString() ?: "live"
                            val brandStatus = brand["status"]?.toString() ?: "active"
                            if (!accountRegistry.getAllAccounts().any { it.id == brandId }) {
                                accountRegistry.addAccount(
                                    id = brandId, name = brandName, storeName = brandName,
                                    ownerEmail = prefsManager.email, ownerPhone = "",
                                    type = brandType, status = brandStatus
                                )
                                Log.d(TAG, "Registered sibling brand: $brandName ($brandId)")
                                // Add to sync list if not already there
                                if (!brandIds.contains(brandId)) {
                                    brandIds.add(brandId)
                                }
                            }
                        }
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Sync [$accountId] exception: ${e.message}")
                    if (accountId == activeAccountId) anyFailed = true
                }
            }

            // Restore active account in prefs and DB singleton
            prefsManager.setAccountIdSync(activeAccountId)
            prefsManager.setStoreIdSync(savedStoreId)
            prefsManager.setStoreNameSync(savedStoreName)
            prefsManager.setTerminalIdSync(savedTerminalId)
            prefsManager.setTerminalNameSync(savedTerminalName)
            AppDatabase.resetInstance()
            AppDatabase.getInstance(applicationContext, activeAccountId)

            if (anyFailed) {
                if (runAttemptCount < 3) Result.retry() else Result.failure()
            } else {
                Result.success()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Cloud sync worker failed", e)
            if (runAttemptCount < 3) Result.retry() else Result.failure()
        }
    }

    /**
     * Auto-registers the account with the cloud on first sync.
     * Sends the account info, stores, terminals, and users so the cloud
     * has all the context it needs. Uses the owner's email as the key.
     */
    private suspend fun registerAccount(
        db: AppDatabase,
        prefsManager: SharedPreferencesManager,
        cloudSyncUrl: String
    ): Boolean {
        return try {
            val accountId = prefsManager.accountId
            val email = prefsManager.email
            val accounts = db.accountDao().getAllAccounts()
            val account = accounts.firstOrNull()
            val stores = db.storeDao().getAllStores()
            val terminals = db.terminalDao().getAllTerminals()
            val users = db.userDao().getAllUsers()

            val categories = db.productCategoryDao().getAllProductCategoriesSync()
            val products = db.productDao().getAllProductsSync()
            val taxes = db.taxDao().getAllTaxesSync()

            val payload = mapOf(
                "account_id" to accountId,
                "email" to email,
                "businessname" to (account?.businessname ?: prefsManager.storeName),
                "currency" to (account?.currency ?: ""),
                "stores" to stores.map { store ->
                    mapOf(
                        "store_id" to store.storeId,
                        "name" to store.name,
                        "address" to store.address,
                        "city" to store.city,
                        "state" to store.state,
                        "zip" to store.zip,
                        "country" to store.country,
                        "currency" to store.currency
                    )
                },
                "terminals" to terminals.map { terminal ->
                    mapOf(
                        "terminal_id" to terminal.terminalId,
                        "store_id" to terminal.store_id,
                        "name" to terminal.name,
                        "prefix" to terminal.prefix,
                        "sequence" to terminal.sequence,
                        "cash_up_sequence" to terminal.cash_up_sequence
                    )
                },
                "users" to users.map { user ->
                    mapOf(
                        "user_id" to user.user_id,
                        "username" to user.username,
                        "firstname" to user.firstname,
                        "lastname" to user.lastname,
                        "email" to user.email,
                        "pin" to user.pin,
                        "role" to user.role,
                        "isadmin" to user.isadmin,
                        "issalesrep" to user.issalesrep,
                        "permissions" to user.permissions,
                        "discountlimit" to user.discountlimit,
                        "isactive" to user.isactive
                    )
                },
                "categories" to categories.map { cat ->
                    mapOf(
                        "productcategory_id" to cat.productcategory_id,
                        "name" to cat.name,
                        "isactive" to cat.isactive,
                        "display" to cat.display,
                        "position" to cat.position,
                        "tax_id" to cat.tax_id
                    )
                },
                "products" to products.map { product ->
                    mapOf(
                        "product_id" to product.product_id,
                        "name" to product.name,
                        "description" to product.description,
                        "sellingprice" to product.sellingprice,
                        "costprice" to product.costprice,
                        "taxamount" to product.taxamount,
                        "tax_id" to product.tax_id,
                        "productcategory_id" to product.productcategory_id,
                        "image" to product.image,
                        "upc" to product.upc,
                        "itemcode" to product.itemcode,
                        "barcodetype" to product.barcodetype,
                        "isactive" to product.isactive,
                        "istaxincluded" to product.istaxincluded,
                        "isstock" to product.isstock,
                        "isvariableitem" to product.isvariableitem,
                        "iskitchenitem" to product.iskitchenitem,
                        "ismodifier" to product.ismodifier,
                        "isfavourite" to product.isfavourite
                    )
                },
                "taxes" to taxes.map { tax ->
                    mapOf(
                        "tax_id" to tax.tax_id,
                        "name" to tax.name,
                        "rate" to tax.rate,
                        "taxcode" to tax.taxcode,
                        "isactive" to tax.isactive
                    )
                }
            )

            val url = "${cloudSyncUrl.trimEnd('/')}/sync/register"
            val json = Gson().toJson(payload)
            val body = json.toRequestBody("application/json".toMediaType())

            val client = OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build()

            val syncSecret = prefsManager.syncSecret
            val requestBuilder = Request.Builder()
                .url(url)
                .post(body)

            // Add HMAC auth headers if sync secret is available
            if (syncSecret.isNotEmpty() && accountId.isNotEmpty()) {
                val timestamp = (System.currentTimeMillis() / 1000).toString()
                val signature = computeHmacSha256(syncSecret, "$accountId:$timestamp")
                requestBuilder.addHeader("X-Sync-Timestamp", timestamp)
                requestBuilder.addHeader("X-Sync-Signature", signature)
            }

            val request = requestBuilder.build()

            val response = client.newCall(request).execute()
            val responseBody = response.body?.string()

            if (response.isSuccessful) {
                Log.d(TAG, "Registration response: $responseBody")
                true
            } else {
                Log.e(TAG, "Registration failed (${response.code}): $responseBody")
                false
            }
        } catch (e: Exception) {
            Log.e(TAG, "Registration error", e)
            false
        }
    }

    /**
     * Computes HMAC-SHA256 of the given message using the provided secret.
     * Returns the hex-encoded signature string.
     */
    private fun computeHmacSha256(secret: String, message: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return mac.doFinal(message.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
    }

    private fun createCloudSyncApi(baseUrl: String): CloudSyncApi {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val prefsManager = SharedPreferencesManager(applicationContext)
        val syncSecret = prefsManager.syncSecret
        val accountId = prefsManager.accountId

        val clientBuilder = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)

        // Add HMAC signing interceptor if sync secret is available
        if (syncSecret.isNotEmpty() && accountId.isNotEmpty()) {
            clientBuilder.addInterceptor { chain ->
                val timestamp = (System.currentTimeMillis() / 1000).toString()
                val signature = computeHmacSha256(syncSecret, "$accountId:$timestamp")
                val signedRequest = chain.request().newBuilder()
                    .addHeader("X-Sync-Timestamp", timestamp)
                    .addHeader("X-Sync-Signature", signature)
                    .build()
                chain.proceed(signedRequest)
            }
        }

        val client = clientBuilder.build()

        val url = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"

        return Retrofit.Builder()
            .baseUrl(url)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(CloudSyncApi::class.java)
    }
}
