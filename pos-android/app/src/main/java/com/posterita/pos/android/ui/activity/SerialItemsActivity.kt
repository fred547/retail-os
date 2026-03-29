package com.posterita.pos.android.ui.activity

import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.tabs.TabLayout
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.SerialItem
import com.posterita.pos.android.databinding.ActivitySerialItemsBinding
import com.posterita.pos.android.util.AppErrorLogger
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

/**
 * Serial Items screen: VIN/IMEI tracking for warehouse staff.
 * - Summary cards (Total, In Stock, Sold, Delivered)
 * - Search by serial number or product name
 * - Status filter tabs (All / In Stock / Sold / Delivered)
 * - Tap for detail bottom sheet
 */
@AndroidEntryPoint
class SerialItemsActivity : BaseActivity() {

    private lateinit var binding: ActivitySerialItemsBinding

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    private var allItems: List<SerialItem> = emptyList()
    private var productNameMap: Map<Int, String> = emptyMap()
    private val displayItems = mutableListOf<SerialItem>()
    private lateinit var adapter: SerialItemAdapter

    private var currentSearch = ""
    private var currentTabIndex = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySerialItemsBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupHelpButton("serial_items")
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)

        binding.buttonBack.setOnClickListener { finish() }

        // RecyclerView
        adapter = SerialItemAdapter(displayItems, productNameMap) { item ->
            showDetailSheet(item)
        }
        binding.recyclerSerialItems.layoutManager = LinearLayoutManager(this)
        binding.recyclerSerialItems.adapter = adapter

        // Filter tabs
        binding.tabFilter.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab?) {
                currentTabIndex = tab?.position ?: 0
                applyFilters()
            }
            override fun onTabUnselected(tab: TabLayout.Tab?) {}
            override fun onTabReselected(tab: TabLayout.Tab?) {}
        })

        // Search
        binding.editSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                currentSearch = s?.toString()?.trim() ?: ""
                applyFilters()
            }
        })
    }

    override fun onResume() {
        super.onResume()
        loadData()
    }

    private fun loadData() {
        lifecycleScope.launch {
            try {
                val accountId = prefsManager.accountId

                val items = withContext(Dispatchers.IO) {
                    db.serialItemDao().getAllByAccount(accountId)
                }

                // Build product name map
                val productIds = items.map { it.productId }.distinct()
                val nameMap = mutableMapOf<Int, String>()
                withContext(Dispatchers.IO) {
                    for (pid in productIds) {
                        val product = db.productDao().getProductByIdSync(pid)
                        if (product != null) {
                            nameMap[pid] = product.name ?: "Product #$pid"
                        }
                    }
                }

                allItems = items
                productNameMap = nameMap
                adapter.productNameMap = nameMap

                // Summary counts
                val total = allItems.size
                val inStock = allItems.count { it.status == SerialItem.STATUS_IN_STOCK }
                val sold = allItems.count { it.status == SerialItem.STATUS_SOLD }
                val delivered = allItems.count { it.status == SerialItem.STATUS_DELIVERED }

                binding.textTotalItems.text = total.toString()
                binding.textInStock.text = inStock.toString()
                binding.textSold.text = sold.toString()
                binding.textDelivered.text = delivered.toString()

                applyFilters()
            } catch (e: Exception) {
                AppErrorLogger.warn(this@SerialItemsActivity, "SerialItemsActivity", "Failed to load serial items", e)
            }
        }
    }

    private fun applyFilters() {
        // Status filter
        val statusFiltered = when (currentTabIndex) {
            1 -> allItems.filter { it.status == SerialItem.STATUS_IN_STOCK }
            2 -> allItems.filter { it.status == SerialItem.STATUS_SOLD }
            3 -> allItems.filter { it.status == SerialItem.STATUS_DELIVERED }
            else -> allItems
        }

        // Search filter
        val filtered = if (currentSearch.isBlank()) {
            statusFiltered
        } else {
            val q = currentSearch.lowercase()
            statusFiltered.filter { item ->
                item.serialNumber.lowercase().contains(q) ||
                    (productNameMap[item.productId]?.lowercase()?.contains(q) == true)
            }
        }

        displayItems.clear()
        displayItems.addAll(filtered)
        adapter.notifyDataSetChanged()

        binding.layoutEmpty.visibility = if (displayItems.isEmpty()) View.VISIBLE else View.GONE
        binding.recyclerSerialItems.visibility = if (displayItems.isEmpty()) View.GONE else View.VISIBLE
    }

    // --- Detail Bottom Sheet ---

    private fun showDetailSheet(item: SerialItem) {
        val dialog = BottomSheetDialog(this)
        val dp = resources.displayMetrics.density

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding((16 * dp).toInt(), (20 * dp).toInt(), (16 * dp).toInt(), (24 * dp).toInt())
        }

        // Serial number title
        root.addView(TextView(this).apply {
            text = item.serialNumber
            textSize = 18f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#141414"))
        })

        // Type badge
        root.addView(TextView(this).apply {
            text = item.displayType
            textSize = 13f
            setTextColor(Color.parseColor("#1976D2"))
            setPadding(0, (4 * dp).toInt(), 0, 0)
        })

        // Status badge
        val statusLabel = item.status.replace("_", " ").replaceFirstChar { it.uppercase() }
        root.addView(TextView(this).apply {
            text = statusLabel
            textSize = 13f
            setTypeface(null, Typeface.BOLD)
            setTextColor(statusColor(item.status))
            setPadding(0, (4 * dp).toInt(), 0, (12 * dp).toInt())
        })

        // Divider
        root.addView(View(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, (1 * dp).toInt()
            ).also { it.bottomMargin = (12 * dp).toInt() }
            setBackgroundColor(Color.parseColor("#E6E2DA"))
        })

        // Detail rows
        val productName = productNameMap[item.productId] ?: "Product #${item.productId}"
        addDetailRow(root, dp, "Product", productName)
        addDetailRow(root, dp, "Status", statusLabel)

        val supplierName = item.supplierName
        if (supplierName != null) {
            addDetailRow(root, dp, "Supplier", supplierName)
        }

        val purchaseDate = item.purchaseDate
        if (purchaseDate != null) {
            addDetailRow(root, dp, "Received", formatDate(purchaseDate))
        }

        if (item.costPrice > 0) {
            addDetailRow(root, dp, "Cost Price", String.format("%.2f", item.costPrice))
        }

        val soldDate = item.soldDate
        if (soldDate != null) {
            addDetailRow(root, dp, "Sold Date", formatDate(soldDate))
        }

        val sellingPrice = item.sellingPrice
        if (sellingPrice != null && sellingPrice > 0) {
            addDetailRow(root, dp, "Selling Price", String.format("%.2f", sellingPrice))
        }

        val deliveredDate = item.deliveredDate
        if (deliveredDate != null) {
            addDetailRow(root, dp, "Delivered", formatDate(deliveredDate))
        }

        if (item.warrantyMonths > 0) {
            addDetailRow(root, dp, "Warranty", "${item.warrantyMonths} months")
        }

        val warrantyExpiry = item.warrantyExpiry
        if (warrantyExpiry != null) {
            val warrantyLabel = if (item.isUnderWarranty) "Active" else "Expired"
            addDetailRow(root, dp, "Warranty Expiry", "${formatDate(warrantyExpiry)} ($warrantyLabel)")
        }

        // Vehicle-specific fields
        val color = item.color
        if (color != null) {
            addDetailRow(root, dp, "Color", color)
        }

        val year = item.year
        if (year != null) {
            addDetailRow(root, dp, "Year", year.toString())
        }

        val engineNumber = item.engineNumber
        if (engineNumber != null) {
            addDetailRow(root, dp, "Engine No.", engineNumber)
        }

        val notes = item.notes
        if (notes != null) {
            addDetailRow(root, dp, "Notes", notes)
        }

        dialog.setContentView(root)
        dialog.show()
    }

    private fun addDetailRow(parent: LinearLayout, dp: Float, label: String, value: String) {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setPadding(0, (4 * dp).toInt(), 0, (4 * dp).toInt())
        }
        row.addView(TextView(this).apply {
            text = label
            textSize = 13f
            setTextColor(Color.parseColor("#6C6F76"))
            layoutParams = LinearLayout.LayoutParams(
                (110 * dp).toInt(), LinearLayout.LayoutParams.WRAP_CONTENT
            )
        })
        row.addView(TextView(this).apply {
            text = value
            textSize = 13f
            setTextColor(Color.parseColor("#141414"))
            layoutParams = LinearLayout.LayoutParams(
                0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f
            )
        })
        parent.addView(row)
    }

    // --- Helpers ---

    private fun statusColor(status: String): Int {
        return when (status) {
            SerialItem.STATUS_RECEIVED -> Color.parseColor("#F59E0B")
            SerialItem.STATUS_IN_STOCK -> Color.parseColor("#10B981")
            SerialItem.STATUS_RESERVED -> Color.parseColor("#8B5CF6")
            SerialItem.STATUS_SOLD -> Color.parseColor("#3B82F6")
            SerialItem.STATUS_DELIVERED -> Color.parseColor("#8B5CF6")
            SerialItem.STATUS_RETURNED -> Color.parseColor("#EF4444")
            SerialItem.STATUS_IN_SERVICE -> Color.parseColor("#F59E0B")
            else -> Color.parseColor("#6B7280")
        }
    }

    private fun formatDate(dateStr: String): String {
        return try {
            // Handle ISO dates like "2026-03-29T10:00:00Z" or "2026-03-29"
            dateStr.substring(0, 10)
        } catch (_: Exception) {
            dateStr
        }
    }

    // --- Adapter ---

    private class SerialItemAdapter(
        private val items: List<SerialItem>,
        var productNameMap: Map<Int, String>,
        private val onClick: (SerialItem) -> Unit
    ) : RecyclerView.Adapter<SerialItemAdapter.VH>() {

        class VH(view: View) : RecyclerView.ViewHolder(view) {
            val textSerialNumber: TextView = view.findViewById(R.id.textSerialNumber)
            val textProductName: TextView = view.findViewById(R.id.textProductName)
            val textWarranty: TextView = view.findViewById(R.id.textWarranty)
            val textStatus: TextView = view.findViewById(R.id.textStatus)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_serial_item, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val item = items[position]

            holder.textSerialNumber.text = "${item.displayType}: ${item.serialNumber}"
            holder.textProductName.text = productNameMap[item.productId] ?: "Product #${item.productId}"

            // Warranty info
            val warrantyExpiry = item.warrantyExpiry
            if (warrantyExpiry != null && item.warrantyMonths > 0) {
                holder.textWarranty.visibility = View.VISIBLE
                val expiryDate = try { warrantyExpiry.substring(0, 10) } catch (_: Exception) { warrantyExpiry }
                val warrantyLabel = if (item.isUnderWarranty) "Active" else "Expired"
                holder.textWarranty.text = "Warranty: $expiryDate ($warrantyLabel)"
                holder.textWarranty.setTextColor(
                    if (item.isUnderWarranty) android.graphics.Color.parseColor("#10B981")
                    else android.graphics.Color.parseColor("#EF4444")
                )
            } else {
                holder.textWarranty.visibility = View.GONE
            }

            // Status badge
            val statusLabel = item.status.replace("_", " ").replaceFirstChar { it.uppercase() }
            holder.textStatus.text = statusLabel
            holder.textStatus.setTextColor(when (item.status) {
                SerialItem.STATUS_RECEIVED -> android.graphics.Color.parseColor("#F59E0B")
                SerialItem.STATUS_IN_STOCK -> android.graphics.Color.parseColor("#10B981")
                SerialItem.STATUS_RESERVED -> android.graphics.Color.parseColor("#8B5CF6")
                SerialItem.STATUS_SOLD -> android.graphics.Color.parseColor("#3B82F6")
                SerialItem.STATUS_DELIVERED -> android.graphics.Color.parseColor("#8B5CF6")
                SerialItem.STATUS_RETURNED -> android.graphics.Color.parseColor("#EF4444")
                SerialItem.STATUS_IN_SERVICE -> android.graphics.Color.parseColor("#F59E0B")
                else -> android.graphics.Color.parseColor("#6B7280")
            })

            holder.itemView.setOnClickListener { onClick(item) }
        }

        override fun getItemCount() = items.size
    }
}
