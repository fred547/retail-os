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

        when {
            // First-time user: go to onboarding wizard
            setupCompleted.isEmpty() && !hasAccount -> {
                startActivity(Intent(this, SetupWizardActivity::class.java))
                finish()
            }

            // Demo account: skip lock screen, go straight to Home
            prefsManager.accountId == "demo_account" -> {
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) {
                        try {
                            val user = db.userDao().getAllUsers().firstOrNull()
                            if (user != null) {
                                sessionManager.user = user
                            }
                        } catch (e: Exception) {
                            Log.w("SplashActivity", "Failed to load demo user", e)
                        }
                        Unit
                    }
                    startActivity(Intent(this@SplashActivity, HomeActivity::class.java))
                    finish()
                }
            }

            // Real account: load user, check PIN
            hasAccount -> {
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

            // Fallback
            else -> {
                startActivity(Intent(this, SetupWizardActivity::class.java))
                finish()
            }
        }
    }
}
