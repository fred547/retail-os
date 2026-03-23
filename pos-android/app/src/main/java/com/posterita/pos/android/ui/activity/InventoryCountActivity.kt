package com.posterita.pos.android.ui.activity

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.InventoryCountEntry
import com.posterita.pos.android.data.local.entity.InventoryCountSession
import com.posterita.pos.android.databinding.ActivityInventoryCountBinding
import com.posterita.pos.android.util.AppErrorLogger
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class InventoryCountActivity : AppCompatActivity() {

    private lateinit var binding: ActivityInventoryCountBinding

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    private var sessionId: Int = 0
    private val entries = mutableListOf<InventoryCountEntry>()
    private lateinit var adapter: EntryAdapter

    private val barcodeLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val barcode = result.data?.getStringExtra("BARCODE_RESULT") ?: return@registerForActivityResult
            handleBarcodeScan(barcode)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityInventoryCountBinding.inflate(layoutInflater)
        setContentView(binding.root)
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)

        sessionId = intent.getIntExtra("SESSION_ID", 0)

        binding.buttonBack.setOnClickListener { finish() }
        binding.buttonScan.setOnClickListener {
            barcodeLauncher.launch(Intent(this, ScanBarcodeActivity::class.java))
        }
        binding.buttonDone.setOnClickListener { finishSession() }

        adapter = EntryAdapter(entries,
            onIncrement = { entry -> updateQuantity(entry, 1) },
            onDecrement = { entry -> updateQuantity(entry, -1) }
        )
        binding.recyclerEntries.layoutManager = LinearLayoutManager(this)
        binding.recyclerEntries.adapter = adapter

        if (sessionId == 0) {
            // Create ad-hoc spot check session
            createAdHocSession()
        } else {
            loadSession()
        }
    }

    private fun createAdHocSession() {
        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                val session = InventoryCountSession(
                    session_id = (System.currentTimeMillis() % Int.MAX_VALUE).toInt(),
                    account_id = prefsManager.accountId,
                    store_id = prefsManager.storeId,
                    type = "spot_check",
                    status = "active",
                    name = "Spot Check",
                    started_at = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).format(java.util.Date()),
                    created_at = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).format(java.util.Date()),
                )
                db.inventoryCountSessionDao().insertOrUpdate(session)
                sessionId = session.session_id
            }
            updateUI()
        }
    }

    private fun loadSession() {
        lifecycleScope.launch {
            val session = withContext(Dispatchers.IO) {
                db.inventoryCountSessionDao().getSessionById(sessionId)
            }
            if (session != null) {
                binding.textTitle.text = session.name ?: "Inventory Count"
                binding.textSessionInfo.visibility = View.VISIBLE
                binding.textSessionInfo.text = "${if (session.type == "spot_check") "Spot Check" else "Full Count"}"
            }
            loadEntries()
        }
    }

    private fun loadEntries() {
        lifecycleScope.launch {
            val dbEntries = withContext(Dispatchers.IO) {
                db.inventoryCountEntryDao().getEntriesBySession(sessionId)
            }
            entries.clear()
            entries.addAll(dbEntries)
            adapter.notifyDataSetChanged()
            updateUI()
        }
    }

    private fun handleBarcodeScan(barcode: String) {
        lifecycleScope.launch {
            // Look up product by UPC
            val product = withContext(Dispatchers.IO) {
                db.productDao().getProductByUpc(barcode)
            }

            if (product == null) {
                Toast.makeText(this@InventoryCountActivity, "Product not found: $barcode", Toast.LENGTH_SHORT).show()
                return@launch
            }

            withContext(Dispatchers.IO) {
                // Check if already scanned in this session
                val existing = db.inventoryCountEntryDao().getEntryBySessionAndProduct(sessionId, product.product_id)
                if (existing != null) {
                    db.inventoryCountEntryDao().incrementQuantity(existing.entry_id)
                } else {
                    val entry = InventoryCountEntry(
                        session_id = sessionId,
                        account_id = prefsManager.accountId,
                        product_id = product.product_id,
                        product_name = product.name,
                        upc = product.upc,
                        quantity = 1,
                        scanned_by = sessionManager.user?.user_id ?: 0,
                        terminal_id = prefsManager.terminalId,
                    )
                    db.inventoryCountEntryDao().insert(entry)
                }
            }

            Toast.makeText(this@InventoryCountActivity, "${product.name} scanned", Toast.LENGTH_SHORT).show()
            loadEntries()
        }
    }

    private fun updateQuantity(entry: InventoryCountEntry, delta: Int) {
        val newQty = entry.quantity + delta
        if (newQty < 1) return

        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                val updated = entry.copy(quantity = newQty, is_synced = "N", scanned_at = System.currentTimeMillis())
                db.inventoryCountEntryDao().insert(updated)
            }
            loadEntries()
        }
    }

    private fun finishSession() {
        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                val now = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).format(java.util.Date())
                db.inventoryCountSessionDao().updateStatus(sessionId, "completed", now)
            }
            Toast.makeText(this@InventoryCountActivity, "Session completed — entries will sync to cloud", Toast.LENGTH_LONG).show()
            finish()
        }
    }

    private fun updateUI() {
        val productCount = entries.map { it.product_id }.distinct().size
        val totalQty = entries.sumOf { it.quantity }

        binding.textProductCount.text = productCount.toString()
        binding.textTotalQuantity.text = totalQty.toString()
        binding.textSessionInfo.visibility = View.VISIBLE
        binding.textSessionInfo.text = "Spot Check · $productCount products"

        binding.layoutEmpty.visibility = if (entries.isEmpty()) View.VISIBLE else View.GONE
        binding.recyclerEntries.visibility = if (entries.isEmpty()) View.GONE else View.VISIBLE
    }

    // --- Adapter ---

    private class EntryAdapter(
        private val entries: List<InventoryCountEntry>,
        private val onIncrement: (InventoryCountEntry) -> Unit,
        private val onDecrement: (InventoryCountEntry) -> Unit
    ) : RecyclerView.Adapter<EntryAdapter.ViewHolder>() {

        class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val card: MaterialCardView = view as MaterialCardView
            val textProductName: TextView = view.findViewById(R.id.textProductName)
            val textUpc: TextView = view.findViewById(R.id.textUpc)
            val textQuantity: TextView = view.findViewById(R.id.textQuantity)
            val buttonPlus: ImageView = view.findViewById(R.id.buttonPlus)
            val buttonMinus: ImageView = view.findViewById(R.id.buttonMinus)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_inventory_entry, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val entry = entries[position]
            holder.textProductName.text = entry.product_name ?: "Product #${entry.product_id}"
            holder.textUpc.text = entry.upc ?: "No barcode"
            holder.textQuantity.text = entry.quantity.toString()

            holder.buttonPlus.setOnClickListener { onIncrement(entry) }
            holder.buttonMinus.setOnClickListener { onDecrement(entry) }
        }

        override fun getItemCount() = entries.size
    }
}
