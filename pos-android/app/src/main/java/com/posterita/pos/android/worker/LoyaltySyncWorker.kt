package com.posterita.pos.android.worker

import android.content.Context
import android.util.Log
import androidx.work.*
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.remote.LoyaltyApiService
import com.posterita.pos.android.data.repository.LoyaltyRepository
import com.posterita.pos.android.util.SharedPreferencesManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class LoyaltySyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "LoyaltySyncWorker"
        private const val WORK_NAME = "loyalty_sync_work"

        fun scheduleSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = PeriodicWorkRequestBuilder<LoyaltySyncWorker>(
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

            if (!prefsManager.loyaltyEnabled) return@withContext Result.success()

            val accountId = prefsManager.accountId
            if (accountId.isEmpty()) return@withContext Result.failure()

            val db = AppDatabase.getInstance(applicationContext, accountId)

            val baseUrl = prefsManager.loyaltyApiBaseUrl.let {
                if (it.endsWith("/")) it else "$it/"
            }
            val retrofit = Retrofit.Builder()
                .baseUrl(baseUrl)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            val loyaltyApi = retrofit.create(LoyaltyApiService::class.java)

            val repository = LoyaltyRepository(
                loyaltyApi = loyaltyApi,
                loyaltyCacheDao = db.loyaltyCacheDao(),
                pendingAwardDao = db.pendingLoyaltyAwardDao(),
                pendingConsentDao = db.pendingConsentUpdateDao(),
                prefsManager = prefsManager
            )

            val awards = repository.processPendingAwards()
            val consents = repository.processPendingConsents()

            Log.d(TAG, "Synced $awards pending awards, $consents pending consents")
            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Loyalty sync failed", e)
            Result.retry()
        }
    }
}
