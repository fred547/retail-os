package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.InventoryCountSession
import com.posterita.pos.android.databinding.ActivityWarehouseHomeBinding
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class WarehouseHomeActivity : BaseActivity() {

    private lateinit var binding: ActivityWarehouseHomeBinding

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    private val sessions = mutableListOf<InventoryCountSession>()
    private lateinit var sessionAdapter: SessionAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityWarehouseHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)

        binding.buttonBack.setOnClickListener { finish() }

        // New count buttons
        binding.buttonSpotCheck.setOnClickListener {
            startActivity(Intent(this, InventoryCountActivity::class.java))
        }
        binding.buttonFullCount.setOnClickListener {
            showFullCountDialog()
        }
        binding.buttonAdjustStock.setOnClickListener {
            // Open inventory count activity which has the adjust stock dialog
            startActivity(Intent(this, InventoryCountActivity::class.java))
        }

        // Session list
        sessionAdapter = SessionAdapter(sessions) { session ->
            val intent = Intent(this, InventoryCountActivity::class.java)
            intent.putExtra("SESSION_ID", session.session_id)
            startActivity(intent)
        }
        binding.recyclerSessions.layoutManager = LinearLayoutManager(this)
        binding.recyclerSessions.adapter = sessionAdapter
    }

    override fun onResume() {
        super.onResume()
        loadData()
    }

    private fun loadData() {
        lifecycleScope.launch {
            // Load sessions
            val allSessions = withContext(Dispatchers.IO) {
                db.inventoryCountSessionDao().getAllSessions()
            }
            sessions.clear()
            sessions.addAll(allSessions.sortedByDescending { it.created_at })
            sessionAdapter.notifyDataSetChanged()

            binding.layoutEmptySessions.visibility = if (sessions.isEmpty()) View.VISIBLE else View.GONE
            binding.recyclerSessions.visibility = if (sessions.isEmpty()) View.GONE else View.VISIBLE

            // Load stock summary
            val products = withContext(Dispatchers.IO) {
                db.productDao().getAllProductsSync()
            }
            val tracked = products.filter { it.tracksStock }
            val lowStock = tracked.count { it.isLowStock }
            val outOfStock = tracked.count { it.isOutOfStock }

            binding.textTotalProducts.text = products.size.toString()
            binding.textLowStock.text = lowStock.toString()
            binding.textOutOfStock.text = outOfStock.toString()
        }
    }

    private fun showFullCountDialog() {
        val nameInput = android.widget.EditText(this).apply {
            hint = "Count name (e.g., Monthly Stocktake)"
            inputType = android.text.InputType.TYPE_TEXT_FLAG_CAP_WORDS
            setPadding(48, 24, 48, 24)
        }

        AlertDialog.Builder(this)
            .setTitle("Start Full Count")
            .setMessage("A full count requires counting every product in the store.")
            .setView(nameInput)
            .setPositiveButton("Start") { _, _ ->
                val name = nameInput.text.toString().trim().ifBlank { "Full Count" }
                createFullCountSession(name)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun createFullCountSession(name: String) {
        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                val session = InventoryCountSession(
                    session_id = (System.currentTimeMillis() % Int.MAX_VALUE).toInt(),
                    account_id = prefsManager.accountId,
                    store_id = prefsManager.storeId,
                    type = "full_count",
                    status = "active",
                    name = name,
                    assigned_to = sessionManager.user?.user_id,
                    started_at = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).format(java.util.Date()),
                    created_at = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).format(java.util.Date()),
                    created_by = sessionManager.user?.user_id ?: 0
                )
                db.inventoryCountSessionDao().insertOrUpdate(session)

                val intent = Intent(this@WarehouseHomeActivity, InventoryCountActivity::class.java)
                intent.putExtra("SESSION_ID", session.session_id)
                startActivity(intent)
            }
        }
    }

    // --- Session Adapter ---

    private class SessionAdapter(
        private val sessions: List<InventoryCountSession>,
        private val onClick: (InventoryCountSession) -> Unit
    ) : RecyclerView.Adapter<SessionAdapter.VH>() {

        class VH(view: View) : RecyclerView.ViewHolder(view) {
            val card: MaterialCardView = view as MaterialCardView
            val textName: TextView = view.findViewById(R.id.textSessionName)
            val textType: TextView = view.findViewById(R.id.textSessionType)
            val textStatus: TextView = view.findViewById(R.id.textSessionStatus)
            val textDate: TextView = view.findViewById(R.id.textSessionDate)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_inventory_session, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val session = sessions[position]
            holder.textName.text = session.name ?: "Count #${session.session_id}"
            holder.textType.text = if (session.type == "full_count") "Full Count" else "Spot Check"
            holder.textStatus.text = session.status.replaceFirstChar { it.uppercase() }
            holder.textDate.text = session.created_at?.substring(0, 10) ?: ""

            // Color-code status
            val statusColor = when (session.status) {
                "active" -> android.graphics.Color.parseColor("#10B981")
                "completed" -> android.graphics.Color.parseColor("#6B7280")
                "cancelled" -> android.graphics.Color.parseColor("#EF4444")
                else -> android.graphics.Color.parseColor("#3B82F6")
            }
            holder.textStatus.setTextColor(statusColor)

            holder.card.setOnClickListener { onClick(session) }
        }

        override fun getItemCount() = sessions.size
    }
}
