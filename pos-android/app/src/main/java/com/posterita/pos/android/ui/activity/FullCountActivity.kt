package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.media.AudioManager
import android.media.ToneGenerator
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.CountScan
import com.posterita.pos.android.databinding.ActivityFullCountBinding
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

/**
 * Full Stock Count — scan items shelf-by-shelf.
 *
 * User selects shelf number + height (e.g., Shelf 15-C), then scans barcodes
 * or taps "+1 Unknown" for items without barcodes. All scans are stored locally
 * in Room and synced to the server via /api/stock-count/{planId}/scans.
 *
 * Last scan per staff per location wins (by timestamp).
 */
@AndroidEntryPoint
class FullCountActivity : BaseActivity() {

    private lateinit var binding: ActivityFullCountBinding

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    private var planId: Int = 0
    private var planName: String = ""
    private var currentShelf: Int = 1
    private var currentHeightIndex: Int = 0
    private val heights = listOf("A", "B", "C", "D", "E", "F", "G")

    private val scans = mutableListOf<CountScan>()
    private lateinit var scanAdapter: ScanAdapter

    private val toneGenerator by lazy { ToneGenerator(AudioManager.STREAM_NOTIFICATION, 100) }
    private val vibrator by lazy { getSystemService(Vibrator::class.java) }

    private val barcodeLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        if (result.resultCode == RESULT_OK) {
            val barcode = result.data?.getStringExtra("BARCODE") ?: return@registerForActivityResult
            handleBarcodeScan(barcode)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityFullCountBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupHelpButton("full_count")
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)

        planId = intent.getIntExtra("PLAN_ID", 0)
        planName = intent.getStringExtra("PLAN_NAME") ?: "Full Count"
        binding.textTitle.text = planName

        binding.buttonBack.setOnClickListener { finish() }

        // Shelf +/- buttons
        binding.buttonShelfMinus.setOnClickListener { if (currentShelf > 1) { currentShelf--; updateLocation() } }
        binding.buttonShelfPlus.setOnClickListener { currentShelf++; updateLocation() }

        // Height +/- buttons
        binding.buttonHeightMinus.setOnClickListener { if (currentHeightIndex > 0) { currentHeightIndex--; updateLocation() } }
        binding.buttonHeightPlus.setOnClickListener { if (currentHeightIndex < heights.size - 1) { currentHeightIndex++; updateLocation() } }

        // Scan button
        binding.buttonScan.setOnClickListener {
            val intent = Intent(this, ScanBarcodeActivity::class.java)
            barcodeLauncher.launch(intent)
        }

        // +1 Unknown button
        binding.buttonAddUnknown.setOnClickListener { addUnknownItem() }

        // Sync button
        binding.buttonSync.setOnClickListener { syncScans() }

        // Scans list
        scanAdapter = ScanAdapter(scans)
        binding.recyclerScans.layoutManager = LinearLayoutManager(this)
        binding.recyclerScans.adapter = scanAdapter

