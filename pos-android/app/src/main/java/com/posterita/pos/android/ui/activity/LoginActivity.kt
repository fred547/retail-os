package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import android.widget.TextView
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.databinding.ActivityLoginBinding
import com.posterita.pos.android.util.LocalAccountRegistry
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

/**
 * Clean login screen — email + password.
 * Matches users against the local Room database.
 * For Phase 1+, this would call the backend auth API.
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

        binding.tvSignUpLink.setOnClickListener {
            // Go back to welcome, which has sign up
            finish()
        }
    }

    private fun attemptLogin() {
        val email = binding.etEmail.text?.toString()?.trim() ?: ""
        val password = binding.etPassword.text?.toString() ?: ""

        if (email.isEmpty()) {
            showError("Please enter your email")
            return
        }
        if (password.isEmpty()) {
            showError("Please enter your password")
            return
        }

        binding.btnLogin.isEnabled = false
        binding.btnLogin.text = "Logging in..."
        binding.tvError.visibility = View.GONE

        lifecycleScope.launch {
            // Try to find a matching user across all local accounts
            val result = withContext(Dispatchers.IO) {
                findUserByCredentials(email, password)
            }

            if (result != null) {
                val (accountId, user) = result
                prefsManager.setAccountIdSync(accountId)

                // Reload DB for this account
                AppDatabase.resetInstance()
                val db = AppDatabase.getInstance(this@LoginActivity, accountId)

                sessionManager.user = user
                accountRegistry.touchAccount(accountId)

                // Go to home
                val intent = Intent(this@LoginActivity, HomeActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                }
                startActivity(intent)
                finish()
            } else {
                binding.btnLogin.isEnabled = true
                binding.btnLogin.text = "Log In"
                showError("Invalid email or password")
            }
        }
    }

    /**
     * Search all local accounts for a user matching the email + password.
     * Returns (accountId, User) if found, null otherwise.
     */
    private suspend fun findUserByCredentials(
        email: String,
        password: String
    ): Pair<String, com.posterita.pos.android.data.local.entity.User>? {
        // Check all registered accounts
        val accounts = accountRegistry.getAllAccounts()
        for (account in accounts) {
            try {
                val db = AppDatabase.getInstance(this, account.id)
                val users = db.userDao().getAllUsers()
                val match = users.firstOrNull { user ->
                    (user.email.equals(email, ignoreCase = true) ||
                     user.username.equals(email, ignoreCase = true)) &&
                    (user.password == password || user.pin == password)
                }
                if (match != null) {
                    return Pair(account.id, match)
                }
            } catch (e: Exception) {
                // Skip accounts with DB issues
                continue
            }
        }
        return null
    }

    private fun showError(msg: String) {
        binding.tvError.text = msg
        binding.tvError.visibility = View.VISIBLE
    }
}
