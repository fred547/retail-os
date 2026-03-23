package com.posterita.pos.android.ui.activity

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.databinding.ActivitySplashBinding
import com.posterita.pos.android.service.AiImportService
import com.posterita.pos.android.util.AppErrorLogger
import com.posterita.pos.android.util.LocalAccountRegistry
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SessionTimeoutManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@SuppressLint("CustomSplashScreen")
@AndroidEntryPoint
class SplashActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySplashBinding

    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var accountRegistry: LocalAccountRegistry

    private val splashHandler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(binding.root)
        supportActionBar?.hide()

        AiImportService.startPendingIfNeeded(this, prefsManager)
        SessionTimeoutManager.initialize(LockScreenActivity::class.java)

        splashHandler.postDelayed({ navigateAfterSplash() }, 2000)
    }

    override fun onDestroy() {
        splashHandler.removeCallbacksAndMessages(null)
        super.onDestroy()
    }

    private fun navigateAfterSplash() {
        val setupCompleted = prefsManager.getString("setup_completed", "")
        val hasAccount = prefsManager.accountId.isNotEmpty()

        // Consistency check: if account is set but local DB is empty, force re-setup
        if (hasAccount && prefsManager.accountId != "demo_account") {
            lifecycleScope.launch {
                val isConsistent = withContext(Dispatchers.IO) {
                    try {
                        val userCount = db.userDao().getAllUsers().size
                        userCount > 0
                    } catch (e: Exception) {
                        Log.w("SplashActivity", "Consistency check failed", e)
                        false
                    }
                }
                if (!isConsistent) {
                    Log.w("SplashActivity", "Inconsistent state: account=${prefsManager.accountId} but no users in local DB — forcing re-setup")
                    AppErrorLogger.warn(this@SplashActivity, "SplashActivity", "Inconsistent local state detected, forcing re-setup")
                    // Clear stale state
                    prefsManager.clearAll()
                    AppDatabase.resetInstance()
                    for (acc in accountRegistry.getAllAccounts()) {
                        accountRegistry.removeAccount(acc.id)
                    }
                    startActivity(Intent(this@SplashActivity, SetupWizardActivity::class.java))
                    finish()
                    return@launch
                }
                // Consistent — proceed with normal navigation
                navigateToDestination(setupCompleted, hasAccount)
            }
            return
        }

        navigateToDestination(setupCompleted, hasAccount)
    }

    private fun navigateToDestination(setupCompleted: String, hasAccount: Boolean) {
        when {
            // Real account with setup completed: load user, check PIN
            hasAccount && prefsManager.accountId != "demo_account" -> {
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) {
                        try {
                            val user = db.userDao().getAllUsers().firstOrNull()
                            if (user != null) {
                                sessionManager.user = user
                            }
                        } catch (e: Exception) {
                            Log.w("SplashActivity", "Failed to load user", e)
                        }
                        Unit
                    }

                    val pin = sessionManager.user?.pin
                    val intent = if (!pin.isNullOrEmpty()) {
                        SessionTimeoutManager.lock()
                        Intent(this@SplashActivity, LockScreenActivity::class.java)
                    } else {
                        Intent(this@SplashActivity, HomeActivity::class.java)
                    }
                    startActivity(intent)
                    finish()
                }
            }

            // No active account but registry has accounts from before
            // (e.g. after data clear but registry persists, or brand switching)
            // → go to PIN lock if we can find a user in any registered brand's DB
            !hasAccount && accountRegistry.getAccountCount() > 0 -> {
                lifecycleScope.launch {
                    val restored = withContext(Dispatchers.IO) {
                        for (entry in accountRegistry.getAllAccounts()) {
                            val dbName = "${com.posterita.pos.android.util.Constants.DATABASE_NAME}_${entry.id}"
                            val dbFile = getDatabasePath(dbName)
                            if (!dbFile.exists()) continue
                            try {
                                // Open dedicated DB (not singleton) to check for PIN
                                val brandDb = androidx.room.Room.databaseBuilder(
                                    applicationContext, AppDatabase::class.java, dbName
                                ).fallbackToDestructiveMigration().build()
                                val user = try { brandDb.userDao().getAllUsers().firstOrNull() } finally { brandDb.close() }

                                if (user != null && !user.pin.isNullOrEmpty()) {
                                    // Restore this as the active account
                                    prefsManager.setAccountIdSync(entry.id)
                                    prefsManager.setStringSync("setup_completed", "true")
                                    AppDatabase.resetInstance()
                                    // Re-init with correct account via singleton (now safe)
                                    val db2 = AppDatabase.getInstance(this@SplashActivity, entry.id)
                                    sessionManager.user = user
                                    val store = db2.storeDao().getAllStores().firstOrNull()
                                    if (store != null) {
                                        sessionManager.store = store
                                        prefsManager.setStoreIdSync(store.storeId)
                                        prefsManager.setStoreNameSync(store.name ?: "")
                                    }
                                    val terminal = db2.terminalDao().getAllTerminals().firstOrNull()
                                    if (terminal != null) {
                                        sessionManager.terminal = terminal
                                        prefsManager.setTerminalIdSync(terminal.terminalId)
                                        prefsManager.setTerminalNameSync(terminal.name ?: "")
                                    }
                                    accountRegistry.touchAccount(entry.id)
                                    return@withContext true
                                }
                            } catch (_: Exception) {}
                        }
                        false
                    }

                    if (restored) {
                        SessionTimeoutManager.lock()
                        startActivity(Intent(this@SplashActivity, LockScreenActivity::class.java))
                    } else {
                        // Registry has entries but no valid user/PIN found — go to setup
                        startActivity(Intent(this@SplashActivity, SetupWizardActivity::class.java))
                    }
                    finish()
                }
            }

            // Demo account: skip lock screen
            prefsManager.accountId == "demo_account" -> {
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) {
                        try {
                            val user = db.userDao().getAllUsers().firstOrNull()
                            if (user != null) sessionManager.user = user
                        } catch (_: Exception) {}
                        Unit
                    }
                    startActivity(Intent(this@SplashActivity, HomeActivity::class.java))
                    finish()
                }
            }

            // First-time user: go to onboarding wizard
            else -> {
                startActivity(Intent(this, SetupWizardActivity::class.java))
                finish()
            }
        }
    }
}
