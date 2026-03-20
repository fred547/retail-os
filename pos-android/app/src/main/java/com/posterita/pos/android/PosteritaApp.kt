package com.posterita.pos.android

import android.app.Application
import com.posterita.pos.android.worker.CloudSyncWorker
import com.posterita.pos.android.worker.CloseTillSyncWorker
import com.posterita.pos.android.worker.DocumentNoSyncWorker
import com.posterita.pos.android.worker.LoyaltySyncWorker
import com.posterita.pos.android.worker.OrderSyncWorker
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class PosteritaApp : Application() {
    override fun onCreate() {
        super.onCreate()
        com.jakewharton.threetenabp.AndroidThreeTen.init(this)

        // Schedule background sync workers (15-min periodic, requires network)
        OrderSyncWorker.scheduleSync(this)
        CloseTillSyncWorker.scheduleSync(this)
        DocumentNoSyncWorker.scheduleSync(this)
        LoyaltySyncWorker.scheduleSync(this)

        // Schedule cloud sync (Supabase) — every 5 minutes, requires network
        CloudSyncWorker.schedulePeriodicSync(this)
    }
}
