package com.posterita.pos.android.ui.activity

import android.app.Activity
import android.content.Intent
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
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
import com.posterita.pos.android.databinding.ActivityPickingBinding
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Picking list workflow:
 * 1. Load items to pick (from purchase order or manual entry)
 * 2. Scan each item to confirm picked
 * 3. Track progress (picked vs total)
 * 4. Mark complete when all items picked
 */
@AndroidEntryPoint
class PickingActivity : BaseActivity() {

    private lateinit var binding: ActivityPickingBinding

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    data class PickItem(
        val productId: Int,
        val productName: String,
        val upc: String?,
        val shelfLocation: String?,
        val requiredQty: Int,
        var pickedQty: Int = 0
    ) {
        val isComplete: Boolean get() = pickedQty >= requiredQty
    }

    private val pickItems = mutableListOf<PickItem>()
    private lateinit var adapter: PickItemAdapter

    private val barcodeLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val barcode = result.data?.getStringExtra("BARCODE_RESULT") ?: return@registerForActivityResult
            handleScan(barcode)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityPickingBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupHelpButton("picking")
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)

        binding.buttonBack.setOnClickListener { finish() }
        binding.buttonScan.setOnClickListener {
            barcodeLauncher.launch(Intent(this, ScanBarcodeActivity::class.java))
        }
        binding.buttonComplete.setOnClickListener { completePicking() }

        adapter = PickItemAdapter(pickItems)
        binding.recyclerItems.layoutManager = LinearLayoutManager(this)
        binding.recyclerItems.adapter = adapter

        // Load pick list source
        val source = intent.getStringExtra("SOURCE") ?: "all_products"
        when (source) {
            "purchase_order" -> loadFromPurchaseOrder(intent.getIntExtra("PO_ID", 0))
            "low_stock" -> loadLowStockItems()
            else -> loadLowStockItems() // Default: pick low stock items
        }
    }

    private fun loadLowStockItems() {
        binding.textTitle.text = "Pick List: Low Stock Replenishment"
        lifecycleScope.launch {
            val products = withContext(Dispatchers.IO) {
                db.productDao().getAllProductsSync()
            }
            val lowStock = products.filter { it.tracksStock && it.isLowStock }
            pickItems.clear()
            pickItems.addAll(lowStock.map { p ->
                val needed = (p.reorder_point - p.quantity_on_hand).toInt().coerceAtLeast(1)
                PickItem(
                    productId = p.product_id,
                    productName = p.name ?: "Product #${p.product_id}",
                    upc = p.upc,
                    shelfLocation = p.shelf_location,
                    requiredQty = needed
                )
            })
            adapter.notifyDataSetChanged()
            updateProgress()
        }
    }

    private fun loadFromPurchaseOrder(poId: Int) {
        binding.textTitle.text = "Pick List: PO #$poId"
        // PO lines would be loaded from server — for now show placeholder
        Toast.makeText(this, "PO picking: use web console for PO management", Toast.LENGTH_LONG).show()
    }

    private fun handleScan(barcode: String) {
        val item = pickItems.find { it.upc == barcode }
        if (item == null) {
            playErrorFeedback()
            Toast.makeText(this, "Not on pick list: $barcode", Toast.LENGTH_SHORT).show()
            return
        }
        if (item.isComplete) {
            Toast.makeText(this, "${item.productName} already fully picked", Toast.LENGTH_SHORT).show()
            return
        }
        item.pickedQty++
        playScanFeedback()
        adapter.notifyDataSetChanged()
        updateProgress()

        if (item.isComplete) {
            Toast.makeText(this, "${item.productName} ✓ complete", Toast.LENGTH_SHORT).show()
        }
    }

    private fun updateProgress() {
        val total = pickItems.size
        val done = pickItems.count { it.isComplete }
        binding.textProgress.text = "$done / $total picked"
        binding.progressBar.max = total
        binding.progressBar.progress = done
        binding.buttonComplete.isEnabled = done == total && total > 0
    }

    private fun completePicking() {
        Toast.makeText(this, "Picking complete — ${pickItems.size} items picked", Toast.LENGTH_LONG).show()
        finish()
    }

    private fun playScanFeedback() {
        try {
            ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80).startTone(ToneGenerator.TONE_PROP_ACK, 100)
            (getSystemService(VIBRATOR_SERVICE) as? Vibrator)?.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE))
        } catch (_: Exception) {}
    }

    private fun playErrorFeedback() {
        try {
            ToneGenerator(AudioManager.STREAM_NOTIFICATION, 80).startTone(ToneGenerator.TONE_PROP_NACK, 200)
            (getSystemService(VIBRATOR_SERVICE) as? Vibrator)?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 100, 50, 100), -1))
        } catch (_: Exception) {}
    }

    // --- Adapter ---

    private class PickItemAdapter(
        private val items: List<PickItem>
    ) : RecyclerView.Adapter<PickItemAdapter.VH>() {

        class VH(view: View) : RecyclerView.ViewHolder(view) {
            val card: MaterialCardView = view as MaterialCardView
            val textName: TextView = view.findViewById(R.id.textProductName)
            val textLocation: TextView = view.findViewById(R.id.textLocation)
            val textProgress: TextView = view.findViewById(R.id.textPickProgress)
            val iconDone: ImageView = view.findViewById(R.id.iconDone)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_pick_item, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val item = items[position]
            holder.textName.text = item.productName
            holder.textLocation.text = item.shelfLocation ?: item.upc ?: ""
            holder.textProgress.text = "${item.pickedQty} / ${item.requiredQty}"

            if (item.isComplete) {
                holder.iconDone.visibility = View.VISIBLE
                holder.textProgress.setTextColor(android.graphics.Color.parseColor("#10B981"))
                holder.card.strokeColor = android.graphics.Color.parseColor("#10B981")
            } else {
                holder.iconDone.visibility = View.GONE
                holder.textProgress.setTextColor(android.graphics.Color.parseColor("#6B7280"))
                holder.card.strokeColor = android.graphics.Color.parseColor("#E5E7EB")
            }
        }

        override fun getItemCount() = items.size
    }
}
