package com.posterita.pos.android.util

import android.content.Context
import android.os.Build
import android.provider.Settings
import android.util.Log
import android.widget.Toast
import com.posterita.pos.android.BuildConfig
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.ErrorLog
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.io.PrintWriter
import java.io.StringWriter

/**
 * Centralized error logging for the app.
 *
 * Usage:
 *   AppErrorLogger.log(context, "MyTag", "Something failed", exception)
 *   AppErrorLogger.warn(context, "MyTag", "Hmm that's odd", exception)
 *   AppErrorLogger.fatal(context, "MyTag", "App is crashing", exception)
 *
 * Errors are:
 * 1. Logged to Android logcat (always)
 * 2. Saved to Room error_log table (for sync to backend)
 * 3. Shown as a friendly toast to the user (optional)
 */
object AppErrorLogger {

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private var sessionManager: SessionManager? = null
    private var prefsManager: SharedPreferencesManager? = null

    /**
     * Call once from Application.onCreate() to inject session context.
     */
    fun initialize(sessionManager: SessionManager, prefsManager: SharedPreferencesManager) {
        this.sessionManager = sessionManager
        this.prefsManager = prefsManager
    }

    /**
     * Log an ERROR-level event. Shows toast to user.
     */
    fun log(
        context: Context,
        tag: String,
        message: String,
        exception: Throwable? = null,
        showToast: Boolean = true
    ) {
        Log.e(tag, message, exception)
        if (showToast) {
            try {
                Toast.makeText(context, "Something went wrong. Please try again.", Toast.LENGTH_SHORT).show()
            } catch (_: Exception) { /* context might be dead */ }
        }
        save(context, "ERROR", tag, message, exception)
    }

    /**
     * Log a WARN-level event. No toast by default.
     */
    fun warn(
        context: Context,
        tag: String,
        message: String,
        exception: Throwable? = null
    ) {
        Log.w(tag, message, exception)
        save(context, "WARN", tag, message, exception)
    }

    /**
     * Log a FATAL-level event (uncaught crash).
     */
    fun fatal(
        context: Context,
        tag: String,
        message: String,
        exception: Throwable? = null
    ) {
        Log.e(tag, "FATAL: $message", exception)
        save(context, "FATAL", tag, message, exception)
    }

    /**
     * Log INFO-level (non-error diagnostic).
     */
    fun info(
        context: Context,
        tag: String,
        message: String
    ) {
        Log.i(tag, message)
        save(context, "INFO", tag, message, null)
    }

    private fun save(
        context: Context,
        severity: String,
        tag: String,
        message: String,
        exception: Throwable?
    ) {
        scope.launch {
            try {
                val prefs = prefsManager
                val session = sessionManager
                val accountId = prefs?.accountId ?: ""
                if (accountId.isEmpty() || accountId == "null") return@launch
                val db = AppDatabase.getInstance(context, accountId)

                val deviceId = try {
                    Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
                } catch (_: Exception) { "unknown" }

                val errorLog = ErrorLog(
                    severity = severity,
                    tag = tag,
                    message = message,
                    stacktrace = exception?.let { getStackTraceString(it) },
                    screen = tag, // tag is typically the activity/class name
                    userId = session?.user?.user_id ?: 0,
                    userName = session?.user?.let { "${it.firstname ?: ""} ${it.lastname ?: ""}".trim() },
                    storeId = prefs?.storeId ?: 0,
                    terminalId = prefs?.terminalId ?: 0,
                    accountId = accountId,
                    deviceId = deviceId,
                    appVersion = BuildConfig.VERSION_NAME,
                    osVersion = "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"
                )

                db.errorLogDao().insert(errorLog)
            } catch (e: Exception) {
                // Last resort — don't crash the error logger itself
                Log.e("AppErrorLogger", "Failed to save error log", e)
            }
        }
    }

    private fun getStackTraceString(throwable: Throwable): String {
        val sw = StringWriter()
        throwable.printStackTrace(PrintWriter(sw))
        val trace = sw.toString()
        // Limit to 4000 chars to avoid DB bloat
        return if (trace.length > 4000) trace.take(4000) + "\n... (truncated)" else trace
    }

    /**
     * Install as the global uncaught exception handler.
     * Call from Application.onCreate().
     */
    fun installCrashHandler(context: Context) {
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            try {
                fatal(context, "UncaughtException", "Crash on thread ${thread.name}: ${throwable.message}", throwable)
            } catch (_: Exception) {
                // Can't do anything here
            }
            // Let the default handler finish the crash
            defaultHandler?.uncaughtException(thread, throwable)
        }
    }

    /**
     * Clean up old synced logs (call periodically, e.g., during sync).
     */
    suspend fun cleanup(context: Context, accountId: String) {
        try {
            if (accountId.isEmpty() || accountId == "null") return
            val db = AppDatabase.getInstance(context, accountId)
            // Delete synced logs older than 7 days
            val cutoff = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000L)
            db.errorLogDao().deleteOldSyncedLogs(cutoff)
        } catch (e: Exception) {
            Log.w("AppErrorLogger", "Failed to clean up old logs", e)
        }
    }
}
