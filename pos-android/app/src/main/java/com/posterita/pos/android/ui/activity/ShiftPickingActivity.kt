package com.posterita.pos.android.ui.activity

import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.RosterPeriod
import com.posterita.pos.android.data.local.entity.RosterTemplateSlot
import com.posterita.pos.android.data.local.entity.ShiftPick
import com.posterita.pos.android.databinding.ActivityShiftPickingBinding
import com.posterita.pos.android.util.AppErrorLogger
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.*
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import javax.inject.Inject

/**
 * Shift Picking: Staff select available shifts from the roster.
 * - Shows active roster period (status = "picking")
 * - Displays template slots grouped by day of week
 * - Pick/Cancel actions hit the API directly
 * - Existing picks shown with green checkmark
 */
@AndroidEntryPoint
class ShiftPickingActivity : BaseActivity() {

    private lateinit var binding: ActivityShiftPickingBinding

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    private var activePeriod: RosterPeriod? = null
    private val listItems = mutableListOf<ListItem>()
    private lateinit var adapter: SlotListAdapter
    private var myPicks = mutableListOf<ShiftPick>()
    private var allPicks = mutableListOf<ShiftPick>()

    companion object {
        private const val TAG = "ShiftPickingActivity"
        private const val WEB_CONSOLE_BASE = "https://web.posterita.com"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityShiftPickingBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupHelpButton("shift_picking")
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)

        binding.buttonBack.setOnClickListener { finish() }

