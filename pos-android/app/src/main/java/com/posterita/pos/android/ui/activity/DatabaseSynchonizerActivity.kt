package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
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
class DatabaseSynchonizerActivity : BaseActivity() {

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
                            val hasErrors = summary.errors.isNotEmpty()
                            sb.append(if (hasErrors) "⚠ Sync completed with errors\n\n" else "✓ Sync complete\n\n")

                            // Sent (↑)
                            val sentParts = mutableListOf<String>()
                            if (summary.ordersPushed > 0) sentParts.add("${summary.ordersPushed} orders")
                            if (summary.orderLinesPushed > 0) sentParts.add("${summary.orderLinesPushed} lines")
                            if (summary.tillsPushed > 0) sentParts.add("${summary.tillsPushed} tills")
                            sb.append("↑ SENT: ${if (sentParts.isNotEmpty()) sentParts.joinToString(", ") else "Nothing to send"}\n")

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
                            if (summary.discountCodesPulled > 0) recvParts.add("${summary.discountCodesPulled} discounts")
                            if (summary.preferencesPulled > 0) recvParts.add("${summary.preferencesPulled} prefs")
                            if (summary.tablesPulled > 0) recvParts.add("${summary.tablesPulled} tables")
                            if (summary.sectionsPulled > 0) recvParts.add("${summary.sectionsPulled} sections")
                            if (summary.stationsPulled > 0) recvParts.add("${summary.stationsPulled} stations")
                            sb.append("↓ RECEIVED: ${if (recvParts.isNotEmpty()) recvParts.joinToString(", ") else "Up to date"}\n")

                            // Pending after sync
                            val pending = status.pendingOrders + status.pendingTills
                            if (pending > 0) {
                                sb.append("\n⏳ STILL PENDING: ")
                                val pendParts = mutableListOf<String>()
                                if (status.pendingOrders > 0) pendParts.add("${status.pendingOrders} orders")
                                if (status.pendingTills > 0) pendParts.add("${status.pendingTills} tills")
                                sb.append(pendParts.joinToString(", "))
                                sb.append("\n")
                            }

                            // Errors
                            if (hasErrors) {
                                sb.append("\n✗ ERRORS (${summary.errors.size}):\n")
                                for (err in summary.errors.take(5)) {
                                    sb.append("  • $err\n")
                                }
                                if (summary.errors.size > 5) {
                                    sb.append("  ... and ${summary.errors.size - 5} more\n")
                                }
                            }

                            sb.append("\nDuration: ${summary.durationMs / 1000.0}s")

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
            val unsyncedTills = try { db.tillDao().getAllUnsyncedTills() } catch (_: Exception) { emptyList() }
            val pendingTills = unsyncedTills.size
            val failedTills = unsyncedTills.count { it.syncErrorMessage != null }
            val pendingAudit = try { db.auditEventDao().getUnsyncedEvents().size } catch (_: Exception) { 0 }

            // Update SyncStatusManager so drawer also shows pending
            SyncStatusManager.updatePendingCounts(pendingOrders, pendingTills)

