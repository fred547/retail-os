package com.posterita.pos.android.ui.activity

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatActivity
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.databinding.ActivitySplashBinding
import com.posterita.pos.android.service.AiImportService
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import javax.inject.Inject

@SuppressLint("CustomSplashScreen")
@AndroidEntryPoint
class SplashActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySplashBinding

    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var db: AppDatabase

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(binding.root)
        supportActionBar?.hide()

        AiImportService.startPendingIfNeeded(this, prefsManager)

        Handler(Looper.getMainLooper()).postDelayed({
            val setupCompleted = prefsManager.getString("setup_completed", "")
            val hasAccount = prefsManager.accountId.isNotEmpty()

            val intent = when {
                // First-time user: go to onboarding wizard
                setupCompleted.isEmpty() && !hasAccount ->
                    Intent(this, SetupWizardActivity::class.java)

                // Has account: check how many users exist
                hasAccount -> {
                    val userCount = runBlocking {
                        withContext(Dispatchers.IO) {
                            try { db.userDao().getAllUsers().size } catch (_: Exception) { 0 }
                        }
                    }

                    if (userCount <= 1) {
                        // Only owner — skip PIN, auto-login, go to Home
                        runBlocking {
                            withContext(Dispatchers.IO) {
                                try {
                                    val user = db.userDao().getAllUsers().firstOrNull()
                                    if (user != null) sessionManager.user = user
                                } catch (_: Exception) {}
                            }
                        }
                        Intent(this, HomeActivity::class.java)
                    } else {
                        // Multiple users — show user selection + PIN
                        Intent(this, SelectUserLoginActivity::class.java)
                    }
                }

                // Fallback: onboarding
                else -> Intent(this, SetupWizardActivity::class.java)
            }
            startActivity(intent)
            finish()
        }, 2000)
    }
}
