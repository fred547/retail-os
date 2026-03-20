package com.posterita.pos.android.ui.activity

import android.app.DatePickerDialog
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.PopupMenu
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Till
import com.posterita.pos.android.databinding.ActivityTillHistoryBinding
import com.posterita.pos.android.ui.adapter.TillSessionAdapter
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import javax.inject.Inject

@AndroidEntryPoint
class TillHistoryActivity : BaseDrawerActivity() {

    private lateinit var binding: ActivityTillHistoryBinding
    private lateinit var adapter: TillSessionAdapter

    @Inject lateinit var db: AppDatabase

    private var allTills: List<TillSessionAdapter.TillDisplayItem> = emptyList()
    private var currentDateFilter: DateFilter = DateFilter.TODAY
    private var currentStatusFilter: TillStatusFilter = TillStatusFilter.ALL

    private var customDateStart: Long = 0L
    private var customDateEnd: Long = 0L

    enum class DateFilter { TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH, ALL_TIME, CUSTOM_RANGE }
    enum class TillStatusFilter { ALL, OPEN, CLOSED, DISCREPANCY }

    override fun getDrawerHighlightId(): Int = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentViewWithDrawer(R.layout.activity_till_history)
        binding = ActivityTillHistoryBinding.bind(drawerLayout.getChildAt(0))
        supportActionBar?.hide()

        binding.buttonBack.setOnClickListener { finish() }

        setupDrawerNavigation()
        setupRecyclerView()
        setupDateSelector()
        setupStatusChips()

        binding.progressLoading.visibility = View.VISIBLE
        binding.recyclerViewTills.visibility = View.GONE

