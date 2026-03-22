package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Account
import com.posterita.pos.android.data.local.entity.User
import com.posterita.pos.android.databinding.ActivityLoginBinding
import com.posterita.pos.android.service.SyncStatusManager
import com.posterita.pos.android.util.AppErrorLogger
import com.posterita.pos.android.util.LocalAccountRegistry
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import com.posterita.pos.android.worker.CloudSyncWorker
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import javax.inject.Inject

/**
 * Login screen — email + password.
 * Authenticates via Supabase Auth through /api/auth/login,
 * then syncs local DB with the cloud.
 */
@AndroidEntryPoint
class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding

    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var accountRegistry: LocalAccountRegistry

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnBack.setOnClickListener { finish() }
        binding.btnLogin.setOnClickListener { attemptLogin() }

        binding.btnForgotPassword.setOnClickListener {
            Toast.makeText(this, "Password reset will be sent to your email", Toast.LENGTH_LONG).show()
        }

        binding.tvSignUpLink.setOnClickListener { finish() }
    }

    private fun attemptLogin() {
        val email = binding.etEmail.text?.toString()?.trim() ?: ""
        val password = binding.etPassword.text?.toString() ?: ""

        if (email.isEmpty()) { showError("Please enter your email"); return }
        if (password.isEmpty()) { showError("Please enter your password"); return }

        binding.btnLogin.isEnabled = false
        binding.btnLogin.text = "Logging in..."
        binding.tvError.visibility = View.GONE

        lifecycleScope.launch {
            // Authenticate via server
            val result = withContext(Dispatchers.IO) { serverLogin(email, password) }

            if (result == null) {
                showError("Invalid email or password")
                resetButton()
                return@launch
            }

            val errorMsg = result.optString("error", "")
            if (errorMsg.isNotEmpty()) {
                showError(errorMsg)
                resetButton()
                return@launch
            }

            val accountId = result.optString("live_account_id", "")
            if (accountId.isEmpty()) {
                showError("No active brand found")
                resetButton()
                return@launch
            }

            // Save HMAC sync secret for signing sync requests
            val syncSecret = result.optString("sync_secret", "")
            if (syncSecret.isNotEmpty()) {
                prefsManager.syncSecret = syncSecret
            }

            // Set up local account
            withContext(Dispatchers.IO) {
                setupLocalAccount(accountId, email, result)
            }

            // Trigger sync and wait for it to complete — POS needs the offline database
            binding.btnLogin.text = "Syncing data..."
            CloudSyncWorker.syncNow(this@LoginActivity)

            // Wait for sync to complete (or timeout after 30s)
            val syncCompleted = waitForSyncComplete()

            if (!syncCompleted) {
                binding.btnLogin.text = "Sync taking longer than expected..."
            }

            // Check if we got user data
            val user = withContext(Dispatchers.IO) {
                try {
                    val db = AppDatabase.getInstance(this@LoginActivity, accountId)
                    val users = db.userDao().getAllUsers()
                    users.firstOrNull { u ->
                        u.email.equals(email, ignoreCase = true) ||
                        u.username.equals(email, ignoreCase = true)
                    }
                } catch (_: Exception) { null }
            }

            if (user != null) {
                loginSuccess(accountId, user)
            } else {
                // Sync completed but no user matched — create temp user
                val tempUser = User(
                    user_id = 1,
                    firstname = result.optString("brand_name", email.substringBefore("@")),
                    username = email,
                    email = email,
                    isadmin = "Y",
                    isactive = "Y",
                    role = User.ROLE_OWNER
                )
                withContext(Dispatchers.IO) {
                    try {
                        val db = AppDatabase.getInstance(this@LoginActivity, accountId)
                        db.userDao().insertUser(tempUser)
                    } catch (e: Exception) {
                        AppErrorLogger.warn(this@LoginActivity, "LoginActivity", "Failed to insert temp user", e)
                    }
                }
                loginSuccess(accountId, tempUser)
            }
        }
    }

    private fun serverLogin(email: String, password: String): JSONObject? {
        return try {
            val url = URL("https://web.posterita.com/api/auth/login")
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.connectTimeout = 10_000
            conn.readTimeout = 10_000
            conn.doOutput = true

            val payload = JSONObject().apply {
                put("email", email)
                put("password", password)
            }
            OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()); it.flush() }

            val responseCode = conn.responseCode
            val body = if (responseCode in 200..299) {
                conn.inputStream.bufferedReader().readText()
            } else {
                conn.errorStream?.bufferedReader()?.readText() ?: """{"error":"Login failed"}"""
            }
            Log.d("LoginActivity", "Login response ($responseCode): $body")
            JSONObject(body)
        } catch (e: Exception) {
            Log.w("LoginActivity", "Login request failed", e)
            null
        }
    }

    private suspend fun setupLocalAccount(accountId: String, email: String, result: JSONObject) {
        prefsManager.setAccountIdSync(accountId)
        AppDatabase.resetInstance()
        val db = AppDatabase.getInstance(this, accountId)

        try {
            db.accountDao().insertAccounts(listOf(
                Account(
                    account_id = accountId,
                    businessname = result.optString("brand_name", ""),
                    currency = result.optString("currency", ""),
                    isactive = "Y"
                )
            ))
        } catch (_: Exception) {}

        val demoId = result.optString("demo_account_id", "")
        accountRegistry.addAccount(
            id = accountId,
            name = result.optString("brand_name", ""),
            storeName = result.optString("brand_name", ""),
            ownerEmail = email, ownerPhone = "",
            type = "live", status = "active"
        )
        if (demoId.isNotEmpty()) {
            accountRegistry.addAccount(
                id = demoId, name = "Demo", storeName = "Demo",
                ownerEmail = email, ownerPhone = "",
                type = "demo", status = "testing"
            )
        }
    }

    /**
     * Wait for CloudSyncWorker to reach COMPLETE or ERROR state.
     * Returns true if sync completed successfully, false on timeout/error.
     */
    private suspend fun waitForSyncComplete(): Boolean {
        return withTimeoutOrNull(30_000L) {
            SyncStatusManager.status.first { status ->
                status.state == SyncStatusManager.SyncState.COMPLETE ||
                status.state == SyncStatusManager.SyncState.ERROR
            }
            SyncStatusManager.status.value.state == SyncStatusManager.SyncState.COMPLETE
        } ?: false
    }

    private fun loginSuccess(accountId: String, user: User) {
        prefsManager.setAccountIdSync(accountId)
        prefsManager.setEmailSync(user.email ?: "")
        sessionManager.user = user
        accountRegistry.touchAccount(accountId)
        prefsManager.setStringSync("setup_completed", "true")

        val intent = Intent(this, HomeActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        startActivity(intent)
        finish()
    }

    private fun showError(msg: String) {
        binding.tvError.text = msg
        binding.tvError.visibility = View.VISIBLE
    }

    private fun resetButton() {
        binding.btnLogin.isEnabled = true
        binding.btnLogin.text = "Log In"
    }
}
