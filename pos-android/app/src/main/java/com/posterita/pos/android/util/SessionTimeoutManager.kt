package com.posterita.pos.android.util

import android.app.Activity
import android.content.Intent
import android.os.Handler
import android.os.Looper

/**
 * Manages session idle timeout. After TIMEOUT_MS of inactivity,
 * the app locks and requires PIN to resume.
 *
 * Usage: Call `onUserActivity()` on every touch event.
 * Call `checkAndLock(activity)` in onResume of BaseActivity.
 */
object SessionTimeoutManager {
    private const val TIMEOUT_MS = 30 * 60 * 1000L // 30 minutes
    private var lastActivityTime = System.currentTimeMillis()
    private var isLocked = false
    private var lockScreenClass: Class<out Activity>? = null

    fun initialize(lockScreen: Class<out Activity>) {
        lockScreenClass = lockScreen
        lastActivityTime = System.currentTimeMillis()
        isLocked = false
    }

    /** Call this on every user interaction (touch, key press) */
    fun onUserActivity() {
        lastActivityTime = System.currentTimeMillis()
    }

    /** Check if session has timed out. Call in onResume. */
    fun isTimedOut(): Boolean {
        if (isLocked) return true
        val elapsed = System.currentTimeMillis() - lastActivityTime
        return elapsed > TIMEOUT_MS
    }

    /** Mark as locked (show lock screen) */
    fun lock() {
        isLocked = true
    }

    /** Mark as unlocked (PIN entered correctly) */
    fun unlock() {
        isLocked = false
        lastActivityTime = System.currentTimeMillis()
    }

    /** Check and redirect to lock screen if timed out */
    fun checkAndLock(activity: Activity): Boolean {
        if (isTimedOut() && lockScreenClass != null) {
            // Don't lock the lock screen itself or setup wizard
            val className = activity::class.java.simpleName
            if (className == "LockScreenActivity" ||
                className == "SetupWizardActivity" ||
                className == "SplashActivity") {
                return false
            }
            lock()
            val intent = Intent(activity, lockScreenClass)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            activity.startActivity(intent)
            return true
        }
        return false
    }
}
