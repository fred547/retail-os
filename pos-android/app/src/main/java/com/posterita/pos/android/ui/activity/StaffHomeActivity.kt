package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Shift
import com.posterita.pos.android.databinding.ActivityStaffHomeBinding
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject

/**
 * Staff Hub: Daily staff operations in one place.
 * - Clock in/out with shift tracking
 * - Today's hours and orders count
 * - Quick access to inventory count, stock check, orders
 * - Recent shifts history
 */
@AndroidEntryPoint
class StaffHomeActivity : BaseActivity() {

    private lateinit var binding: ActivityStaffHomeBinding

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    private val shifts = mutableListOf<Shift>()
    private lateinit var shiftAdapter: ShiftListAdapter
    private var activeShift: Shift? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityStaffHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupHelpButton("staff_home")
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)

        binding.buttonBack.setOnClickListener { finish() }

        // Clock in/out
        binding.buttonClockInOut.setOnClickListener { handleClockInOut() }

        // Action buttons
        binding.buttonInventoryCount.setOnClickListener {
            startActivity(Intent(this, WarehouseHomeActivity::class.java))
        }
        binding.buttonStockCheck.setOnClickListener {
            startActivity(Intent(this, MultiStoreStockActivity::class.java))
        }
        binding.buttonViewOrders.setOnClickListener {
            openWebConsole("/orders", "Orders")
        }

        // Shifts list
        shiftAdapter = ShiftListAdapter(shifts)
        binding.recyclerShifts.layoutManager = LinearLayoutManager(this)
        binding.recyclerShifts.adapter = shiftAdapter
    }

    override fun onResume() {
        super.onResume()
        loadData()
    }

    private fun loadData() {
        lifecycleScope.launch {
            val accountId = prefsManager.accountId
            val userId = sessionManager.user?.user_id ?: prefsManager.userId
            val storeId = prefsManager.storeId

            // Load active shift for current user
            activeShift = withContext(Dispatchers.IO) {
                db.shiftDao().getActiveShift(accountId, userId)
            }

            // Update clock in/out button
            if (activeShift != null) {
                binding.buttonClockInOut.text = "Clock Out"
                binding.buttonClockInOut.setBackgroundColor(getColor(R.color.posterita_danger))
                binding.buttonClockInOut.setIconResource(R.drawable.ic_arrow_back)
                binding.textShiftStatus.text = "Active"
                binding.textShiftStatus.setTextColor(getColor(R.color.posterita_secondary))
            } else {
                binding.buttonClockInOut.text = "Clock In"
                binding.buttonClockInOut.setBackgroundColor(0xFF10B981.toInt())
                binding.buttonClockInOut.setIconResource(R.drawable.ic_check_circle)
                binding.textShiftStatus.text = "Off"
                binding.textShiftStatus.setTextColor(getColor(R.color.posterita_muted))
            }

            // Load all shifts for this store
            val allShifts = withContext(Dispatchers.IO) {
                db.shiftDao().getShiftsByStore(accountId, storeId)
            }

            // Calculate today's hours for current user
            val todayStr = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
            val todayShifts = allShifts.filter {
                it.user_id == userId && it.clock_in?.startsWith(todayStr) == true
            }
            val hoursToday = todayShifts.sumOf { it.hours_worked ?: 0.0 }
            // If active shift, add elapsed time
            val activeHours = com.posterita.pos.android.util.DateUtils.hoursElapsedSinceUtc(activeShift?.clock_in)
            binding.textHoursToday.text = String.format("%.1f", hoursToday + activeHours)

            // Orders today
            val ordersToday = withContext(Dispatchers.IO) {
                try {
                    db.orderDao().getOrderCount()
                } catch (_: Exception) { 0 }
            }
            binding.textOrdersToday.text = ordersToday.toString()

            // Shifts list: most recent first, limited to 20
            shifts.clear()
            shifts.addAll(allShifts.take(20))
            shiftAdapter.notifyDataSetChanged()

            binding.layoutEmptyShifts.visibility = if (shifts.isEmpty()) View.VISIBLE else View.GONE
            binding.recyclerShifts.visibility = if (shifts.isEmpty()) View.GONE else View.VISIBLE
        }
    }

    private fun handleClockInOut() {
        lifecycleScope.launch {
            val accountId = prefsManager.accountId
            val userId = sessionManager.user?.user_id ?: prefsManager.userId
            val userName = sessionManager.user?.firstname ?: "Staff"

            if (activeShift != null) {
                // Clock out: update shift via API
                Toast.makeText(this@StaffHomeActivity, "Clocked out! Shift will sync shortly.", Toast.LENGTH_SHORT).show()
                // Mark local shift as completed
                val updatedShift = activeShift!!.copy(
                    clock_out = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                        timeZone = TimeZone.getTimeZone("UTC")
                    }.format(Date()),
                    status = Shift.STATUS_COMPLETED,
                    hours_worked = com.posterita.pos.android.util.DateUtils.hoursElapsedSinceUtc(activeShift!!.clock_in)
                )
                withContext(Dispatchers.IO) {
                    db.shiftDao().insertAll(listOf(updatedShift))
                }
                activeShift = null
            } else {
                // Clock in: create new local shift
                val now = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
                    timeZone = TimeZone.getTimeZone("UTC")
                }.format(Date())
                val newShift = Shift(
                    id = -(System.currentTimeMillis() % Int.MAX_VALUE).toInt(), // negative temp ID
                    account_id = accountId,
                    store_id = prefsManager.storeId,
                    terminal_id = prefsManager.terminalId,
                    user_id = userId,
                    user_name = userName,
                    clock_in = now,
                    status = Shift.STATUS_ACTIVE,
                    created_at = now
                )
                withContext(Dispatchers.IO) {
                    db.shiftDao().insertAll(listOf(newShift))
                }
                activeShift = newShift
                Toast.makeText(this@StaffHomeActivity, "Clocked in! Have a great shift.", Toast.LENGTH_SHORT).show()
            }
            loadData()
        }
    }

    private fun openWebConsole(path: String, title: String) {
        val intent = Intent(this, WebConsoleActivity::class.java)
        intent.putExtra(WebConsoleActivity.EXTRA_PATH, path)
        intent.putExtra(WebConsoleActivity.EXTRA_TITLE, title)
        startActivity(intent)
    }

    // --- Shift List Adapter ---

    private class ShiftListAdapter(
        private val shifts: List<Shift>
    ) : RecyclerView.Adapter<ShiftListAdapter.VH>() {

        private val dateFormat = SimpleDateFormat("MMM d, yyyy", Locale.US)
        private val timeFormat = SimpleDateFormat("HH:mm", Locale.US)
        private val parseFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }

        class VH(view: View) : RecyclerView.ViewHolder(view) {
            val card: MaterialCardView = view as MaterialCardView
            val textDate: TextView = view.findViewById(R.id.textShiftDate)
            val textTime: TextView = view.findViewById(R.id.textShiftTime)
            val textHours: TextView = view.findViewById(R.id.textShiftHours)
            val textStatus: TextView = view.findViewById(R.id.textShiftStatus)
            val statusDot: View = view.findViewById(R.id.viewStatusDot)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_staff_shift, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val shift = shifts[position]

            // Date — strip milliseconds + Z suffix for parsing
            val clockInStr = (shift.clock_in ?: "").replace(Regex("\\.[0-9]+Z$"), "").replace("Z", "")
            val clockIn = try { parseFormat.parse(clockInStr) } catch (_: Exception) { null }
            holder.textDate.text = if (clockIn != null) dateFormat.format(clockIn) else shift.clock_in?.take(10) ?: "—"

            // Time range
            val inTime = if (clockIn != null) timeFormat.format(clockIn) else "—"
            val outTime = if (shift.clock_out != null) {
                try {
                    val coStr = shift.clock_out!!.replace(Regex("\\.[0-9]+Z$"), "").replace("Z", "")
                    val co = parseFormat.parse(coStr)
                    if (co != null) timeFormat.format(co) else "—"
                } catch (_: Exception) { "—" }
            } else "now"
            holder.textTime.text = "$inTime → $outTime"

            // Hours
            val hours = shift.hours_worked
            if (hours != null && hours > 0) {
                holder.textHours.text = String.format("%.1fh", hours)
            } else if (shift.status == Shift.STATUS_ACTIVE && clockIn != null) {
                val elapsed = (System.currentTimeMillis() - clockIn.time) / 3600000.0
                holder.textHours.text = String.format("%.1fh", elapsed)
            } else {
                holder.textHours.text = "—"
            }

            // Status
            holder.textStatus.text = shift.user_name ?: "Staff"
            val context = holder.itemView.context
            holder.statusDot.setBackgroundResource(R.drawable.bg_internet_dot)
            when (shift.status) {
                Shift.STATUS_ACTIVE -> {
                    holder.statusDot.backgroundTintList = android.content.res.ColorStateList.valueOf(context.getColor(R.color.posterita_secondary))
                    holder.textHours.setTextColor(context.getColor(R.color.posterita_secondary))
                }
                Shift.STATUS_COMPLETED -> {
                    holder.statusDot.backgroundTintList = android.content.res.ColorStateList.valueOf(context.getColor(R.color.posterita_primary))
                    holder.textHours.setTextColor(context.getColor(R.color.posterita_primary))
                }
                else -> {
                    holder.statusDot.backgroundTintList = android.content.res.ColorStateList.valueOf(context.getColor(R.color.posterita_muted))
                    holder.textHours.setTextColor(context.getColor(R.color.posterita_muted))
                }
            }
        }

        override fun getItemCount() = shifts.size
    }
}
