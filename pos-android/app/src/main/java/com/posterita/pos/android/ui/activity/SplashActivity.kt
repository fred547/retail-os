package com.posterita.pos.android.ui.activity

import android.annotation.SuppressLint
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatActivity
import com.posterita.pos.android.databinding.ActivitySplashBinding
import com.posterita.pos.android.service.AiImportService
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@SuppressLint("CustomSplashScreen")
@AndroidEntryPoint
class SplashActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySplashBinding

    @Inject
    lateinit var prefsManager: SharedPreferencesManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(binding.root)
        supportActionBar?.hide()

        AiImportService.startPendingIfNeeded(this, prefsManager)

        Handler(Looper.getMainLooper()).postDelayed({
            val setupCompleted = prefsManager.getString("setup_completed", "")
            val isDemoAccount = prefsManager.accountId == "demo_account"
            val intent = when {
                // First-time user: go to onboarding wizard
                setupCompleted.isEmpty() && prefsManager.accountId.isEmpty() ->
                    Intent(this, SetupWizardActivity::class.java)
                // Demo account: skip login, go straight to home
                isDemoAccount ->
                    Intent(this, HomeActivity::class.java)
                // Returning user with account: go to login
                prefsManager.accountId.isNotEmpty() ->
                    Intent(this, SelectUserLoginActivity::class.java)
                // Fallback: onboarding
                else ->
                    Intent(this, SetupWizardActivity::class.java)
            }
            startActivity(intent)
            finish()
        }, 2000)
    }
}
