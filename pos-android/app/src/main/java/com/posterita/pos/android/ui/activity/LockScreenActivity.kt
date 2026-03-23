package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.util.Log
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.databinding.ActivityLockScreenBinding
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

@AndroidEntryPoint
class LockScreenActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLockScreenBinding

    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var accountRegistry: LocalAccountRegistry
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    private var pinBuffer = ""
    private var correctPin = ""
    private var attempts = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLockScreenBinding.inflate(layoutInflater)
        setContentView(binding.root)

        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)

        // "Not me" link
        binding.textNotMe?.setOnClickListener {
            sessionManager.resetSession()
            prefsManager.setStringSync("last_brand_id", "")
            val intent = Intent(this, SetupWizardActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        }

        setupNumpad()
        loadUserAndConfigure()
    }

    private fun loadUserAndConfigure() {
        val user = sessionManager.user
        if (user != null) {
            correctPin = user.pin ?: ""
            binding.textUserName.text = "Welcome back, ${user.firstname ?: "there"}"
            configureForPin()
        } else {
            // Load from DB asynchronously
            lifecycleScope.launch {
                withContext(Dispatchers.IO) {
                    try {
                        val users = db.userDao().getAllUsers()
                        if (users.isNotEmpty()) {
                            val u = users[0]
                            correctPin = u.pin ?: ""
                            sessionManager.user = u
                        }
                    } catch (e: Exception) {
                        AppErrorLogger.warn(this@LockScreenActivity, "LockScreenActivity", "Failed to load user", e)
                    }
                    Unit
                }

                // Update UI on main thread
                val u = sessionManager.user
                if (u != null) {
                    binding.textUserName.text = "Welcome back, ${u.firstname ?: "there"}"
                    configureForPin()
                }

                // If no PIN after loading, auto-unlock
                if (correctPin.isEmpty()) {
                    SessionTimeoutManager.unlock()
                    val intent = Intent(this@LockScreenActivity, HomeActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    startActivity(intent)
                    finish()
                }
            }
        }
    }

    private fun configureForPin() {
        // If no PIN is set, just unlock and go to Home
        if (correctPin.isEmpty()) {
            SessionTimeoutManager.unlock()
            val intent = Intent(this, HomeActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
            return
        }

        // If PIN is longer than 4, show Enter button
        if (correctPin.length > 4) {
            binding.btnEnter?.visibility = View.VISIBLE
            binding.btnEnter?.setOnClickListener { checkPin() }
        }
    }

    private fun setupNumpad() {
        val buttons = mapOf(
            R.id.btn_0 to "0", R.id.btn_1 to "1", R.id.btn_2 to "2",
            R.id.btn_3 to "3", R.id.btn_4 to "4", R.id.btn_5 to "5",
            R.id.btn_6 to "6", R.id.btn_7 to "7", R.id.btn_8 to "8",
            R.id.btn_9 to "9"
        )

        for ((id, digit) in buttons) {
            findViewById<View>(id).setOnClickListener {
                if (pinBuffer.length < 10) { // max 10 digits
                    pinBuffer += digit
                    updateDots()
                    // Auto-check at exact PIN length (for 4-digit PINs)
                    if (correctPin.length in 1..4 && pinBuffer.length >= correctPin.length) {
                        checkPin()
                    }
                }
            }
        }

        findViewById<View>(R.id.btn_backspace).setOnClickListener {
            if (pinBuffer.isNotEmpty()) {
                pinBuffer = pinBuffer.dropLast(1)
                updateDots()
            }
        }

        findViewById<View>(R.id.btn_clear).setOnClickListener {
            pinBuffer = ""
            updateDots()
        }
    }

    private fun updateDots() {
        val dots = listOf(binding.dot1, binding.dot2, binding.dot3, binding.dot4)
        val filledColor = getColor(R.color.posterita_primary)
        val emptyColor = getColor(R.color.posterita_line)

        for (i in dots.indices) {
            // mutate() ensures each dot gets its own drawable instance (not shared)
            val bg = dots[i].background.mutate()
            if (bg is GradientDrawable) {
                bg.setColor(if (i < pinBuffer.length) filledColor else emptyColor)
                dots[i].background = bg
            }
        }

        // For PINs > 4 digits, update Enter button visibility
        if (correctPin.length > 4) {
            binding.btnEnter?.isEnabled = pinBuffer.isNotEmpty()
        }

        binding.textError.visibility = View.GONE
    }

    private fun checkPin() {
        if (pinBuffer == correctPin) {
            // Success — unlock
            SessionTimeoutManager.unlock()

            val accounts = accountRegistry.getAllAccounts()
            val lastBrand = prefsManager.getString("last_brand_id", "")

            val target = if (prefsManager.isKdsTerminal) {
                // KDS terminal → go straight to KDS setup/display
                Intent(this, KdsSetupActivity::class.java)
            } else if (accounts.size > 1 && lastBrand.isEmpty()) {
                Intent(this, BrandSelectorActivity::class.java)
            } else {
                Intent(this, HomeActivity::class.java)
            }

            target.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(target)
            finish()
        } else {
            // Wrong PIN
            attempts++
            pinBuffer = ""
            updateDots()

            binding.textError.text = if (attempts >= 3) {
                "Wrong PIN ($attempts attempts)"
            } else {
                "Incorrect PIN"
            }
            binding.textError.visibility = View.VISIBLE

            // Shake animation on dots
            binding.layoutPin.animate()
                .translationX(20f).setDuration(50)
                .withEndAction {
                    binding.layoutPin.animate()
                        .translationX(-20f).setDuration(50)
                        .withEndAction {
                            binding.layoutPin.animate()
                                .translationX(0f).setDuration(50)
                                .start()
                        }.start()
                }.start()
        }
    }

    @Suppress("MissingSuperCall")
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Don't allow back — must enter PIN
        // Move app to background instead
        moveTaskToBack(true)
    }
}
