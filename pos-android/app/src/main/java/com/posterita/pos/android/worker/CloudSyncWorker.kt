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
            val accountId = prefsManager.accountId

            if (accountId.isEmpty()) {
                Log.d(TAG, "No account configured, skipping sync")
                return@withContext Result.success()
            }

            if (!prefsManager.cloudSyncEnabled) {
                Log.d(TAG, "Cloud sync disabled, skipping")
                return@withContext Result.success()
            }

            val cloudSyncUrl = prefsManager.cloudSyncUrl
            val db = AppDatabase.getInstance(applicationContext, accountId)

            val isRegistered = prefsManager.getString(REGISTERED_KEY) == "true"
            if (!isRegistered) {
                SyncStatusManager.update(
                    SyncStatusManager.SyncState.REGISTERING,
                    "Registering account with cloud..."
                )
                val registered = registerAccount(db, prefsManager, cloudSyncUrl)
                if (!registered) {
                    Log.w(TAG, "Account registration failed, will retry next cycle")
                    SyncStatusManager.error("Account registration failed")
                    return@withContext if (runAttemptCount < 3) Result.retry() else Result.failure()
                }
                prefsManager.setString(REGISTERED_KEY, "true")
                Log.d(TAG, "Account registered with cloud successfully")
            }

            val cloudSyncApi = createCloudSyncApi(cloudSyncUrl)
            val syncService = CloudSyncService(db, prefsManager)
            val result = syncService.performSync(cloudSyncApi)

            result.fold(
                onSuccess = { stats ->
                    Log.d(TAG, "Cloud sync successful: $stats")
                    Result.success()
                },
                onFailure = { error ->
                    Log.e(TAG, "Cloud sync failed: ${error.message}")
                    if (runAttemptCount < 3) Result.retry() else Result.failure()
                }
            )
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
                "currency" to (account?.currency ?: "MUR"),
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

            val request = Request.Builder()
                .url(url)
                .post(body)
                .build()

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

    private fun createCloudSyncApi(baseUrl: String): CloudSyncApi {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .build()

        val url = if (baseUrl.endsWith("/")) baseUrl else "$baseUrl/"

        return Retrofit.Builder()
            .baseUrl(url)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(CloudSyncApi::class.java)
    }
}
