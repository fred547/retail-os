package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.databinding.ActivitySettingsBinding
import com.posterita.pos.android.util.LocalAccountRegistry
import com.posterita.pos.android.util.SessionManager
import androidx.lifecycle.lifecycleScope
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class SettingsActivity : BaseDrawerActivity() {

    private lateinit var binding: ActivitySettingsBinding
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var db: AppDatabase

    override fun getDrawerHighlightId(): Int = R.id.nav_settings

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentViewWithDrawer(R.layout.activity_settings)
        binding = ActivitySettingsBinding.bind(drawerLayout.getChildAt(0))

        binding.buttonBack.setOnClickListener { finish() }

        setupDrawerNavigation()

        // Web Console — all data managed via embedded web console
        binding.storesOption.setOnClickListener { openWebConsole("/stores", "Stores") }
        binding.terminalsOption.setOnClickListener { openWebConsole("/terminals", "Terminals") }
        binding.productsOption.setOnClickListener { openWebConsole("/products", "Products") }
        binding.categoriesOption.setOnClickListener { openWebConsole("/categories", "Categories") }
        binding.usersOption.setOnClickListener { openWebConsole("/users", "Users") }
        binding.taxesOption.setOnClickListener {
            startActivity(Intent(this, ManageTaxActivity::class.java))
        }

        // Restaurant tables — only visible in restaurant mode
        if (prefsManager.isRestaurant) {
            binding.tablesOption.visibility = View.VISIBLE
            binding.tablesOption.setOnClickListener {
                startActivity(Intent(this, ManageTablesActivity::class.java))
            }
        }

        // Device — local config only
        binding.syncOption.setOnClickListener {
            startActivity(Intent(this, DatabaseSynchonizerActivity::class.java))
        }
        binding.printersOption.setOnClickListener {
            startActivity(Intent(this, PrintersActivity::class.java))
        }

        // Restaurant mode toggle — sets terminal_type
        val restaurantSwitch = binding.switchRestaurantMode
        val restaurantStatus = binding.textRestaurantStatus
        restaurantSwitch.isChecked = prefsManager.isRestaurant
        updateRestaurantStatus(restaurantStatus, prefsManager.isRestaurant)

        restaurantSwitch.setOnCheckedChangeListener { _, isChecked ->
            prefsManager.terminalType = if (isChecked) "pos_restaurant" else "pos_retail"
            // Also update legacy businessType for backward compat
            prefsManager.businessType = if (isChecked) "restaurant" else "retail"
            updateRestaurantStatus(restaurantStatus, isChecked)
            // Show/hide restaurant-specific options
            binding.tablesOption.visibility = if (isChecked) View.VISIBLE else View.GONE
            binding.kdsOption.visibility = if (isChecked) View.VISIBLE else View.GONE
            // Update terminal in DB
            lifecycleScope.launch(Dispatchers.IO) {
                val terminalId = prefsManager.terminalId
                if (terminalId > 0) {
                    val terminal = db.terminalDao().getTerminalById(terminalId)
                    if (terminal != null) {
                        db.terminalDao().updateTerminal(terminal.copy(
                            terminal_type = if (isChecked) "pos_restaurant" else "pos_retail"
                        ))
                    }
                }
            }
            Toast.makeText(this,
                if (isChecked) "Restaurant mode enabled" else "Retail mode enabled",
                Toast.LENGTH_SHORT
            ).show()
        }

        // KDS Display — restaurant mode only
        if (prefsManager.isRestaurant) {
            binding.kdsOption.visibility = View.VISIBLE
        }
        binding.kdsOption.setOnClickListener {
            startActivity(Intent(this, KdsSetupActivity::class.java))
        }

        // Brands — owner only
        val isOwner = sessionManager.user?.isOwner == true
        if (isOwner) {
            findViewById<TextView>(R.id.tv_account_header)?.visibility = View.VISIBLE
            binding.brandsOption.visibility = View.VISIBLE
            binding.brandsOption.setOnClickListener {
                startActivity(Intent(this, ManageBrandsActivity::class.java))
            }
        }

        // Danger zone — owner only
        if (isOwner) {
            findViewById<TextView>(R.id.tv_danger_header)?.visibility = View.VISIBLE
            binding.resetOption.visibility = View.VISIBLE
            binding.resetOption.setOnClickListener { showResetConfirmation() }
        }

        // System
        binding.about.setOnClickListener {
            startActivity(Intent(this, AboutActivity::class.java))
        }
    }

    private fun updateRestaurantStatus(textView: android.widget.TextView, isRestaurant: Boolean) {
        textView.text = if (isRestaurant) "On — dine-in, tables, kitchen display" else "Off — tap to enable dine-in, tables, kitchen"
    }

    private fun showResetConfirmation() {
        AlertDialog.Builder(this)
            .setTitle("Reset Account")
            .setMessage(
                "This will delete ALL local data on this device:\n\n" +
                "• Products, orders, tills\n" +
                "• User sessions and PINs\n" +
                "• All brand databases\n\n" +
                "Your cloud data is NOT affected.\n" +
                "You will need to sign up again.\n\n" +
                "Are you sure?"
            )
            .setPositiveButton("Reset Everything") { _, _ ->
                performFactoryReset()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun performFactoryReset() {
        // 0. Try to clean cloud data (best-effort, non-blocking)
        try {
            val accountId = prefsManager.accountId
            val email = prefsManager.email
            if (accountId.isNotEmpty()) {
                Thread {
                    try {
                        val url = java.net.URL("https://web.posterita.com/api/auth/reset")
                        val conn = url.openConnection() as java.net.HttpURLConnection
                        conn.requestMethod = "POST"
                        conn.setRequestProperty("Content-Type", "application/json")
                        conn.connectTimeout = 5000
                        conn.readTimeout = 5000
                        conn.doOutput = true
                        val payload = org.json.JSONObject().apply {
                            put("account_id", accountId)
                            if (email.isNotEmpty()) put("email", email)
                        }
                        conn.outputStream.bufferedWriter().use { it.write(payload.toString()) }
                        conn.responseCode // trigger the request
                        conn.disconnect()
                    } catch (_: Exception) {
                        // Best-effort — cloud cleanup is not critical for local reset
                    }
                }.start()
            }
        } catch (_: Exception) {}

        // 1. Clear all Room databases for all accounts
        val allAccounts = accountRegistry.getAllAccounts()
        for (account in allAccounts) {
            try {
                val dbName = "${AppDatabase.DATABASE_NAME}_${account.id}"
                deleteDatabase(dbName)
                // Also delete WAL/SHM files
                val dbPath = getDatabasePath(dbName).absolutePath
                java.io.File("${dbPath}-wal").delete()
                java.io.File("${dbPath}-shm").delete()
            } catch (_: Exception) {}
        }

        // Also delete the current account's DB
        try {
            val currentDbName = "${AppDatabase.DATABASE_NAME}_${prefsManager.accountId}"
            deleteDatabase(currentDbName)
            val dbPath = getDatabasePath(currentDbName).absolutePath
            java.io.File("${dbPath}-wal").delete()
            java.io.File("${dbPath}-shm").delete()
        } catch (_: Exception) {}

        // 2. Reset Room singleton
        AppDatabase.resetInstance()

        // 3. Clear all SharedPreferences
        prefsManager.clearAll()

        // 4. Clear account registry
        for (account in allAccounts) {
            accountRegistry.removeAccount(account.id)
        }

        // 5. Clear session
        sessionManager.resetSession()

        Toast.makeText(this, "Account reset. Restarting...", Toast.LENGTH_SHORT).show()

        // 6. Restart app → SetupWizard
        val intent = Intent(this, SplashActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finishAffinity()
    }

    private fun openWebConsole(path: String, title: String) {
        val intent = Intent(this, WebConsoleActivity::class.java)
        intent.putExtra(WebConsoleActivity.EXTRA_PATH, path)
        intent.putExtra(WebConsoleActivity.EXTRA_TITLE, title)
        startActivity(intent)
    }
}