            withContext(Dispatchers.Main) {
                binding.textPendingOrders?.text = pendingOrders.toString()
                binding.textPendingTills?.text = if (failedTills > 0) "$pendingTills ($failedTills failed)" else pendingTills.toString()
                binding.textPendingAudit?.text = pendingAudit.toString()

                // Show failed item details
                val failedItems = unsyncedTills.filter { it.syncErrorMessage != null }
                if (failedItems.isNotEmpty()) {
                    showFailedItems(failedItems)
                }
            }
        }
    }

    private fun showFailedItems(failedTills: List<com.posterita.pos.android.data.local.entity.Till>) {
        val container = binding.layoutDbCounts ?: return

        // Add a "Failed Items" header before the DB counts
        val header = TextView(this).apply {
            text = "⚠ FAILED SYNC ITEMS"
            textSize = 12f
            setTypeface(null, android.graphics.Typeface.BOLD)
            setTextColor(0xFFE53935.toInt())
            setPadding(0, 16, 0, 8)
        }

        // Insert at top of container
        container.addView(header, 0)
        var insertIndex = 1

        for (till in failedTills) {
            val row = TextView(this).apply {
                text = "Till ${till.documentno ?: till.uuid?.take(8)}: ${till.syncErrorMessage}"
                textSize = 11f
                setTextColor(0xFFE53935.toInt())
                setPadding(0, 2, 0, 2)
            }
            container.addView(row, insertIndex++)
        }

        // Divider
        val divider = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 1
            ).apply { topMargin = 8; bottomMargin = 8 }
            setBackgroundColor(0xFFE0E0E0.toInt())
        }
        container.addView(divider, insertIndex)
    }

    private fun loadDbCounts() {
        lifecycleScope.launch(Dispatchers.IO) {
            data class DbRow(val label: String, val count: Int, val color: Int = 0xFF141414.toInt())

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

            // MRA e-invoicing status (fetch from cloud — separate try block)
            val mraRows = mutableListOf<DbRow>()
                try {
                    val baseUrl = prefsManager.cloudSyncUrl.trimEnd('/')
                    val accountId = prefsManager.accountId
                    val url = java.net.URL("${baseUrl}/data")
                    val conn = url.openConnection() as java.net.HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.connectTimeout = 5000
                    conn.readTimeout = 5000
                    conn.doOutput = true
                    // Count orders by MRA status
                    val body = """{"table":"orders","select":"mra_status","filters":[{"column":"account_id","op":"eq","value":"$accountId"}]}"""
                    conn.outputStream.write(body.toByteArray())
                    if (conn.responseCode == 200) {
                        val response = conn.inputStream.bufferedReader().readText()
                        val json = org.json.JSONObject(response)
                        val data = json.optJSONArray("data")
                        if (data != null) {
                            var filed = 0; var pending = 0; var failed = 0; var exempt = 0
                            for (i in 0 until data.length()) {
                                when (data.getJSONObject(i).optString("mra_status")) {
                                    "filed" -> filed++
                                    "pending" -> pending++
                                    "failed" -> failed++
                                    "exempt" -> exempt++
                                }
                            }
                            if (filed + pending + failed > 0) { // only show if MRA is active
                                mraRows.add(DbRow("📋 MRA Filed", filed, 0xFF2E7D32.toInt()))
                                if (pending > 0) mraRows.add(DbRow("📋 MRA Pending", pending, 0xFFF57F17.toInt()))
                                if (failed > 0) mraRows.add(DbRow("📋 MRA Failed", failed, 0xFFE53935.toInt()))
                                if (exempt > 0) mraRows.add(DbRow("📋 MRA Exempt", exempt, 0xFF999999.toInt()))
                            }
                        }
                    }
                    conn.disconnect()
                } catch (_: Exception) {} // don't fail if cloud unreachable

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
                        setTextColor(if (row.count > 0) row.color else getColor(R.color.posterita_line))
                        textSize = 14f
                        typeface = android.graphics.Typeface.DEFAULT_BOLD
                    }

                    rowView.addView(labelView)
                    rowView.addView(countView)
                    container.addView(rowView)
                }

                // MRA section
                if (mraRows.isNotEmpty()) {
                    val divider = View(this@DatabaseSynchonizerActivity).apply {
                        layoutParams = LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 1).apply {
                            topMargin = 12; bottomMargin = 8
                        }
                        setBackgroundColor(0xFFE0E0E0.toInt())
                    }
                    container.addView(divider)

                    val header = TextView(this@DatabaseSynchonizerActivity).apply {
                        text = "MRA E-INVOICING"
                        textSize = 11f
                        setTypeface(null, android.graphics.Typeface.BOLD)
                        setTextColor(0xFF6C6F76.toInt())
                        letterSpacing = 0.1f
                        setPadding(0, 0, 0, 4)
                    }
                    container.addView(header)

                    for (row in mraRows) {
                        val rv = LinearLayout(this@DatabaseSynchonizerActivity).apply {
                            orientation = LinearLayout.HORIZONTAL; setPadding(0, 4, 0, 4)
                        }
                        rv.addView(TextView(this@DatabaseSynchonizerActivity).apply {
                            text = row.label; setTextColor(row.color); textSize = 14f
                            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                        })
                        rv.addView(TextView(this@DatabaseSynchonizerActivity).apply {
                            text = row.count.toString(); setTextColor(row.color); textSize = 14f
                            typeface = android.graphics.Typeface.DEFAULT_BOLD
                        })
                        container.addView(rv)
                    }
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
