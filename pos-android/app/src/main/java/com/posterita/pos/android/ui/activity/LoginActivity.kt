package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
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
class LoginActivity : BaseActivity() {

    private lateinit var binding: ActivityLoginBinding

    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var accountRegistry: LocalAccountRegistry
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.btnBack.setOnClickListener { finish() }
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)
        binding.btnLogin.setOnClickListener { attemptLogin() }

        binding.btnForgotPassword.setOnClickListener {
            showForgotPasswordDialog()
        }

        binding.tvSignUpLink.setOnClickListener { finish() }

        // Show sync button if user has existing accounts (returning user)
        if (accountRegistry.getAccountCount() > 0) {
            binding.btnSync?.visibility = View.VISIBLE
            binding.btnSync?.setOnClickListener { forceSync() }
        }

        // Pre-fill email if passed from signup
        intent.getStringExtra("email")?.let {
            if (it.isNotEmpty()) binding.etEmail.setText(it)
        }
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
            // Try server first (online-first)
            val result = withContext(Dispatchers.IO) { serverLogin(email, password) }

            if (result == null) {
                // Server unreachable — try offline login with local databases
                binding.btnLogin.text = "Offline mode..."
                val offlineResult = withContext(Dispatchers.IO) { tryOfflineLogin(email, password) }
                if (offlineResult != null) {
                    // Offline login succeeded — schedule sync for when connectivity returns
                    CloudSyncWorker.syncNow(this@LoginActivity)
                    loginSuccess(offlineResult.first, offlineResult.second)
                    return@launch
                }
                showError("Cannot connect to server and no local account found. Check your internet connection.")
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

            // Update local user from server response (ensures password/PIN changes are reflected)
            val posUserJson = result.optJSONObject("pos_user")
            val serverUserId = result.optInt("live_user_id", posUserJson?.optInt("user_id", 0) ?: 0)

            val localUser = withContext(Dispatchers.IO) {
                try {
                    val db = AppDatabase.getInstance(this@LoginActivity, accountId)
                    if (posUserJson != null) {
                        // Insert/update user from server data
                        val uid = if (serverUserId > 0) serverUserId else posUserJson.optInt("user_id", 1)
                        val serverUser = User(
                            user_id = uid,
                            firstname = posUserJson.optString("firstname", ""),
                            lastname = posUserJson.optString("lastname", ""),
                            username = posUserJson.optString("username", email),
                            email = posUserJson.optString("email", email),
                            phone1 = posUserJson.optString("phone1", ""),
                            pin = posUserJson.optString("pin", ""),
                            role = posUserJson.optString("role", "owner"),
                            isadmin = posUserJson.optString("isadmin", "Y"),
                            issalesrep = posUserJson.optString("issalesrep", "Y"),
                            isactive = posUserJson.optString("isactive", "Y"),
                        )
                        db.userDao().insertUser(serverUser)
                        serverUser
                    } else {
                        // Fallback: check existing local users
                        db.userDao().getAllUsers().firstOrNull { u ->
                            u.email.equals(email, ignoreCase = true) ||
                            u.username.equals(email, ignoreCase = true)
                        }
                    }
                } catch (e: Exception) {
                    AppErrorLogger.warn(this@LoginActivity, "LoginActivity", "Failed to update user", e)
                    null
                }
            }

            // Trigger sync to pull full data
            binding.btnLogin.text = "Syncing data..."
            CloudSyncWorker.syncNow(this@LoginActivity)

            // Wait for sync (or timeout after 30s)
            val syncCompleted = waitForSyncComplete()
            if (!syncCompleted) {
                binding.btnLogin.text = "Sync taking longer than expected..."
            }

            if (localUser != null) {
                loginSuccess(accountId, localUser)
            } else {
                // Create temp user as last resort
                val tempUser = User(
                    user_id = if (serverUserId > 0) serverUserId else 1,
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

    /**
     * Offline fallback: scan local Room databases for a user matching this email.
     * Verifies PIN as password substitute when offline.
     * Returns (accountId, User) if found and PIN matches, null otherwise.
     */
    private suspend fun tryOfflineLogin(email: String, password: String = ""): Pair<String, User>? {
        // Check account registry for previously synced accounts
        val accounts = accountRegistry.getAllAccounts()
        for (account in accounts) {
            try {
                val db = AppDatabase.getInstance(this, account.id)
                val users = db.userDao().getAllUsers()
                val matchingUser = users.firstOrNull { u ->
                    u.email.equals(email, ignoreCase = true) ||
                    u.username.equals(email, ignoreCase = true)
                }
                if (matchingUser != null) {
                    // Offline login: we can't verify the Supabase password locally.
                    // Only allow offline login if the user has previously logged in
                    // on this device (i.e., they have a PIN set — proof of prior auth).
                    if (matchingUser.pin.isNullOrEmpty()) {
                        Log.d("LoginActivity", "Offline login: no PIN set for ${account.id}, skipping (never logged in on this device)")
                        continue
                    }
                    Log.d("LoginActivity", "Offline login: found verified user in account ${account.id}")
                    return account.id to matchingUser
                }
            } catch (e: Exception) {
                Log.w("LoginActivity", "Offline login: failed to check account ${account.id}", e)
            }
        }

        // Also scan for any Room DB files on disk
        val dbDir = getDatabasePath("dummy").parentFile ?: return null
        val dbFiles = dbDir.listFiles()?.filter {
            it.name.startsWith("POSTERITA_LITE_DB_") && !it.name.contains("-shm") && !it.name.contains("-wal")
        } ?: return null

        for (dbFile in dbFiles) {
            val accountId = dbFile.name.removePrefix("POSTERITA_LITE_DB_")
            if (accounts.any { it.id == accountId }) continue // already checked
            try {
                val db = AppDatabase.getInstance(this, accountId)
                val users = db.userDao().getAllUsers()
                val matchingUser = users.firstOrNull { u ->
                    u.email.equals(email, ignoreCase = true) ||
                    u.username.equals(email, ignoreCase = true)
                }
                if (matchingUser != null) {
                    Log.d("LoginActivity", "Offline login: found user in DB file $accountId")
                    return accountId to matchingUser
                }
            } catch (e: Exception) {
                Log.w("LoginActivity", "Offline login: failed to check DB $accountId", e)
            }
        }

        return null
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
        // Use server-assigned IDs if available
        val storeId = result.optInt("live_store_id", 1)
        val terminalId = result.optInt("live_terminal_id", 1)

        prefsManager.setAccountIdSync(accountId)
        prefsManager.setStoreIdSync(if (storeId > 0) storeId else 1)
        prefsManager.setTerminalIdSync(if (terminalId > 0) terminalId else 1)
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

        // Register ALL brands returned by the login API
        val accountsArray = result.optJSONArray("accounts")
        if (accountsArray != null && accountsArray.length() > 0) {
            for (i in 0 until accountsArray.length()) {
                val acc = accountsArray.getJSONObject(i)
                val accId = acc.optString("account_id", "")
                if (accId.isEmpty()) continue
                accountRegistry.addAccount(
                    id = accId,
                    name = acc.optString("businessname", "Brand"),
                    storeName = acc.optString("businessname", "Brand"),
                    ownerEmail = email, ownerPhone = "",
                    type = acc.optString("type", "live"),
                    status = acc.optString("status", "active")
                )
            }
        } else {
            // Fallback: register live + demo only
            accountRegistry.addAccount(
                id = accountId,
                name = result.optString("brand_name", ""),
                storeName = result.optString("brand_name", ""),
                ownerEmail = email, ownerPhone = "",
                type = "live", status = "active"
            )
            val demoId = result.optString("demo_account_id", "")
            if (demoId.isNotEmpty()) {
                accountRegistry.addAccount(
                    id = demoId, name = "Demo", storeName = "Demo",
                    ownerEmail = email, ownerPhone = "",
                    type = "demo", status = "testing"
                )
            }
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

    private fun forceSync() {
        binding.btnSync?.isEnabled = false
        binding.tvSyncStatus?.visibility = View.VISIBLE
        binding.tvSyncStatus?.text = "Syncing all brands..."

        CloudSyncWorker.syncNow(this)

        lifecycleScope.launch {
            val completed = waitForSyncComplete()
            binding.tvSyncStatus?.text = if (completed) "Sync complete!" else "Sync timed out"
            binding.btnSync?.isEnabled = true

            // Delay then hide
            kotlinx.coroutines.delay(2000)
            binding.tvSyncStatus?.visibility = View.GONE
        }
    }

    private fun showForgotPasswordDialog() {
        val emailInput = EditText(this).apply {
            hint = "Enter your email"
            inputType = android.text.InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
            setPadding(48, 32, 48, 32)
            // Pre-fill with the email field value
            val currentEmail = binding.etEmail.text?.toString()?.trim() ?: ""
            if (currentEmail.isNotEmpty()) setText(currentEmail)
        }

        AlertDialog.Builder(this)
            .setTitle("Reset Password")
            .setMessage("We'll send a password reset link to your email address.")
            .setView(emailInput)
            .setPositiveButton("Send Reset Link") { _, _ ->
                val email = emailInput.text?.toString()?.trim() ?: ""
                if (email.isEmpty()) {
                    Toast.makeText(this, "Please enter your email", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
                requestPasswordReset(email)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun requestPasswordReset(email: String) {
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                try {
                    val url = URL("https://web.posterita.com/api/auth/reset-password")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.connectTimeout = 10_000
                    conn.readTimeout = 10_000
                    conn.doOutput = true

                    val payload = JSONObject().apply { put("email", email) }
                    OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()); it.flush() }

                    val responseCode = conn.responseCode
                    val body = if (responseCode in 200..299) {
                        conn.inputStream.bufferedReader().readText()
                    } else {
                        conn.errorStream?.bufferedReader()?.readText() ?: """{"error":"Request failed"}"""
                    }
                    JSONObject(body)
                } catch (e: Exception) {
                    AppErrorLogger.warn(this@LoginActivity, "LoginActivity", "Password reset request failed", e)
                    null
                }
            }

            if (result != null && result.optBoolean("success", false)) {
                Toast.makeText(
                    this@LoginActivity,
                    "Password reset email sent. Check your inbox.",
                    Toast.LENGTH_LONG
                ).show()
            } else {
                val errorMsg = result?.optString("error", "Failed to send reset email") ?: "Failed to send reset email"
                Toast.makeText(this@LoginActivity, errorMsg, Toast.LENGTH_LONG).show()
            }
        }
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