        updateLocation()
    }

    override fun onResume() {
        super.onResume()
        loadScansForCurrentLocation()
    }

    private fun updateLocation() {
        binding.textShelf.text = currentShelf.toString()
        binding.textHeight.text = heights[currentHeightIndex]
        loadScansForCurrentLocation()
    }

    private fun loadScansForCurrentLocation() {
        lifecycleScope.launch {
            val height = heights[currentHeightIndex]
            val locationScans = withContext(Dispatchers.IO) {
                db.countScanDao().getByLocation(planId, currentShelf, height)
            }
            scans.clear()
            scans.addAll(locationScans)
            scanAdapter.notifyDataSetChanged()

            val count = scans.sumOf { it.quantity }
            val unknowns = scans.count { it.is_unknown }
            binding.textLocationSummary.text = "Shelf $currentShelf-$height: $count items${if (unknowns > 0) " ($unknowns unknown)" else ""}"

            binding.layoutEmpty.visibility = if (scans.isEmpty()) View.VISIBLE else View.GONE
            binding.recyclerScans.visibility = if (scans.isEmpty()) View.GONE else View.VISIBLE

            // Update sync badge
            val unsyncedTotal = withContext(Dispatchers.IO) {
                db.countScanDao().getUnsynced(planId).size
            }
            binding.buttonSync.text = if (unsyncedTotal > 0) "Sync ($unsyncedTotal)" else "Synced"
        }
    }

    private fun handleBarcodeScan(barcode: String) {
        lifecycleScope.launch {
            val product = withContext(Dispatchers.IO) {
                db.productDao().getProductByUpc(barcode)
            }

            val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }.format(Date())

            val userId = sessionManager.user?.user_id ?: prefsManager.userId
            val userName = sessionManager.user?.firstname ?: "Staff"

            val scan = CountScan(
                plan_id = planId,
                account_id = prefsManager.accountId,
                user_id = userId,
                user_name = userName,
                shelf = currentShelf,
                height = heights[currentHeightIndex],
                product_id = product?.product_id,
                barcode = barcode,
                product_name = product?.name ?: "Unknown ($barcode)",
                quantity = 1,
                is_unknown = product == null,
                scanned_at = now,
            )

            withContext(Dispatchers.IO) {
                db.countScanDao().insert(scan)
            }

            // Feedback
            toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP, 100)
            vibrator?.vibrate(VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE))

            if (product == null) {
                Toast.makeText(this@FullCountActivity, "Unknown barcode: $barcode", Toast.LENGTH_SHORT).show()
            }

            loadScansForCurrentLocation()
        }
    }

    private fun addUnknownItem() {
        lifecycleScope.launch {
            val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }.format(Date())

            val userId = sessionManager.user?.user_id ?: prefsManager.userId
            val userName = sessionManager.user?.firstname ?: "Staff"

            val scan = CountScan(
                plan_id = planId,
                account_id = prefsManager.accountId,
                user_id = userId,
                user_name = userName,
                shelf = currentShelf,
                height = heights[currentHeightIndex],
                quantity = 1,
                is_unknown = true,
                product_name = "Unknown item (no barcode)",
                scanned_at = now,
            )

            withContext(Dispatchers.IO) {
                db.countScanDao().insert(scan)
            }

            // Amber feedback
            vibrator?.vibrate(VibrationEffect.createOneShot(50, VibrationEffect.DEFAULT_AMPLITUDE))
            Toast.makeText(this@FullCountActivity, "+1 unknown at Shelf $currentShelf-${heights[currentHeightIndex]}", Toast.LENGTH_SHORT).show()

            loadScansForCurrentLocation()
        }
    }

    private fun syncScans() {
        lifecycleScope.launch {
            val unsynced = withContext(Dispatchers.IO) {
                db.countScanDao().getUnsynced(planId)
            }

            if (unsynced.isEmpty()) {
                Toast.makeText(this@FullCountActivity, "All scans already synced", Toast.LENGTH_SHORT).show()
                return@launch
            }

            binding.buttonSync.isEnabled = false
            binding.buttonSync.text = "Syncing..."

            try {
                val jsonBody = com.google.gson.Gson().toJson(mapOf("scans" to unsynced.map { scan ->
                    mapOf(
                        "shelf" to scan.shelf,
                        "height" to scan.height,
                        "product_id" to scan.product_id,
                        "barcode" to scan.barcode,
                        "product_name" to scan.product_name,
                        "quantity" to scan.quantity,
                        "is_unknown" to scan.is_unknown,
                        "user_id" to scan.user_id,
                        "user_name" to scan.user_name,
                        "scanned_at" to scan.scanned_at,
                    )
                }))

                val response = withContext(Dispatchers.IO) {
                    val baseUrl = "https://web.posterita.com"
                    val url = "$baseUrl/api/stock-count/$planId/scans"
                    val mediaType = "application/json; charset=utf-8".toMediaTypeOrNull()
                    val request = okhttp3.Request.Builder()
                        .url(url)
                        .post(jsonBody.toRequestBody(mediaType))
                        .build()
                    okhttp3.OkHttpClient().newCall(request).execute()
                }

                if (response.isSuccessful) {
                    withContext(Dispatchers.IO) {
                        db.countScanDao().markSynced(unsynced.map { it.id })
                    }
                    Toast.makeText(this@FullCountActivity, "${unsynced.size} scans synced", Toast.LENGTH_SHORT).show()
                } else {
                    Toast.makeText(this@FullCountActivity, "Sync failed: ${response.code}", Toast.LENGTH_SHORT).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@FullCountActivity, "Sync error: ${e.message}", Toast.LENGTH_SHORT).show()
            } finally {
                binding.buttonSync.isEnabled = true
                loadScansForCurrentLocation()
            }
        }
    }

    // --- Scan Adapter ---

    private class ScanAdapter(
        private val scans: List<CountScan>
    ) : RecyclerView.Adapter<ScanAdapter.VH>() {

        class VH(view: View) : RecyclerView.ViewHolder(view) {
            val card: MaterialCardView = view as MaterialCardView
            val textName: TextView = view.findViewById(R.id.textShiftDate) // reuse shift item layout
            val textDetail: TextView = view.findViewById(R.id.textShiftTime)
            val textQty: TextView = view.findViewById(R.id.textShiftHours)
            val textStatus: TextView = view.findViewById(R.id.textShiftStatus)
            val dot: View = view.findViewById(R.id.viewStatusDot)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_staff_shift, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val scan = scans[position]
            holder.textName.text = scan.product_name ?: "Unknown"
            holder.textDetail.text = scan.barcode ?: "No barcode"
            holder.textQty.text = "×${scan.quantity}"
            holder.textStatus.text = scan.user_name ?: ""

            val context = holder.itemView.context
            holder.dot.setBackgroundResource(R.drawable.bg_rounded_teal)
            if (scan.is_unknown) {
                holder.dot.backgroundTintList = android.content.res.ColorStateList.valueOf(0xFFF59E0B.toInt())
            } else if (scan.is_synced) {
                holder.dot.backgroundTintList = android.content.res.ColorStateList.valueOf(context.getColor(R.color.posterita_secondary))
            } else {
                holder.dot.backgroundTintList = android.content.res.ColorStateList.valueOf(context.getColor(R.color.posterita_primary))
            }
        }

        override fun getItemCount() = scans.size
    }
}
