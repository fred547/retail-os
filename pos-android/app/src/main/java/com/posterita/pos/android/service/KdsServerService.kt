package com.posterita.pos.android.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.kds.KdsDiscovery
import com.posterita.pos.android.kds.KdsServer
import com.posterita.pos.android.util.SharedPreferencesManager

/**
 * Foreground service that keeps the KDS HTTP server alive
 * when the POS terminal is running in server mode.
 */
class KdsServerService : Service() {

    companion object {
        private const val TAG = "KdsServerService"
        private const val CHANNEL_ID = "kds_server"
        private const val NOTIFICATION_ID = 8321

        fun start(context: Context) {
            val intent = Intent(context, KdsServerService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, KdsServerService::class.java))
        }
    }

    private var kdsServer: KdsServer? = null
    private var kdsDiscovery: KdsDiscovery? = null

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildNotification())
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (kdsServer?.isRunning == true) {
            Log.d(TAG, "KDS server already running")
            return START_STICKY
        }

        val prefs = SharedPreferencesManager(this)
        val accountId = prefs.accountId
        if (accountId.isBlank()) {
            Log.w(TAG, "No account_id — cannot start KDS server")
            stopSelf()
            return START_NOT_STICKY
        }

        val db = AppDatabase.getInstance(this, accountId)
        val port = KdsServer.DEFAULT_PORT

        kdsServer = KdsServer(db, port).also { it.start() }

        // Register mDNS for auto-discovery
        val terminalId = prefs.terminalId
        kdsDiscovery = KdsDiscovery(this).also {
            it.registerService(terminalId, port)
        }

        Log.i(TAG, "KDS server service started on port $port")
        return START_STICKY
    }

    override fun onDestroy() {
        kdsDiscovery?.unregister()
        kdsServer?.stop()
        kdsServer = null
        kdsDiscovery = null
        Log.i(TAG, "KDS server service stopped")
        super.onDestroy()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Kitchen Display Server",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps the KDS server running for kitchen displays"
            }
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("KDS Server Running")
            .setContentText("Kitchen displays can connect on port ${KdsServer.DEFAULT_PORT}")
            .setSmallIcon(R.drawable.ic_notification)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }
}