        adapter = SlotListAdapter(listItems, ::onPickSlot, ::onCancelPick)
        binding.recyclerSlots.layoutManager = LinearLayoutManager(this)
        binding.recyclerSlots.adapter = adapter
    }

    override fun onResume() {
        super.onResume()
        loadData()
    }

    private fun loadData() {
        binding.progressLoading.visibility = View.VISIBLE
        binding.layoutEmpty.visibility = View.GONE
        binding.recyclerSlots.visibility = View.GONE

        lifecycleScope.launch {
            try {
                val accountId = prefsManager.accountId
                val storeId = prefsManager.storeId
                val userId = sessionManager.user?.user_id ?: prefsManager.userId

                // 1. Find active period in "picking" status
                val periods = withContext(Dispatchers.IO) {
                    db.rosterPeriodDao().getByStore(accountId, storeId)
                }
                activePeriod = periods.firstOrNull { it.status == "picking" }

                val period = activePeriod
                if (period == null) {
                    binding.progressLoading.visibility = View.GONE
                    binding.cardPeriod.visibility = View.GONE
                    binding.layoutEmpty.visibility = View.VISIBLE
                    binding.recyclerSlots.visibility = View.GONE
                    return@launch
                }

                // 2. Display period info
                binding.cardPeriod.visibility = View.VISIBLE
                binding.textPeriodName.text = period.name ?: "Roster Period"
                binding.textPeriodDates.text = "${formatDate(period.start_date)} - ${formatDate(period.end_date)}"
                binding.textPeriodStatus.text = period.status.replaceFirstChar { it.uppercase() }
                val deadline = period.picking_deadline
                if (deadline != null) {
                    binding.textPeriodDeadline.text = "Deadline: ${formatDate(deadline)}"
                    binding.textPeriodDeadline.visibility = View.VISIBLE
                } else {
                    binding.textPeriodDeadline.visibility = View.GONE
                }

                // Status badge color
                when (period.status) {
                    "picking" -> binding.textPeriodStatus.setTextColor(Color.parseColor("#10B981"))
                    "closed", "approved" -> binding.textPeriodStatus.setTextColor(Color.parseColor("#6C6F76"))
                    else -> binding.textPeriodStatus.setTextColor(Color.parseColor("#F59E0B"))
                }

                // 3. Load template slots for this store
                val slots = withContext(Dispatchers.IO) {
                    db.rosterTemplateSlotDao().getByStore(accountId, storeId)
                }

                // 4. Load existing picks for this period
                val periodPicks = withContext(Dispatchers.IO) {
                    db.shiftPickDao().getByPeriod(accountId, period.id)
                }
                allPicks.clear()
                allPicks.addAll(periodPicks)
                myPicks.clear()
                myPicks.addAll(periodPicks.filter { it.user_id == userId })

                // 5. Build list items grouped by day of week
                buildListItems(slots, period)

                binding.progressLoading.visibility = View.GONE
                if (listItems.isEmpty()) {
                    binding.layoutEmpty.visibility = View.VISIBLE
                    binding.recyclerSlots.visibility = View.GONE
                    binding.textEmptyTitle.text = "No shifts available"
                    binding.textEmptySubtitle.text = "No template slots have been configured for this store"
                } else {
                    binding.layoutEmpty.visibility = View.GONE
                    binding.recyclerSlots.visibility = View.VISIBLE
                }
                adapter.notifyDataSetChanged()

            } catch (e: Exception) {
                binding.progressLoading.visibility = View.GONE
                binding.layoutEmpty.visibility = View.VISIBLE
                binding.textEmptyTitle.text = "Error loading shifts"
                binding.textEmptySubtitle.text = e.message ?: "Unknown error"
                AppErrorLogger.warn(this@ShiftPickingActivity, TAG, "Failed to load shift picking data", e)
            }
        }
    }

    private fun buildListItems(slots: List<RosterTemplateSlot>, period: RosterPeriod) {
        val userId = sessionManager.user?.user_id ?: prefsManager.userId
        listItems.clear()

        val dayNames = arrayOf("", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")

        // Group slots by day_of_week (1=Mon, 7=Sun)
        val grouped = slots.groupBy { it.day_of_week }

        for (day in 1..7) {
            val daySlots = grouped[day] ?: continue

            // Calculate the actual date for this day within the period
            val dateForDay = computeDateForDay(period.start_date, day)

            listItems.add(ListItem.DayHeader(dayNames.getOrElse(day) { "Day $day" }, dateForDay))

            for (slot in daySlots) {
                val myPick = myPicks.firstOrNull { it.slot_id == slot.id && it.date == dateForDay }
                val totalPicks = allPicks.count { it.slot_id == slot.id && it.date == dateForDay && it.status != "cancelled" }

                listItems.add(ListItem.SlotItem(
                    slot = slot,
                    date = dateForDay,
                    myPick = myPick,
                    totalPicks = totalPicks,
                    isPickedByMe = myPick != null
                ))
            }
        }
    }

    /** Compute the date string for a given day_of_week within the period.
     * day_of_week: 1=Monday, 7=Sunday
     * Uses the period start_date as anchor. */
    private fun computeDateForDay(startDate: String, dayOfWeek: Int): String {
        return try {
            val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val cal = Calendar.getInstance()
            cal.time = sdf.parse(startDate) ?: return startDate

            // Calendar: Monday=2, Tuesday=3, ..., Sunday=1
            // Our day_of_week: Monday=1, ..., Sunday=7
            val calDayOfWeek = cal.get(Calendar.DAY_OF_WEEK) // 1=Sun, 2=Mon, ...
            val calMondayBased = if (calDayOfWeek == Calendar.SUNDAY) 7 else calDayOfWeek - 1
            val offset = dayOfWeek - calMondayBased
            cal.add(Calendar.DAY_OF_MONTH, offset)
            sdf.format(cal.time)
        } catch (_: Exception) {
            startDate
        }
    }

    private fun onPickSlot(slotItem: ListItem.SlotItem) {
        val period = activePeriod ?: return
        val userId = sessionManager.user?.user_id ?: prefsManager.userId

        lifecycleScope.launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    postPickToApi(period.id, slotItem.slot.id, userId, slotItem.date)
                }
                if (result.success) {
                    Toast.makeText(this@ShiftPickingActivity, "Shift picked!", Toast.LENGTH_SHORT).show()
                    // Insert locally for immediate UI feedback
                    val localPick = ShiftPick(
                        id = result.pickId ?: -(System.currentTimeMillis() % Int.MAX_VALUE).toInt(),
                        account_id = prefsManager.accountId,
                        roster_period_id = period.id,
                        slot_id = slotItem.slot.id,
                        user_id = userId,
                        date = slotItem.date,
                        status = "picked"
                    )
                    withContext(Dispatchers.IO) {
                        db.shiftPickDao().insertAll(listOf(localPick))
                    }
                    loadData()
                } else {
                    Toast.makeText(this@ShiftPickingActivity, result.error ?: "Failed to pick shift", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@ShiftPickingActivity, "Network error: ${e.message}", Toast.LENGTH_LONG).show()
                AppErrorLogger.warn(this@ShiftPickingActivity, TAG, "Failed to pick shift", e)
            }
        }
    }

    private fun onCancelPick(slotItem: ListItem.SlotItem) {
        val pickId = slotItem.myPick?.id ?: return

        lifecycleScope.launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    cancelPickViaApi(pickId)
                }
                if (result.success) {
                    Toast.makeText(this@ShiftPickingActivity, "Shift cancelled", Toast.LENGTH_SHORT).show()
                    // Update locally
                    val cancelled = slotItem.myPick.copy(status = "cancelled")
                    withContext(Dispatchers.IO) {
                        db.shiftPickDao().insertAll(listOf(cancelled))
                    }
                    loadData()
                } else {
                    Toast.makeText(this@ShiftPickingActivity, result.error ?: "Failed to cancel", Toast.LENGTH_LONG).show()
                }
            } catch (e: Exception) {
                Toast.makeText(this@ShiftPickingActivity, "Network error: ${e.message}", Toast.LENGTH_LONG).show()
                AppErrorLogger.warn(this@ShiftPickingActivity, TAG, "Failed to cancel pick", e)
            }
        }
    }

    // --- API Calls ---

    private data class ApiResult(val success: Boolean, val error: String? = null, val pickId: Int? = null)

    private suspend fun postPickToApi(periodId: Int, slotId: Int, userId: Int, date: String): ApiResult {
        val ottToken = fetchOttToken() ?: return ApiResult(false, "Authentication failed")

        val url = URL("$WEB_CONSOLE_BASE/api/staff/picks?ott=$ottToken")
        val conn = url.openConnection() as HttpURLConnection
        conn.apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type", "application/json")
            connectTimeout = 10_000
            readTimeout = 10_000
            doOutput = true
        }

        val payload = JSONObject().apply {
            put("roster_period_id", periodId)
            put("slot_id", slotId)
            put("user_id", userId)
            put("date", date)
        }

        OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()); it.flush() }

        val responseCode = conn.responseCode
        return if (responseCode in 200..299) {
            val response = conn.inputStream.bufferedReader().readText()
            val json = JSONObject(response)
            val pick = json.optJSONObject("pick")
            ApiResult(true, pickId = pick?.optInt("id"))
        } else {
            val errorBody = try { conn.errorStream?.bufferedReader()?.readText() } catch (_: Exception) { null }
            val errorMsg = try {
                JSONObject(errorBody ?: "{}").optString("error", "Request failed ($responseCode)")
            } catch (_: Exception) { "Request failed ($responseCode)" }
            ApiResult(false, errorMsg)
        }
    }

    private suspend fun cancelPickViaApi(pickId: Int): ApiResult {
        val ottToken = fetchOttToken() ?: return ApiResult(false, "Authentication failed")

        val url = URL("$WEB_CONSOLE_BASE/api/staff/picks/$pickId?ott=$ottToken")
        val conn = url.openConnection() as HttpURLConnection
        conn.apply {
            requestMethod = "PATCH"
            setRequestProperty("Content-Type", "application/json")
            connectTimeout = 10_000
            readTimeout = 10_000
            doOutput = true
        }

        val payload = JSONObject().apply {
            put("status", "cancelled")
        }

        OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()); it.flush() }

        val responseCode = conn.responseCode
        return if (responseCode in 200..299) {
            ApiResult(true)
        } else {
            val errorBody = try { conn.errorStream?.bufferedReader()?.readText() } catch (_: Exception) { null }
            val errorMsg = try {
                JSONObject(errorBody ?: "{}").optString("error", "Request failed ($responseCode)")
            } catch (_: Exception) { "Request failed ($responseCode)" }
            ApiResult(false, errorMsg)
        }
    }

    /** Fetch a one-time token for API authentication (same pattern as WebConsoleActivity). */
    private suspend fun fetchOttToken(): String? {
        return try {
            val accountId = prefsManager.accountId
            if (accountId.isEmpty() || accountId == "null" || accountId == "0") return null

            val user = try { db.userDao().getAllUsers().firstOrNull() } catch (_: Exception) { null }
            val store = try { db.storeDao().getAllStores().lastOrNull() } catch (_: Exception) { null }
            val terminal = if (store != null) {
                try { db.terminalDao().getTerminalsForStore(store.storeId).firstOrNull() } catch (_: Exception) { null }
            } else {
                try { db.terminalDao().getAllTerminals().lastOrNull() } catch (_: Exception) { null }
            }
            val userId = user?.user_id ?: 0
            val storeId = store?.storeId ?: 0
            val terminalId = terminal?.terminalId ?: 0

            val url = URL("$WEB_CONSOLE_BASE/api/auth/ott")
            val conn = url.openConnection() as HttpURLConnection
            conn.apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                connectTimeout = 5_000
                readTimeout = 5_000
                doOutput = true
            }

            val payload = JSONObject().apply {
                put("account_id", accountId)
                put("user_id", if (userId > 0) userId else 1)
                if (storeId > 0) put("store_id", storeId)
                if (terminalId > 0) put("terminal_id", terminalId)
            }

            val syncSecret = prefsManager.syncSecret
            if (syncSecret.isNotEmpty()) {
                val timestamp = (System.currentTimeMillis() / 1000).toString()
                val hmacMessage = "$timestamp.${payload.toString()}"
                val signature = computeHmacSha256(syncSecret, hmacMessage)
                conn.setRequestProperty("X-Sync-Timestamp", timestamp)
                conn.setRequestProperty("X-Sync-Signature", signature)
            }

            OutputStreamWriter(conn.outputStream).use { it.write(payload.toString()); it.flush() }

            if (conn.responseCode == 200) {
                val response = conn.inputStream.bufferedReader().readText()
                val json = JSONObject(response)
                json.optString("token").ifEmpty { null }
            } else {
                Log.w(TAG, "OTT fetch failed: ${conn.responseCode}")
                null
            }
        } catch (e: Exception) {
            Log.w(TAG, "OTT fetch error: ${e.message}")
            null
        }
    }

    private fun computeHmacSha256(secret: String, message: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return mac.doFinal(message.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
    }

    // --- Helpers ---

    private fun formatDate(dateStr: String): String {
        return try {
            val input = SimpleDateFormat("yyyy-MM-dd", Locale.US)
            val output = SimpleDateFormat("MMM d, yyyy", Locale.US)
            val date = input.parse(dateStr.take(10)) ?: return dateStr
            output.format(date)
        } catch (_: Exception) {
            dateStr
        }
    }

    // --- Data Model ---

    sealed class ListItem {
        data class DayHeader(val dayName: String, val date: String) : ListItem()
        data class SlotItem(
            val slot: RosterTemplateSlot,
            val date: String,
            val myPick: ShiftPick?,
            val totalPicks: Int,
            val isPickedByMe: Boolean
        ) : ListItem()
    }

    // --- Adapter ---

    private class SlotListAdapter(
        private val items: List<ListItem>,
        private val onPick: (ListItem.SlotItem) -> Unit,
        private val onCancel: (ListItem.SlotItem) -> Unit
    ) : RecyclerView.Adapter<RecyclerView.ViewHolder>() {

        companion object {
            const val TYPE_HEADER = 0
            const val TYPE_SLOT = 1
        }

        override fun getItemViewType(position: Int): Int {
            return when (items[position]) {
                is ListItem.DayHeader -> TYPE_HEADER
                is ListItem.SlotItem -> TYPE_SLOT
            }
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): RecyclerView.ViewHolder {
            val inflater = LayoutInflater.from(parent.context)
            return when (viewType) {
                TYPE_HEADER -> HeaderVH(inflater.inflate(R.layout.item_day_header, parent, false))
                else -> SlotVH(inflater.inflate(R.layout.item_shift_slot, parent, false))
            }
        }

        override fun onBindViewHolder(holder: RecyclerView.ViewHolder, position: Int) {
            when (val item = items[position]) {
                is ListItem.DayHeader -> bindHeader(holder as HeaderVH, item)
                is ListItem.SlotItem -> bindSlot(holder as SlotVH, item)
            }
        }

        override fun getItemCount() = items.size

        private fun bindHeader(holder: HeaderVH, item: ListItem.DayHeader) {
            val dateDisplay = try {
                val sdf = SimpleDateFormat("yyyy-MM-dd", Locale.US)
                val outFmt = SimpleDateFormat("EEE, MMM d", Locale.US)
                val d = sdf.parse(item.date)
                if (d != null) outFmt.format(d) else item.dayName
            } catch (_: Exception) { item.dayName }
            holder.textDay.text = "${item.dayName}  •  $dateDisplay"
        }

        private fun bindSlot(holder: SlotVH, item: ListItem.SlotItem) {
            val slot = item.slot
            val context = holder.itemView.context

            holder.textName.text = slot.name
            holder.textTime.text = "${slot.start_time.take(5)} - ${slot.end_time.take(5)}"

            // Duration
            val durationMinutes = computeDurationMinutes(slot.start_time, slot.end_time, slot.break_minutes)
            val hours = durationMinutes / 60
            val mins = durationMinutes % 60
            holder.textDuration.text = if (mins > 0) "${hours}h ${mins}m" else "${hours}h"
            holder.textBreak.text = "${slot.break_minutes}min break"

            // Role badge
            val role = slot.required_role
            if (role != null && role.isNotEmpty()) {
                holder.textRole.text = role
                holder.textRole.visibility = View.VISIBLE
            } else {
                holder.textRole.visibility = View.GONE
            }

            // Color stripe
            val stripeColor = try {
                val c = slot.color
                if (c != null && c.isNotEmpty()) Color.parseColor(c) else context.getColor(R.color.posterita_primary)
            } catch (_: Exception) {
                context.getColor(R.color.posterita_primary)
            }
            holder.colorStripe.setBackgroundColor(stripeColor)

            // Pick state
            if (item.isPickedByMe) {
                // Picked by me — show cancel option
                holder.card.setCardBackgroundColor(Color.parseColor("#E8F5E9"))
                holder.card.strokeColor = Color.parseColor("#10B981")
                holder.buttonPick.text = "Cancel"
                holder.buttonPick.setTextColor(context.getColor(R.color.posterita_danger))
                holder.buttonPick.setOnClickListener { onCancel(item) }

                holder.textPickStatus.visibility = View.VISIBLE
                holder.textPickStatus.text = "\u2713 Picked by you"
                holder.textPickStatus.setTextColor(Color.parseColor("#10B981"))
            } else {
                // Available
                holder.card.setCardBackgroundColor(Color.WHITE)
                holder.card.strokeColor = context.getColor(R.color.posterita_line)
                holder.buttonPick.text = "Pick"
                holder.buttonPick.setTextColor(context.getColor(R.color.posterita_primary))
                holder.buttonPick.setOnClickListener { onPick(item) }

                // Show fill count if others have picked
                if (item.totalPicks > 0) {
                    holder.textPickStatus.visibility = View.VISIBLE
                    holder.textPickStatus.text = "${item.totalPicks} picked"
                    holder.textPickStatus.setTextColor(context.getColor(R.color.posterita_muted))
                } else {
                    holder.textPickStatus.visibility = View.GONE
                }
            }
        }

        private fun computeDurationMinutes(startTime: String, endTime: String, breakMinutes: Int): Int {
            return try {
                val parts1 = startTime.split(":")
                val parts2 = endTime.split(":")
                val startMin = parts1[0].toInt() * 60 + parts1[1].toInt()
                val endMin = parts2[0].toInt() * 60 + parts2[1].toInt()
                Math.max(0, endMin - startMin - breakMinutes)
            } catch (_: Exception) { 0 }
        }

        class HeaderVH(view: View) : RecyclerView.ViewHolder(view) {
            val textDay: TextView = view.findViewById(R.id.textDayHeader)
        }

        class SlotVH(view: View) : RecyclerView.ViewHolder(view) {
            val card: MaterialCardView = view.findViewById(R.id.cardSlot)
            val colorStripe: View = view.findViewById(R.id.viewColorStripe)
            val textName: TextView = view.findViewById(R.id.textSlotName)
            val textTime: TextView = view.findViewById(R.id.textSlotTime)
            val textDuration: TextView = view.findViewById(R.id.textSlotDuration)
            val textBreak: TextView = view.findViewById(R.id.textSlotBreak)
            val textRole: TextView = view.findViewById(R.id.textSlotRole)
            val textPickStatus: TextView = view.findViewById(R.id.textPickStatus)
            val buttonPick: MaterialButton = view.findViewById(R.id.buttonPick)
        }
    }
}
