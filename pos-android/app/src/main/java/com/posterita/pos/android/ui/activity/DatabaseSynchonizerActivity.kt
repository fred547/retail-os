package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.databinding.ActivityDatabaseSynchonizerBinding
import com.posterita.pos.android.ui.viewmodel.SyncViewModel
import com.posterita.pos.android.util.ConnectivityMonitor
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class DatabaseSynchonizerActivity : AppCompatActivity() {

    private lateinit var binding: ActivityDatabaseSynchonizerBinding

    private val syncViewModel: SyncViewModel by viewModels()

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
        observeSyncResult()
        loadPendingCounts()
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

    private fun observeSyncResult() {
        syncViewModel.isLoading.observe(this) { isLoading ->
            binding.progressBar?.visibility = if (isLoading) View.VISIBLE else View.GONE
            if (isLoading) {
                binding.syncText?.text = "Synchronizing..."
                binding.buttonSyncNow?.isEnabled = false
                binding.buttonSyncNow?.text = "Syncing..."
            } else {
                binding.buttonSyncNow?.isEnabled = connectivityMonitor.isConnected.value == true
                binding.buttonSyncNow?.text = "Sync Now"
            }
        }

        syncViewModel.syncResult.observe(this) { result ->
            result.fold(
                onSuccess = {
                    binding.syncText?.text = "Sync complete"
                    binding.textLastSync?.text = "Last sync: Just now"
                    loadPendingCounts()
                    Toast.makeText(this, "Sync complete", Toast.LENGTH_SHORT).show()
                },
                onFailure = { error ->
                    val message = when {
                        error.message?.contains("resolve host") == true -> "Server unreachable — check your internet connection"
                        error.message?.contains("timeout") == true -> "Connection timed out — try again later"
                        error.message?.contains("401") == true -> "Authentication failed — please log in again"
                        else -> "Sync failed: ${error.message}"
                    }
                    binding.syncText?.text = message
                    Toast.makeText(this, message, Toast.LENGTH_LONG).show()
                }
            )
        }
    }

    private fun startSync() {
        syncViewModel.pullData()
    }

    private fun loadPendingCounts() {
        lifecycleScope.launch(Dispatchers.IO) {
            val pendingOrders = try { db.orderDao().getUnSyncedOrderCount() } catch (_: Exception) { 0 }
            val pendingTills = 0 // TODO: add getUnsyncedTillCount to TillDao
            val pendingAudit = try { db.auditEventDao().getUnsyncedEvents().size } catch (_: Exception) { 0 }

            withContext(Dispatchers.Main) {
                binding.textPendingOrders?.text = pendingOrders.toString()
                binding.textPendingTills?.text = pendingTills.toString()
                binding.textPendingAudit?.text = pendingAudit.toString()
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
