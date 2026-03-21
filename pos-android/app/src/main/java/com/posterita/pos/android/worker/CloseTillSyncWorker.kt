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

class CloseTillSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "CloseTillSyncWorker"
        private const val WORK_NAME = "close_till_sync_work"

        fun scheduleSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = PeriodicWorkRequestBuilder<CloseTillSyncWorker>(
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
            val terminalId = prefsManager.terminalId
            if (accountId.isEmpty() || terminalId == 0) return@withContext Result.failure()

            // Skip for cloud/standalone accounts — handled by CloudSyncWorker
            val baseUrl = prefsManager.baseUrl
            if (baseUrl.contains("posterita-cloud") || baseUrl.contains("web.posterita") || accountId.startsWith("standalone") || accountId == "null") {
                return@withContext Result.success()
            }

            val db = AppDatabase.getInstance(applicationContext, accountId)
            val closedTills = db.tillDao().getClosedTillByTerminalId(terminalId)
            val unSyncedTills = closedTills.filter { !it.isSync }

            if (unSyncedTills.isEmpty()) return@withContext Result.success()

            val jsonArray = JSONArray()
            for (till in unSyncedTills) {
                till.json?.let { jsonArray.put(it) }
            }

            val syncUrl = baseUrl.let { if (it.endsWith("/")) it else "$it/" }
            val retrofit = Retrofit.Builder()
                .baseUrl(syncUrl)
                .addConverterFactory(ScalarsConverterFactory.create())
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            val apiService = retrofit.create(ApiService::class.java)

            val response = apiService.syncTill(accountId, jsonArray.toString())
            if (response.isSuccessful) {
                val items = response.body() ?: emptyList()
                for (item in items) {
                    val till = unSyncedTills.find { it.uuid == item.uuid }
                    if (till != null) {
                        if (item.status == "OK" || item.status == "SUCCESS") {
                            db.tillDao().updateTill(till.copy(isSync = true))
                        } else {
                            db.tillDao().updateTill(till.copy(syncErrorMessage = item.error))
                        }
                    }
                }
                Log.d(TAG, "Synced ${items.size} tills")
            }

            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Close till sync failed", e)
            Result.retry()
        }
    }
}
