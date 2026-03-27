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
import android.media.ToneGenerator
import android.media.AudioManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.widget.EditText
import android.widget.LinearLayout
import androidx.appcompat.app.AlertDialog
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class InventoryCountActivity : BaseActivity() {

    private lateinit var binding: ActivityInventoryCountBinding

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor
    @Inject lateinit var stockAdjustmentService: com.posterita.pos.android.service.StockAdjustmentService

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
        binding.buttonDone.setOnClickListener { showFinishDialog() }
        binding.buttonAdjust.setOnClickListener { showStockAdjustDialog() }

        // Long-press Done to export CSV
        binding.buttonDone.setOnLongClickListener {
            exportSessionToCsv()
            true
        }

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
                playErrorFeedback()
                Toast.makeText(this@InventoryCountActivity, "Product not found: $barcode", Toast.LENGTH_SHORT).show()
                return@launch
            }

            withContext(Dispatchers.IO) {
                // Check if already scanned in this session
                val existing = db.inventoryCountEntryDao().getEntryBySessionAndProduct(sessionId, product.product_id)
                val systemQty = product.quantity_on_hand
                if (existing != null) {
                    db.inventoryCountEntryDao().incrementQuantity(existing.entry_id)
                    // Update variance: new counted qty - system qty
                    val newQty = existing.quantity + 1
                    val updatedEntry = existing.copy(
                        quantity = newQty,
                        variance = newQty.toDouble() - systemQty,
                        is_synced = "N",
                        scanned_at = System.currentTimeMillis()
                    )
                    db.inventoryCountEntryDao().insert(updatedEntry)
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
                        system_qty = systemQty,
                        variance = 1.0 - systemQty
                    )
                    db.inventoryCountEntryDao().insert(entry)
                }
            }

            // Audio + haptic feedback on successful scan
            playScanFeedback()
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

    /**
     * Show finish dialog with option to apply counted quantities to stock.
     */
    private fun showFinishDialog() {
        if (entries.isEmpty()) {
            finishSession()
            return
        }
        AlertDialog.Builder(this)
            .setTitle("Complete Count")
            .setMessage("Apply counted quantities to stock levels?\n\nThis will set product quantities to the counted values.")
            .setPositiveButton("Apply & Complete") { _, _ ->
                applyCountAndFinish()
            }
            .setNeutralButton("Complete Only") { _, _ ->
                finishSession()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun applyCountAndFinish() {
        lifecycleScope.launch {
            val storeId = prefsManager.storeId
            val userId = sessionManager.user?.user_id ?: 0
            val sessionName = binding.textTitle.text.toString()

            val entryPairs = entries.map { it.product_id to it.quantity }

            val reconciled = withContext(Dispatchers.IO) {
                stockAdjustmentService.reconcileCount(entryPairs, storeId, userId, sessionName)
            }

            Toast.makeText(
                this@InventoryCountActivity,
                "Reconciled $reconciled/${entryPairs.size} products",
                Toast.LENGTH_SHORT
            ).show()

            finishSession()
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

    /**
     * Manual stock adjustment dialog: search product → set new quantity.
     */
    private fun showStockAdjustDialog() {
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48, 24, 48, 24)
        }

        val barcodeInput = EditText(this).apply {
            hint = "Product barcode (UPC)"
            inputType = android.text.InputType.TYPE_CLASS_TEXT
        }
        container.addView(barcodeInput)

        val qtyInput = EditText(this).apply {
            hint = "New quantity"
            inputType = android.text.InputType.TYPE_CLASS_NUMBER or android.text.InputType.TYPE_NUMBER_FLAG_DECIMAL
        }
        container.addView(qtyInput)

        val notesInput = EditText(this).apply {
            hint = "Reason (optional)"
            inputType = android.text.InputType.TYPE_CLASS_TEXT
        }
        container.addView(notesInput)

        AlertDialog.Builder(this)
            .setTitle("Adjust Stock")
            .setView(container)
            .setPositiveButton("Adjust") { _, _ ->
                val barcode = barcodeInput.text.toString().trim()
                val qty = qtyInput.text.toString().toDoubleOrNull() ?: return@setPositiveButton
                val notes = notesInput.text.toString().trim().ifBlank { null }

                lifecycleScope.launch {
                    val product = withContext(Dispatchers.IO) {
                        db.productDao().getProductByUpc(barcode)
                    }
                    if (product == null) {
                        Toast.makeText(this@InventoryCountActivity, "Product not found: $barcode", Toast.LENGTH_SHORT).show()
                        return@launch
                    }

                    val result = withContext(Dispatchers.IO) {
                        stockAdjustmentService.adjustStock(
                            productId = product.product_id,
                            storeId = prefsManager.storeId,
                            newQuantity = qty,
                            reason = "adjustment",
                            notes = notes,
                            userId = sessionManager.user?.user_id ?: 0
                        )
                    }

                    if (result.success) {
                        // Update local product quantity
                        withContext(Dispatchers.IO) {
                            db.productDao().updateStockQuantity(product.product_id, qty)
                        }
                        Toast.makeText(this@InventoryCountActivity, "${product.name}: stock set to ${qty.toInt()}", Toast.LENGTH_SHORT).show()
                    } else {
                        Toast.makeText(this@InventoryCountActivity, "Failed: ${result.error}", Toast.LENGTH_SHORT).show()
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
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

    // --- CSV Export ---

    private fun exportSessionToCsv() {
        if (entries.isEmpty()) {
            Toast.makeText(this, "No entries to export", Toast.LENGTH_SHORT).show()
            return
        }

        lifecycleScope.launch {
            try {
                val csv = buildString {
                    appendLine("Product Name,UPC,Counted Qty,System Qty,Variance")
                    for (entry in entries) {
                        val name = (entry.product_name ?: "").replace(",", " ")
                        val upc = entry.upc ?: ""
                        appendLine("$name,$upc,${entry.quantity},${entry.system_qty.toInt()},${entry.variance.toInt()}")
                    }
                }

                val fileName = "inventory_count_${sessionId}_${System.currentTimeMillis()}.csv"
                val file = java.io.File(getExternalFilesDir(null), fileName)
                file.writeText(csv)

                // Share via intent
                val uri = androidx.core.content.FileProvider.getUriForFile(
                    this@InventoryCountActivity,
                    "${packageName}.fileprovider",
                    file
                )
                val shareIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "text/csv"
                    putExtra(Intent.EXTRA_STREAM, uri)
                    putExtra(Intent.EXTRA_SUBJECT, "Inventory Count #$sessionId")
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                startActivity(Intent.createChooser(shareIntent, "Export Count"))
            } catch (e: Exception) {
                Toast.makeText(this@InventoryCountActivity, "Export failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // --- Audio/Haptic Feedback ---

    private fun playScanFeedback() {
        try {
            // Short beep
            val toneGen = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80)
            toneGen.startTone(ToneGenerator.TONE_PROP_ACK, 100)
            // Haptic vibration
            val vibrator = getSystemService(VIBRATOR_SERVICE) as? Vibrator
            vibrator?.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE))
        } catch (_: Exception) { /* audio/vibrate not critical */ }
    }

    private fun playErrorFeedback() {
        try {
            val toneGen = ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80)
            toneGen.startTone(ToneGenerator.TONE_PROP_NACK, 200)
            val vibrator = getSystemService(VIBRATOR_SERVICE) as? Vibrator
            vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 100, 50, 100), -1))
        } catch (_: Exception) { /* audio/vibrate not critical */ }
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
            val textVariance: TextView = view.findViewById(R.id.textVariance)
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

            // Show variance: system qty vs counted
            val sysQty = entry.system_qty
            val diff = entry.variance
            if (sysQty > 0 || diff != 0.0) {
                val diffSign = if (diff > 0) "+" else ""
                holder.textVariance.text = "System: ${sysQty.toInt()} | Diff: $diffSign${diff.toInt()}"
                holder.textVariance.visibility = View.VISIBLE
                // Color: green if match/positive, red if negative
                val color = when {
                    diff == 0.0 -> android.graphics.Color.parseColor("#10B981") // match
                    diff > 0 -> android.graphics.Color.parseColor("#3B82F6")     // surplus
                    else -> android.graphics.Color.parseColor("#EF4444")          // shortage
                }
                holder.textVariance.setTextColor(color)
            } else {
                holder.textVariance.visibility = View.GONE
            }

            holder.buttonPlus.setOnClickListener { onIncrement(entry) }
            holder.buttonMinus.setOnClickListener { onDecrement(entry) }
        }

        override fun getItemCount() = entries.size
    }
}
