package com.posterita.pos.android.worker

import android.content.Context
import android.util.Log
import androidx.work.*
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.remote.ApiService
import com.posterita.pos.android.util.SharedPreferencesManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.converter.scalars.ScalarsConverterFactory
import java.util.concurrent.TimeUnit

class OrderSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "OrderSyncWorker"
        private const val WORK_NAME = "order_sync_work"

        fun scheduleSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = PeriodicWorkRequestBuilder<OrderSyncWorker>(
                15, TimeUnit.MINUTES
            )
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build()

            WorkManager.getInstance(context).enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.REPLACE,
                workRequest
            )
        }
    }

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        try {
            val prefsManager = SharedPreferencesManager(applicationContext)
            val accountId = prefsManager.accountId
            if (accountId.isEmpty()) return@withContext Result.failure()

            // Skip for cloud/standalone accounts — handled by CloudSyncWorker
            val baseUrl = prefsManager.baseUrl
            if (baseUrl.contains("posterita-cloud") || baseUrl.contains("web.posterita") || accountId.startsWith("standalone") || accountId == "null") {
                return@withContext Result.success()
            }

            val db = AppDatabase.getInstance(applicationContext, accountId)
            val unSyncedOrders = db.orderDao().getUnSyncedOrders()

            if (unSyncedOrders.isEmpty()) return@withContext Result.success()

            val jsonArray = JSONArray()
            for (order in unSyncedOrders) {
                order.json?.let { jsonArray.put(it) }
            }

            val syncUrl = baseUrl.let { if (it.endsWith("/")) it else "$it/" }
            val retrofit = Retrofit.Builder()
                .baseUrl(syncUrl)
                .addConverterFactory(ScalarsConverterFactory.create())
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            val apiService = retrofit.create(ApiService::class.java)

            val response = apiService.syncOrder(accountId, jsonArray.toString())
            if (response.isSuccessful) {
                val items = response.body() ?: emptyList()
                for (item in items) {
                    val order = unSyncedOrders.find { it.uuid == item.uuid }
                    if (order != null) {
                        db.orderDao().updateOrder(order.copy(isSync = true))
                    }
                }
                Log.d(TAG, "Synced ${items.size} orders")
            }

            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Order sync failed", e)
            Result.retry()
        }
    }
}
