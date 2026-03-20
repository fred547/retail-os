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
import com.posterita.pos.android.util.SessionTimeoutManager
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
        SessionTimeoutManager.initialize(LockScreenActivity::class.java)

        Handler(Looper.getMainLooper()).postDelayed({
            val setupCompleted = prefsManager.getString("setup_completed", "")
            val hasAccount = prefsManager.accountId.isNotEmpty()

            val intent = when {
                // First-time user: go to onboarding wizard
                setupCompleted.isEmpty() && !hasAccount ->
                    Intent(this, SetupWizardActivity::class.java)

                // Has account: load user into session, show lock screen
                hasAccount -> {
                    // Load the last user into session (remember who they are)
                    runBlocking {
                        withContext(Dispatchers.IO) {
                            try {
                                val user = db.userDao().getAllUsers().firstOrNull()
                                if (user != null) sessionManager.user = user
                            } catch (_: Exception) {}
                        }
                    }

                    val user = sessionManager.user
                    // If PIN is a password (>4 chars), reset to default 0000
                    if (user != null && (user.pin?.length ?: 0) > 4) {
                        runBlocking {
                            withContext(Dispatchers.IO) {
                                try {
                                    db.userDao().updateUserPin(user.user_id, "0000")
                                    sessionManager.user = user.copy(pin = "0000")
                                } catch (_: Exception) {}
                            }
                        }
                    }
                    val hasPin = !sessionManager.user?.pin.isNullOrEmpty()

                    if (hasPin) {
                        // Has PIN → lock screen (remembers last user, just asks for PIN)
                        SessionTimeoutManager.lock()
                        Intent(this, LockScreenActivity::class.java)
                    } else {
                        // No PIN set → go straight to Home
                        Intent(this, HomeActivity::class.java)
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
