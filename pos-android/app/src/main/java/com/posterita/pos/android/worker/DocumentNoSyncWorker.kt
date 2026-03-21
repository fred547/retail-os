package com.posterita.pos.android.worker

import android.content.Context
import android.util.Log
import androidx.work.*
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Sequence
import com.posterita.pos.android.data.remote.ApiService
import com.posterita.pos.android.data.remote.model.request.SyncDocumentNoRequest
import com.posterita.pos.android.util.SharedPreferencesManager
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.converter.scalars.ScalarsConverterFactory
import java.util.concurrent.TimeUnit

class DocumentNoSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    companion object {
        private const val TAG = "DocumentNoSyncWorker"
        private const val WORK_NAME = "document_no_sync_work"

        fun scheduleSync(context: Context) {
            val constraints = Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build()

            val workRequest = PeriodicWorkRequestBuilder<DocumentNoSyncWorker>(
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

            // Skip for cloud/standalone accounts — legacy endpoint doesn't exist
            val baseUrl = prefsManager.baseUrl
            if (baseUrl.contains("posterita-cloud") || baseUrl.contains("web.posterita") || accountId.startsWith("standalone")) {
                return@withContext Result.success()
            }

            val db = AppDatabase.getInstance(applicationContext, accountId)

            val orderSeq = db.sequenceDao().getSequenceByNameForTerminal(
                Sequence.ORDER_DOCUMENT_NO, terminalId
            )
            val tillSeq = db.sequenceDao().getSequenceByNameForTerminal(
                Sequence.TILL_DOCUMENT_NO, terminalId
            )

            val request = SyncDocumentNoRequest(
                terminal_id = terminalId,
                document_no = orderSeq?.sequenceNo?.toLong() ?: 0L,
                cash_up_document_no = tillSeq?.sequenceNo?.toLong() ?: 0L
            )

            val syncUrl = baseUrl.let { if (it.endsWith("/")) it else "$it/" }
            val retrofit = Retrofit.Builder()
                .baseUrl(syncUrl)
                .addConverterFactory(ScalarsConverterFactory.create())
                .addConverterFactory(GsonConverterFactory.create())
                .build()
            val apiService = retrofit.create(ApiService::class.java)

            val response = apiService.syncDocumentNumber(accountId, request)
            Log.d(TAG, "Document no sync response: ${response.code()}")

            Result.success()
        } catch (e: Exception) {
            Log.e(TAG, "Document no sync failed", e)
            Result.retry()
        }
    }
}
