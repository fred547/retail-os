package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.databinding.ActivityDatabaseSynchonizerBinding
import com.posterita.pos.android.service.SyncStatusManager
import com.posterita.pos.android.util.ConnectivityMonitor
import com.posterita.pos.android.util.SharedPreferencesManager
import com.posterita.pos.android.worker.CloudSyncWorker
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class DatabaseSynchonizerActivity : AppCompatActivity() {

    private lateinit var binding: ActivityDatabaseSynchonizerBinding

    @Inject lateinit var connectivityMonitor: ConnectivityMonitor
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var db: AppDatabase

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDatabaseSynchonizerBinding.inflate(layoutInflater)
        setContentView(binding.root)
        supportActionBar?.hide()

        binding.buttonBack?.setOnClickListener { finish() }

        setupConnectivityObserver()
        observeSyncStatus()
        loadPendingCounts()
        loadDbCounts()
        showServerInfo()

        // Don't auto-sync — let user tap Sync Now
        binding.buttonSyncNow?.setOnClickListener {
            if (connectivityMonitor.isConnected.value == true) {
                startSync()
            } else {
                Toast.makeText(this, "You're offline — connect to the internet first", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun setupConnectivityObserver() {
        connectivityMonitor.isConnected.observe(this) { connected ->
            val card = binding.cardConnectionStatus ?: return@observe

            if (connected) {
                card.setCardBackgroundColor(resources.getColor(R.color.posterita_secondary_light, theme))
                binding.iconConnection?.setColorFilter(resources.getColor(R.color.posterita_secondary, theme))
                binding.textConnectionTitle?.text = "Online"
                binding.textConnectionTitle?.setTextColor(resources.getColor(R.color.posterita_secondary, theme))
                binding.textConnectionSubtitle?.text = "Connected to server"
                binding.textConnectionSubtitle?.setTextColor(resources.getColor(R.color.posterita_secondary, theme))
                binding.buttonSyncNow?.isEnabled = true
                binding.buttonSyncNow?.alpha = 1f
            } else {
                card.setCardBackgroundColor(resources.getColor(R.color.posterita_error_light, theme))
                binding.iconConnection?.setColorFilter(resources.getColor(R.color.posterita_error, theme))
                binding.textConnectionTitle?.text = "Offline"
                binding.textConnectionTitle?.setTextColor(resources.getColor(R.color.posterita_error, theme))
                binding.textConnectionSubtitle?.text = "No internet connection — data is saved locally"
                binding.textConnectionSubtitle?.setTextColor(resources.getColor(R.color.posterita_error, theme))
                binding.buttonSyncNow?.isEnabled = false
                binding.buttonSyncNow?.alpha = 0.5f
            }

            // Update connectivity dot
            val dot = binding.connectivityDot
            if (dot != null) {
                val dotColor = if (connected) R.color.posterita_secondary else R.color.posterita_error
                val bg = dot.background
                if (bg is android.graphics.drawable.GradientDrawable) {
                    bg.setColor(resources.getColor(dotColor, theme))
                }
            }
        }
    }

    private fun observeSyncStatus() {
        lifecycleScope.launch {
            SyncStatusManager.status.collect { status ->
                when (status.state) {
                    SyncStatusManager.SyncState.IDLE -> {
                        binding.progressBar?.visibility = View.GONE
                        binding.buttonSyncNow?.isEnabled = connectivityMonitor.isConnected.value == true
                        binding.buttonSyncNow?.text = "Sync Now"
                    }
                    SyncStatusManager.SyncState.COMPLETE -> {
                        binding.progressBar?.visibility = View.GONE
                        binding.buttonSyncNow?.isEnabled = connectivityMonitor.isConnected.value == true
                        binding.buttonSyncNow?.text = "Sync Now"
                        binding.textLastSync?.text = "Last sync: Just now"

                        // Show detailed summary with direction
                        val summary = status.summary
                        if (summary != null) {
                            val sb = StringBuilder()
                            sb.append("✓ Sync complete\n\n")

                            // Sent (↑)
                            val sentParts = mutableListOf<String>()
                            if (summary.ordersPushed > 0) sentParts.add("${summary.ordersPushed} orders")
                            if (summary.orderLinesPushed > 0) sentParts.add("${summary.orderLinesPushed} order lines")
                            if (summary.tillsPushed > 0) sentParts.add("${summary.tillsPushed} tills")
                            if (sentParts.isNotEmpty()) {
                                sb.append("↑ SENT: ${sentParts.joinToString(", ")}\n")
                            } else {
                                sb.append("↑ SENT: Nothing to send\n")
                            }

                            // Received (↓)
                            val recvParts = mutableListOf<String>()
                            if (summary.productsPulled > 0) recvParts.add("${summary.productsPulled} products")
                            if (summary.categoriesPulled > 0) recvParts.add("${summary.categoriesPulled} categories")
                            if (summary.taxesPulled > 0) recvParts.add("${summary.taxesPulled} taxes")
                            if (summary.usersPulled > 0) recvParts.add("${summary.usersPulled} users")
                            if (summary.storesPulled > 0) recvParts.add("${summary.storesPulled} stores")
                            if (summary.terminalsPulled > 0) recvParts.add("${summary.terminalsPulled} terminals")
                            if (summary.customersPulled > 0) recvParts.add("${summary.customersPulled} customers")
                            if (summary.modifiersPulled > 0) recvParts.add("${summary.modifiersPulled} modifiers")
                            if (summary.discountCodesPulled > 0) recvParts.add("${summary.discountCodesPulled} discount codes")
                            if (summary.preferencesPulled > 0) recvParts.add("${summary.preferencesPulled} preferences")
                            if (summary.tablesPulled > 0) recvParts.add("${summary.tablesPulled} tables")
                            if (recvParts.isNotEmpty()) {
                                sb.append("↓ RECEIVED: ${recvParts.joinToString(", ")}\n")
                            } else {
                                sb.append("↓ RECEIVED: Everything up to date\n")
                            }

                            if (summary.errors.isNotEmpty()) {
                                sb.append("\n⚠ ${summary.errors.size} error(s)")
                            }

                            if (summary.durationMs > 0) {
                                sb.append("\nDuration: ${summary.durationMs / 1000.0}s")
                            }

                            binding.syncText?.text = sb.toString()
                        } else {
                            binding.syncText?.text = "✓ Sync complete"
                        }
                        loadPendingCounts()
                        loadDbCounts()
                    }
                    SyncStatusManager.SyncState.ERROR -> {
                        binding.progressBar?.visibility = View.GONE
                        binding.syncText?.text = "✗ ${status.errorMessage ?: "Sync failed"}"
                        binding.buttonSyncNow?.isEnabled = connectivityMonitor.isConnected.value == true
                        binding.buttonSyncNow?.text = "Retry"
                    }
                    else -> {
                        binding.progressBar?.visibility = View.VISIBLE
                        binding.syncText?.text = status.message.ifEmpty { "Synchronizing..." }
                        if (status.progressDetail.isNotEmpty()) {
                            binding.syncText?.append("\n${status.progressDetail}")
                        }
                        binding.buttonSyncNow?.isEnabled = false
                        binding.buttonSyncNow?.text = "Syncing..."
                    }
                }
            }
        }
    }

    private fun startSync() {
        CloudSyncWorker.syncNow(this)
        Toast.makeText(this, "Cloud sync started", Toast.LENGTH_SHORT).show()
    }

    private fun loadPendingCounts() {
        lifecycleScope.launch(Dispatchers.IO) {
            val pendingOrders = try { db.orderDao().getUnSyncedOrderCount() } catch (_: Exception) { 0 }
            val pendingTills = try {
                db.tillDao().getClosedTillByTerminalId(prefsManager.terminalId)
                    .count { !it.isSync }
            } catch (_: Exception) { 0 }
            val pendingAudit = try { db.auditEventDao().getUnsyncedEvents().size } catch (_: Exception) { 0 }

            withContext(Dispatchers.Main) {
                binding.textPendingOrders?.text = pendingOrders.toString()
                binding.textPendingTills?.text = pendingTills.toString()
                binding.textPendingAudit?.text = pendingAudit.toString()
            }
        }
    }

    private fun loadDbCounts() {
        lifecycleScope.launch(Dispatchers.IO) {
            data class DbRow(val label: String, val count: Int)

            val rows = mutableListOf<DbRow>()
            try {
                rows.add(DbRow("Products", db.productDao().getAllProductsSync().size))
                rows.add(DbRow("Categories", db.productCategoryDao().getAllProductCategoriesSync().size))
                rows.add(DbRow("Taxes", db.taxDao().getAllTaxesSync().size))
                rows.add(DbRow("Modifiers", db.modifierDao().getAllModifiers().size))
                rows.add(DbRow("Customers", db.customerDao().getAllCustomersSync().size))
                rows.add(DbRow("Users", db.userDao().getAllUsers().size))
                rows.add(DbRow("Stores", db.storeDao().getAllStores().size))
                rows.add(DbRow("Terminals", db.terminalDao().getAllTerminals().size))
                rows.add(DbRow("Orders", db.orderDao().getAllOrders().size))
                rows.add(DbRow("Preferences", db.preferenceDao().getAllPreferences().size))
                rows.add(DbRow("Printers", db.printerDao().getAllPrinters().size))
                val unsentErrors = try { db.errorLogDao().getUnsyncedCount() } catch (_: Exception) { 0 }
                val recentErrors = try { db.errorLogDao().getRecentLogs(999).size } catch (_: Exception) { 0 }
                rows.add(DbRow("⚠ Errors (unsent)", unsentErrors))
                rows.add(DbRow("⚠ Errors (total)", recentErrors))
            } catch (_: Exception) {}

            withContext(Dispatchers.Main) {
                val container = binding.layoutDbCounts ?: return@withContext
                container.removeAllViews()

                for (row in rows) {
                    val rowView = LinearLayout(this@DatabaseSynchonizerActivity).apply {
                        orientation = LinearLayout.HORIZONTAL
                        setPadding(0, 6, 0, 6)
                    }

                    val labelView = TextView(this@DatabaseSynchonizerActivity).apply {
                        text = row.label
                        setTextColor(getColor(R.color.posterita_muted))
                        textSize = 14f
                        layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                    }

                    val countView = TextView(this@DatabaseSynchonizerActivity).apply {
                        text = row.count.toString()
                        setTextColor(if (row.count > 0) getColor(R.color.posterita_ink) else getColor(R.color.posterita_line))
                        textSize = 14f
                        typeface = android.graphics.Typeface.DEFAULT_BOLD
                    }

                    rowView.addView(labelView)
                    rowView.addView(countView)
                    container.addView(rowView)
                }
            }
        }
    }

    private fun showServerInfo() {
        val baseUrl = prefsManager.baseUrl
        val cloudUrl = prefsManager.cloudSyncUrl
        binding.textServerUrl?.text = "API: $baseUrl\nCloud: $cloudUrl"

        // Last sync
        val lastSync = prefsManager.getString("cloud_last_sync_at", "")
        binding.textLastSync?.text = if (lastSync.isNotBlank() && lastSync != "1970-01-01T00:00:00.000Z") {
            "Last sync: $lastSync"
        } else {
            "Last sync: Never"
        }
    }
}
