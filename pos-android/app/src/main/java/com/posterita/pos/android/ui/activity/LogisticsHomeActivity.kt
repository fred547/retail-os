package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.os.Bundle
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.tabs.TabLayout
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Delivery
import com.posterita.pos.android.data.local.entity.User
import com.posterita.pos.android.databinding.ActivityLogisticsHomeBinding
import com.posterita.pos.android.util.AppErrorLogger
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import javax.inject.Inject

/**
 * Logistics Hub: Deliveries & Dispatch.
 * - Delivery summary cards (pending, in transit, delivered, total)
 * - Delivery list with status filters
 * - Tap for detail bottom sheet with assign driver / update status actions
 * - Web console link for full management
 */
@AndroidEntryPoint
class LogisticsHomeActivity : BaseActivity() {

    private lateinit var binding: ActivityLogisticsHomeBinding

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    private var allDeliveries: List<Delivery> = emptyList()
    private val displayDeliveries = mutableListOf<Delivery>()
    private lateinit var deliveryAdapter: DeliveryListAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLogisticsHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupHelpButton("logistics_home")
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)

        binding.buttonBack.setOnClickListener { finish() }

        // Web console for full management
        binding.buttonManageDeliveries.setOnClickListener {
            openWebConsole("/deliveries", "Deliveries")
        }

        // Delivery list
        deliveryAdapter = DeliveryListAdapter(displayDeliveries) { delivery ->
            showDeliveryDetail(delivery)
        }
        binding.recyclerDeliveries.layoutManager = LinearLayoutManager(this)
        binding.recyclerDeliveries.adapter = deliveryAdapter

        // Filter tabs
        binding.tabFilter.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab?) { filterDeliveries(tab?.position ?: 0) }
            override fun onTabUnselected(tab: TabLayout.Tab?) {}
            override fun onTabReselected(tab: TabLayout.Tab?) {}
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
                allDeliveries = withContext(Dispatchers.IO) {
                    db.deliveryDao().getDeliveries(accountId)
                }

                // Summary
                val pending = allDeliveries.count { it.status == Delivery.STATUS_PENDING }
                val inTransit = allDeliveries.count { it.status in listOf(Delivery.STATUS_ASSIGNED, Delivery.STATUS_PICKED_UP, Delivery.STATUS_IN_TRANSIT) }
                val delivered = allDeliveries.count { it.status == Delivery.STATUS_DELIVERED }
                val total = allDeliveries.size

                binding.textPending.text = pending.toString()
                binding.textInTransit.text = inTransit.toString()
                binding.textDelivered.text = delivered.toString()
                binding.textTotal.text = total.toString()

                filterDeliveries(binding.tabFilter.selectedTabPosition)
            } catch (e: Exception) {
                AppErrorLogger.warn(this@LogisticsHomeActivity, "LogisticsHomeActivity", "Failed to load deliveries", e)
            }
        }
    }

    private fun filterDeliveries(tabIndex: Int) {
        val filtered = when (tabIndex) {
            0 -> allDeliveries.filter { it.status !in listOf(Delivery.STATUS_DELIVERED, Delivery.STATUS_CANCELLED) } // Active
            1 -> allDeliveries.filter { it.status == Delivery.STATUS_PENDING }
            2 -> allDeliveries.filter { it.status in listOf(Delivery.STATUS_ASSIGNED, Delivery.STATUS_PICKED_UP, Delivery.STATUS_IN_TRANSIT) }
            3 -> allDeliveries.filter { it.status == Delivery.STATUS_DELIVERED }
            else -> allDeliveries
        }
        displayDeliveries.clear()
        displayDeliveries.addAll(filtered)
        deliveryAdapter.notifyDataSetChanged()

        binding.layoutEmptyDeliveries.visibility = if (displayDeliveries.isEmpty()) View.VISIBLE else View.GONE
        binding.recyclerDeliveries.visibility = if (displayDeliveries.isEmpty()) View.GONE else View.VISIBLE
    }

    // --- Detail Bottom Sheet ---

    private fun showDeliveryDetail(delivery: Delivery) {
        val dialog = BottomSheetDialog(this)
        val dp = resources.displayMetrics.density

        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding((16 * dp).toInt(), (20 * dp).toInt(), (16 * dp).toInt(), (24 * dp).toInt())
        }

        // Title
        root.addView(TextView(this).apply {
            text = delivery.customer_name ?: "Customer #${delivery.customer_id ?: "?"}"
            textSize = 18f
            setTypeface(null, Typeface.BOLD)
            setTextColor(Color.parseColor("#141414"))
        })

        // Order reference
        if (delivery.order_id != null) {
            root.addView(TextView(this).apply {
                text = "Order #${delivery.order_id}"
                textSize = 13f
                setTextColor(Color.parseColor("#1976D2"))
                setPadding(0, (4 * dp).toInt(), 0, 0)
            })
        }

        // Status badge
        val statusLabel = delivery.status.replace("_", " ").replaceFirstChar { it.uppercase() }
        root.addView(TextView(this).apply {
            text = statusLabel
            textSize = 13f
            setTypeface(null, Typeface.BOLD)
            setTextColor(statusColor(delivery.status))
            setPadding(0, (8 * dp).toInt(), 0, (12 * dp).toInt())
        })

        // Divider
        root.addView(View(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, (1 * dp).toInt()
            ).also { it.bottomMargin = (12 * dp).toInt() }
            setBackgroundColor(Color.parseColor("#E6E2DA"))
        })

        // Detail rows (use local vals to avoid cross-module smart cast issues)
        val address = delivery.delivery_address
        val city = delivery.delivery_city
        addDetailRow(root, dp, "Address", address ?: city ?: "Not specified")
        if (city != null && address != null) {
            addDetailRow(root, dp, "City", city)
        }
        addDetailRow(root, dp, "Phone", delivery.customer_phone ?: "Not provided")
        addDetailRow(root, dp, "Driver", delivery.driver_name ?: "Unassigned")

        val notes = delivery.delivery_notes
        if (notes != null) {
            addDetailRow(root, dp, "Notes", notes)
        }
        val estTime = delivery.estimated_time
        if (estTime != null) {
            addDetailRow(root, dp, "Est. Time", formatTimestamp(estTime))
        }
        val assignedAt = delivery.assigned_at
        if (assignedAt != null) {
            addDetailRow(root, dp, "Assigned", formatTimestamp(assignedAt))
        }
        val pickedUpAt = delivery.picked_up_at
        if (pickedUpAt != null) {
            addDetailRow(root, dp, "Picked Up", formatTimestamp(pickedUpAt))
        }
        val deliveredAt = delivery.actual_delivery_at
        if (deliveredAt != null) {
            addDetailRow(root, dp, "Delivered", formatTimestamp(deliveredAt))
        }
        val fee = delivery.delivery_fee
        if (fee != null && fee > 0) {
            addDetailRow(root, dp, "Delivery Fee", String.format("%.2f", fee))
        }
        val dist = delivery.distance_km
        if (dist != null && dist > 0) {
            addDetailRow(root, dp, "Distance", String.format("%.1f km", dist))
        }

        // Action buttons (only for non-final statuses)
        if (delivery.status !in listOf(Delivery.STATUS_DELIVERED, Delivery.STATUS_CANCELLED, Delivery.STATUS_FAILED)) {
            root.addView(View(this).apply {
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT, (1 * dp).toInt()
                ).also { it.topMargin = (12 * dp).toInt(); it.bottomMargin = (12 * dp).toInt() }
                setBackgroundColor(Color.parseColor("#E6E2DA"))
            })

            val buttonRow = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                )
            }

            // Assign Driver button (only if pending or no driver assigned)
            if (delivery.status == Delivery.STATUS_PENDING || delivery.driver_id == null) {
                val assignBtn = MaterialButton(this, null, com.google.android.material.R.attr.materialButtonOutlinedStyle).apply {
                    text = "Assign Driver"
                    textSize = 13f
                    isAllCaps = false
                    cornerRadius = (10 * dp).toInt()
                    layoutParams = LinearLayout.LayoutParams(
                        0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f
                    ).also { it.marginEnd = (4 * dp).toInt() }
                    setOnClickListener {
                        dialog.dismiss()
                        showAssignDriverDialog(delivery)
                    }
                }
                buttonRow.addView(assignBtn)
            }

            // Update Status button
            val statusBtn = MaterialButton(this).apply {
                text = "Update Status"
                textSize = 13f
                isAllCaps = false
                cornerRadius = (10 * dp).toInt()
                layoutParams = LinearLayout.LayoutParams(
                    0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f
                ).also { it.marginStart = (4 * dp).toInt() }
                setOnClickListener {
                    dialog.dismiss()
                    showUpdateStatusDialog(delivery)
                }
            }
            buttonRow.addView(statusBtn)

            root.addView(buttonRow)
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
                (100 * dp).toInt(), LinearLayout.LayoutParams.WRAP_CONTENT
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

    // --- Assign Driver Dialog ---

    private fun showAssignDriverDialog(delivery: Delivery) {
        lifecycleScope.launch {
            try {
                val users = withContext(Dispatchers.IO) {
                    db.userDao().getAllUsers()
                }

                if (users.isEmpty()) {
                    Toast.makeText(this@LogisticsHomeActivity, "No staff members available", Toast.LENGTH_SHORT).show()
                    return@launch
                }

                val names = users.map { "${it.firstname ?: ""} ${it.lastname ?: ""}".trim().ifEmpty { it.username ?: "User #${it.user_id}" } }
                    .toTypedArray()

                MaterialAlertDialogBuilder(this@LogisticsHomeActivity)
                    .setTitle("Assign Driver")
                    .setItems(names) { _, which ->
                        val selectedUser = users[which]
                        val driverName = names[which]
                        assignDriver(delivery, selectedUser.user_id, driverName)
                    }
                    .setNegativeButton("Cancel", null)
                    .show()
            } catch (e: Exception) {
                AppErrorLogger.warn(this@LogisticsHomeActivity, "LogisticsHomeActivity", "Failed to load users for driver assignment", e)
                Toast.makeText(this@LogisticsHomeActivity, "Failed to load staff list", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun assignDriver(delivery: Delivery, driverId: Int, driverName: String) {
        lifecycleScope.launch {
            try {
                val now = utcNow()
                val newStatus = if (delivery.status == Delivery.STATUS_PENDING) Delivery.STATUS_ASSIGNED else delivery.status
                withContext(Dispatchers.IO) {
                    db.deliveryDao().assignDriver(
                        id = delivery.id,
                        driverId = driverId,
                        driverName = driverName,
                        status = newStatus,
                        assignedAt = now,
                        updatedAt = now
                    )
                }
                Toast.makeText(this@LogisticsHomeActivity, "Driver assigned: $driverName", Toast.LENGTH_SHORT).show()
                loadData()
            } catch (e: Exception) {
                AppErrorLogger.warn(this@LogisticsHomeActivity, "LogisticsHomeActivity", "Failed to assign driver", e)
                Toast.makeText(this@LogisticsHomeActivity, "Failed to assign driver", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // --- Update Status Dialog ---

    private fun showUpdateStatusDialog(delivery: Delivery) {
        val nextStatuses = getAvailableStatusTransitions(delivery.status)
        if (nextStatuses.isEmpty()) {
            Toast.makeText(this, "No status transitions available", Toast.LENGTH_SHORT).show()
            return
        }

        val labels = nextStatuses.map { it.replace("_", " ").replaceFirstChar { c -> c.uppercase() } }.toTypedArray()

        MaterialAlertDialogBuilder(this)
            .setTitle("Update Status")
            .setItems(labels) { _, which ->
                updateDeliveryStatus(delivery, nextStatuses[which])
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun getAvailableStatusTransitions(currentStatus: String): List<String> {
        return when (currentStatus) {
            Delivery.STATUS_PENDING -> listOf(Delivery.STATUS_ASSIGNED, Delivery.STATUS_CANCELLED)
            Delivery.STATUS_ASSIGNED -> listOf(Delivery.STATUS_PICKED_UP, Delivery.STATUS_CANCELLED)
            Delivery.STATUS_PICKED_UP -> listOf(Delivery.STATUS_IN_TRANSIT, Delivery.STATUS_CANCELLED)
            Delivery.STATUS_IN_TRANSIT -> listOf(Delivery.STATUS_DELIVERED, Delivery.STATUS_FAILED)
            Delivery.STATUS_FAILED -> listOf(Delivery.STATUS_PENDING, Delivery.STATUS_CANCELLED)
            else -> emptyList()
        }
    }

    private fun updateDeliveryStatus(delivery: Delivery, newStatus: String) {
        lifecycleScope.launch {
            try {
                val now = utcNow()
                withContext(Dispatchers.IO) {
                    db.deliveryDao().updateStatus(
                        id = delivery.id,
                        status = newStatus,
                        updatedAt = now
                    )
                }
                val label = newStatus.replace("_", " ").replaceFirstChar { it.uppercase() }
                Toast.makeText(this@LogisticsHomeActivity, "Status updated: $label", Toast.LENGTH_SHORT).show()
                loadData()
            } catch (e: Exception) {
                AppErrorLogger.warn(this@LogisticsHomeActivity, "LogisticsHomeActivity", "Failed to update delivery status", e)
                Toast.makeText(this@LogisticsHomeActivity, "Failed to update status", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // --- Helpers ---

    private fun openWebConsole(path: String, title: String) {
        val intent = Intent(this, WebConsoleActivity::class.java)
        intent.putExtra(WebConsoleActivity.EXTRA_PATH, path)
        intent.putExtra(WebConsoleActivity.EXTRA_TITLE, title)
        startActivity(intent)
    }

    private fun statusColor(status: String): Int {
        return when (status) {
            Delivery.STATUS_PENDING -> Color.parseColor("#F59E0B")
            Delivery.STATUS_ASSIGNED, Delivery.STATUS_PICKED_UP -> Color.parseColor("#3B82F6")
            Delivery.STATUS_IN_TRANSIT -> Color.parseColor("#8B5CF6")
            Delivery.STATUS_DELIVERED -> Color.parseColor("#10B981")
            Delivery.STATUS_FAILED, Delivery.STATUS_CANCELLED -> Color.parseColor("#EF4444")
            else -> Color.parseColor("#6B7280")
        }
    }

    private fun formatTimestamp(ts: String): String {
        return try {
            val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US)
            parser.timeZone = TimeZone.getTimeZone("UTC")
            val date = parser.parse(ts)
            val formatter = SimpleDateFormat("dd MMM, HH:mm", Locale.getDefault())
            formatter.format(date ?: return ts)
        } catch (_: Exception) {
            ts
        }
    }

    private fun utcNow(): String {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        return sdf.format(Date())
    }

    // --- Delivery Adapter ---

    private class DeliveryListAdapter(
        private val deliveries: List<Delivery>,
        private val onClick: (Delivery) -> Unit
    ) : RecyclerView.Adapter<DeliveryListAdapter.VH>() {

        class VH(view: View) : RecyclerView.ViewHolder(view) {
            val textOrderNumber: TextView = view.findViewById(R.id.textOrderNumber)
            val textCustomer: TextView = view.findViewById(R.id.textCustomer)
            val textAddress: TextView = view.findViewById(R.id.textAddress)
            val textStatus: TextView = view.findViewById(R.id.textStatus)
            val textDriver: TextView = view.findViewById(R.id.textDriver)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_delivery, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val d = deliveries[position]

            // Order number
            if (d.order_id != null) {
                holder.textOrderNumber.text = "Order #${d.order_id}"
                holder.textOrderNumber.visibility = View.VISIBLE
            } else {
                holder.textOrderNumber.visibility = View.GONE
            }

            holder.textCustomer.text = d.customer_name ?: "Customer #${d.customer_id ?: "?"}"
            holder.textAddress.text = d.delivery_address ?: ""
            holder.textDriver.text = if (d.driver_name != null) "Driver: ${d.driver_name}" else "Unassigned"

            val statusLabel = d.status.replace("_", " ").replaceFirstChar { it.uppercase() }
            holder.textStatus.text = statusLabel
            holder.textStatus.setTextColor(when (d.status) {
                Delivery.STATUS_PENDING -> android.graphics.Color.parseColor("#F59E0B")
                Delivery.STATUS_ASSIGNED, Delivery.STATUS_PICKED_UP -> android.graphics.Color.parseColor("#3B82F6")
                Delivery.STATUS_IN_TRANSIT -> android.graphics.Color.parseColor("#8B5CF6")
                Delivery.STATUS_DELIVERED -> android.graphics.Color.parseColor("#10B981")
                Delivery.STATUS_FAILED, Delivery.STATUS_CANCELLED -> android.graphics.Color.parseColor("#EF4444")
                else -> android.graphics.Color.parseColor("#6B7280")
            })

            holder.itemView.setOnClickListener { onClick(d) }
        }

        override fun getItemCount() = deliveries.size
    }
}
