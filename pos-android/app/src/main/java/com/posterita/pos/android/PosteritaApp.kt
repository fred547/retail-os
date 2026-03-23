package com.posterita.pos.android

import android.app.Application
import com.posterita.pos.android.util.AppErrorLogger
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import com.posterita.pos.android.worker.CloudSyncWorker
import com.posterita.pos.android.worker.LoyaltySyncWorker
import dagger.hilt.android.HiltAndroidApp
import javax.inject.Inject

@HiltAndroidApp
class PosteritaApp : Application() {

    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var prefsManager: SharedPreferencesManager

    override fun onCreate() {
        super.onCreate()
        com.jakewharton.threetenabp.AndroidThreeTen.init(this)

        // Initialize error logging + crash handler
        AppErrorLogger.initialize(sessionManager, prefsManager)
        AppErrorLogger.installCrashHandler(this)

        // Schedule background sync workers
        LoyaltySyncWorker.scheduleSync(this)

        // Schedule cloud sync (Supabase) — every 5 minutes, requires network
        CloudSyncWorker.schedulePeriodicSync(this)

        // Warm up WebView engine — eliminates 300-800ms cold start on first WebView load
        com.posterita.pos.android.util.WebViewWarmUp.warmUp(this)
    }
}