        loadTills()
        updateDatePillText()
    }

    private fun setupRecyclerView() {
        adapter = TillSessionAdapter { till ->
            if (till.dateClosed != null) {
                val intent = Intent(this, CloseTillActivity::class.java)
                intent.putExtra("TILL_ID", till.tillId)
                startActivity(intent)
            }
        }
        binding.recyclerViewTills.apply {
            layoutManager = LinearLayoutManager(this@TillHistoryActivity)
            adapter = this@TillHistoryActivity.adapter
        }
    }

    // ── Date selector pill ──────────────────────────────────────────────

    private fun setupDateSelector() {
        binding.textDateFilter.setOnClickListener { view ->
            val popup = PopupMenu(this, view)
            popup.menu.add(0, 0, 0, "Today")
            popup.menu.add(0, 1, 1, "Yesterday")
            popup.menu.add(0, 2, 2, "This Week")
            popup.menu.add(0, 3, 3, "This Month")
            popup.menu.add(0, 4, 4, "All Time")
            popup.menu.add(0, 5, 5, "Custom Range\u2026")

            popup.setOnMenuItemClickListener { item ->
                when (item.itemId) {
                    0 -> { currentDateFilter = DateFilter.TODAY; onFilterChanged() }
                    1 -> { currentDateFilter = DateFilter.YESTERDAY; onFilterChanged() }
                    2 -> { currentDateFilter = DateFilter.THIS_WEEK; onFilterChanged() }
                    3 -> { currentDateFilter = DateFilter.THIS_MONTH; onFilterChanged() }
                    4 -> { currentDateFilter = DateFilter.ALL_TIME; onFilterChanged() }
                    5 -> showCustomDateRangePicker()
                }
                true
            }
            popup.show()
        }
    }

    private fun showCustomDateRangePicker() {
        val now = Calendar.getInstance()
        val startPicker = DatePickerDialog(this, { _, year, month, day ->
            val startCal = Calendar.getInstance().apply {
                set(year, month, day, 0, 0, 0)
                set(Calendar.MILLISECOND, 0)
            }
            customDateStart = startCal.timeInMillis

            val endPicker = DatePickerDialog(this, { _, y2, m2, d2 ->
                val endCal = Calendar.getInstance().apply {
                    set(y2, m2, d2, 23, 59, 59)
                    set(Calendar.MILLISECOND, 999)
                }
                customDateEnd = endCal.timeInMillis
                currentDateFilter = DateFilter.CUSTOM_RANGE
                onFilterChanged()
            }, year, month, day)
            endPicker.setTitle("End date")
            endPicker.show()
        }, now.get(Calendar.YEAR), now.get(Calendar.MONTH), now.get(Calendar.DAY_OF_MONTH))
        startPicker.setTitle("Start date")
        startPicker.show()
    }

    private fun onFilterChanged() {
        updateDatePillText()
        applyFilters()
    }

    private fun updateDatePillText() {
        val label = when (currentDateFilter) {
            DateFilter.TODAY -> "\uD83D\uDCC5 Today \u25BE"
            DateFilter.YESTERDAY -> "\uD83D\uDCC5 Yesterday \u25BE"
            DateFilter.THIS_WEEK -> "\uD83D\uDCC5 This Week \u25BE"
            DateFilter.THIS_MONTH -> "\uD83D\uDCC5 This Month \u25BE"
            DateFilter.ALL_TIME -> "\uD83D\uDCC5 All Time \u25BE"
            DateFilter.CUSTOM_RANGE -> {
                val fmt = SimpleDateFormat("MMM d", Locale.getDefault())
                "\uD83D\uDCC5 ${fmt.format(customDateStart)} \u2013 ${fmt.format(customDateEnd)} \u25BE"
            }
        }
        binding.textDateFilter.text = label
    }

    // ── Status filter chips ─────────────────────────────────────────────

    private fun setupStatusChips() {
        binding.chipAll.setOnClickListener {
            currentStatusFilter = TillStatusFilter.ALL
            applyFilters()
        }
        binding.chipOpen.setOnClickListener {
            currentStatusFilter = TillStatusFilter.OPEN
            applyFilters()
        }
        binding.chipClosed.setOnClickListener {
            currentStatusFilter = TillStatusFilter.CLOSED
            applyFilters()
        }
        binding.chipDiscrepancy.setOnClickListener {
            currentStatusFilter = TillStatusFilter.DISCREPANCY
            applyFilters()
        }
    }

    // ── Data loading ────────────────────────────────────────────────────

    private fun loadTills() {
        lifecycleScope.launch(Dispatchers.IO) {
            val tills = db.tillDao().getAllTills()

            // Build a lookup of user names and terminal names
            val users = db.userDao().getAllUsers().associateBy { it.user_id }
            val terminals = db.terminalDao().getTerminalsForStore(prefsManager.storeId)
                .associateBy { it.terminalId }

            val displayItems = tills.map { till ->
                val userName = users[till.openBy]?.let { user ->
                    val first = user.firstname?.take(15) ?: ""
                    val lastInitial = user.lastname?.firstOrNull()?.let { "$it." } ?: ""
                    "$first $lastInitial".trim()
                } ?: "User #${till.openBy}"

                val terminalName = terminals[till.terminal_id]?.name
                    ?: "Terminal ${till.terminal_id}"

                TillSessionAdapter.TillDisplayItem(till, terminalName, userName)
            }.sortedByDescending { it.till.dateOpened?.time ?: 0L }

            withContext(Dispatchers.Main) {
                allTills = displayItems
                binding.progressLoading.visibility = View.GONE
                applyFilters()
            }
        }
    }

    private fun applyFilters() {
        var filtered = allTills

        // 1. Date filter
        filtered = filterByDate(filtered)

        // 2. Status filter
        filtered = when (currentStatusFilter) {
            TillStatusFilter.ALL -> filtered
            TillStatusFilter.OPEN -> filtered.filter { it.till.dateClosed == null }
            TillStatusFilter.CLOSED -> filtered.filter { it.till.dateClosed != null }
            TillStatusFilter.DISCREPANCY -> filtered.filter { item ->
                val till = item.till
                till.dateClosed != null && (till.closingAmt - (till.openingAmt + till.cashamt)) != 0.0
            }
        }

        // Update UI
        adapter.setItems(filtered)
        val count = filtered.size
        val statusLabel = when (currentStatusFilter) {
            TillStatusFilter.OPEN -> "open session"
            TillStatusFilter.CLOSED -> "closed session"
            TillStatusFilter.DISCREPANCY -> "discrepancy"
            else -> "session"
        }
        binding.txtResultCount.text = if (allTills.isEmpty()) "" else "$count $statusLabel${if (count != 1) "s" else ""}"

        val showEmpty = filtered.isEmpty()
        binding.layoutEmpty.visibility = if (showEmpty) View.VISIBLE else View.GONE
        binding.recyclerViewTills.visibility = if (showEmpty) View.GONE else View.VISIBLE

        if (showEmpty) {
            binding.txtEmpty.text = if (allTills.isEmpty()) "No till sessions" else "No sessions found"
            binding.txtEmptySubtitle.text = if (allTills.isEmpty())
                "Till sessions will appear here"
            else
                "Try adjusting your date or status filter"
        }
    }

    private fun filterByDate(items: List<TillSessionAdapter.TillDisplayItem>): List<TillSessionAdapter.TillDisplayItem> {
        if (currentDateFilter == DateFilter.ALL_TIME) return items

        val now = Calendar.getInstance()
        val (rangeStart, rangeEnd) = when (currentDateFilter) {
            DateFilter.TODAY -> {
                val start = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                }
                val end = Calendar.getInstance().apply {
                    set(Calendar.HOUR_OF_DAY, 23); set(Calendar.MINUTE, 59)
                    set(Calendar.SECOND, 59); set(Calendar.MILLISECOND, 999)
                }
                start.timeInMillis to end.timeInMillis
            }
            DateFilter.YESTERDAY -> {
                val start = Calendar.getInstance().apply {
                    add(Calendar.DAY_OF_YEAR, -1)
                    set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                }
                val end = Calendar.getInstance().apply {
                    add(Calendar.DAY_OF_YEAR, -1)
                    set(Calendar.HOUR_OF_DAY, 23); set(Calendar.MINUTE, 59)
                    set(Calendar.SECOND, 59); set(Calendar.MILLISECOND, 999)
                }
                start.timeInMillis to end.timeInMillis
            }
            DateFilter.THIS_WEEK -> {
                val start = Calendar.getInstance().apply {
                    set(Calendar.DAY_OF_WEEK, firstDayOfWeek)
                    set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                }
                start.timeInMillis to now.timeInMillis
            }
            DateFilter.THIS_MONTH -> {
                val start = Calendar.getInstance().apply {
                    set(Calendar.DAY_OF_MONTH, 1)
                    set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0)
                    set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                }
                start.timeInMillis to now.timeInMillis
            }
            DateFilter.CUSTOM_RANGE -> customDateStart to customDateEnd
            else -> return items
        }

        return items.filter { item ->
            val t = item.till.dateOpened?.time ?: 0L
            t in rangeStart..rangeEnd
        }
    }

    override fun onResume() {
        super.onResume()
        loadTills()
    }
}
