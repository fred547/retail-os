package com.posterita.pos.android.ui.activity

import android.app.DatePickerDialog
import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.PopupMenu
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.dao.ProductDao
import com.posterita.pos.android.data.local.entity.HoldOrder
import com.posterita.pos.android.databinding.ActivityOrdersBinding
import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.domain.model.ShoppingCart
import com.posterita.pos.android.ui.adapter.HoldOrderAdapter
import com.posterita.pos.android.ui.adapter.OrderHistoryRecyclerAdapter
import com.posterita.pos.android.ui.viewmodel.OrdersViewModel
import com.posterita.pos.android.util.SessionManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import javax.inject.Inject

@AndroidEntryPoint
class OrdersActivity : BaseDrawerActivity(), HoldOrderAdapter.OnHoldOrderClickListener {

    private lateinit var binding: ActivityOrdersBinding
    private val ordersViewModel: OrdersViewModel by viewModels()
    private lateinit var orderAdapter: OrderHistoryRecyclerAdapter
    private lateinit var holdOrderAdapter: HoldOrderAdapter

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var shoppingCart: ShoppingCart
    @Inject lateinit var productDao: ProductDao

    private var allOrders: List<OrderDetails> = emptyList()
    private var currentSearchQuery: String = ""
    private var currentDateFilter: DateFilter = DateFilter.TODAY
    private var currentStatusFilter: StatusFilter = StatusFilter.ALL
    private var isShowingHeld: Boolean = false

    // Custom date range bounds (millis). Used when dateFilter == CUSTOM_RANGE
    private var customDateStart: Long = 0L
    private var customDateEnd: Long = 0L

    enum class DateFilter { TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH, ALL_TIME, CUSTOM_RANGE }
    enum class StatusFilter { ALL, HELD, PAID, REFUNDED, VOIDED }

    override fun getDrawerHighlightId(): Int = R.id.nav_orders

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentViewWithDrawer(R.layout.activity_orders)
        binding = ActivityOrdersBinding.bind(
            (drawerLayout.getChildAt(0))
        )
        supportActionBar?.hide()

        // Back button
        binding.buttonBack.setOnClickListener { finish() }

        setupDrawerNavigation()
        setupRecyclerView()
        setupSearch()
        setupDateSelector()
        setupStatusChips()
        observeViewModel()

        // Show loading spinner while orders load
        binding.progressLoadingOrders.visibility = View.VISIBLE
        binding.recyclerViewOrders.visibility = View.GONE
        ordersViewModel.loadOrders()

        // Load held order count for badge
        updateHeldChipCount()
        updateDatePillText()
    }

    private fun setupRecyclerView() {
        orderAdapter = OrderHistoryRecyclerAdapter(object : OrderHistoryRecyclerAdapter.OnItemClickListener {
            override fun onItemClick(order: OrderDetails) {
                // Use unified ReceiptActivity (same view as post-checkout, but without success banner)
                val intent = Intent(this@OrdersActivity, ReceiptActivity::class.java)
                intent.putExtra("ORDER_UUID", order.uuid)
                intent.putExtra(ReceiptActivity.EXTRA_FROM_CHECKOUT, false)
                startActivity(intent)
            }
        })
        holdOrderAdapter = HoldOrderAdapter(this)
        binding.recyclerViewOrders.apply {
            layoutManager = LinearLayoutManager(this@OrdersActivity)
            adapter = orderAdapter
        }
    }

    private fun setupSearch() {
        binding.editSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                currentSearchQuery = s?.toString()?.trim()?.lowercase() ?: ""
                if (isShowingHeld) {
                    loadHeldOrders()
                } else {
                    applyFilters()
                }
            }
        })
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
                    0 -> {
                        currentDateFilter = DateFilter.TODAY
                        onDateFilterChanged()
                    }
                    1 -> {
                        currentDateFilter = DateFilter.YESTERDAY
                        onDateFilterChanged()
                    }
                    2 -> {
                        currentDateFilter = DateFilter.THIS_WEEK
                        onDateFilterChanged()
                    }
                    3 -> {
                        currentDateFilter = DateFilter.THIS_MONTH
                        onDateFilterChanged()
                    }
                    4 -> {
                        currentDateFilter = DateFilter.ALL_TIME
                        onDateFilterChanged()
                    }
                    5 -> showCustomDateRangePicker()
                }
                true
            }
            popup.show()
        }
    }

    private fun showCustomDateRangePicker() {
        val now = Calendar.getInstance()

        // Pick start date
        val startPicker = DatePickerDialog(this, { _, year, month, day ->
            val startCal = Calendar.getInstance().apply {
                set(year, month, day, 0, 0, 0)
                set(Calendar.MILLISECOND, 0)
            }
            customDateStart = startCal.timeInMillis

            // Then pick end date
            val endPicker = DatePickerDialog(this, { _, y2, m2, d2 ->
                val endCal = Calendar.getInstance().apply {
                    set(y2, m2, d2, 23, 59, 59)
                    set(Calendar.MILLISECOND, 999)
                }
                customDateEnd = endCal.timeInMillis
                currentDateFilter = DateFilter.CUSTOM_RANGE
                onDateFilterChanged()
            }, year, month, day)
            endPicker.setTitle("End date")
            endPicker.show()

        }, now.get(Calendar.YEAR), now.get(Calendar.MONTH), now.get(Calendar.DAY_OF_MONTH))
        startPicker.setTitle("Start date")
        startPicker.show()
    }

    private fun onDateFilterChanged() {
        updateDatePillText()
        if (isShowingHeld) {
            // Stay on held view but refilter
            loadHeldOrders()
        } else {
            applyFilters()
        }
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
                val start = fmt.format(customDateStart)
                val end = fmt.format(customDateEnd)
                "\uD83D\uDCC5 $start \u2013 $end \u25BE"
            }
        }
        binding.textDateFilter.text = label
    }

    // ── Status filter chips ─────────────────────────────────────────────

    private fun setupStatusChips() {
        binding.chipAll.setOnClickListener {
            currentStatusFilter = StatusFilter.ALL
            switchToRegularOrders()
            applyFilters()
        }
        binding.chipHeld.setOnClickListener {
            currentStatusFilter = StatusFilter.HELD
            isShowingHeld = true
            binding.recyclerViewOrders.adapter = holdOrderAdapter
            loadHeldOrders()
        }
        binding.chipPaid.setOnClickListener {
            currentStatusFilter = StatusFilter.PAID
            switchToRegularOrders()
            applyFilters()
        }
        binding.chipRefunded.setOnClickListener {
            currentStatusFilter = StatusFilter.REFUNDED
            switchToRegularOrders()
            applyFilters()
        }
        binding.chipVoided.setOnClickListener {
            currentStatusFilter = StatusFilter.VOIDED
            switchToRegularOrders()
            applyFilters()
        }
    }

    /**
     * Switch back from held orders view to regular orders view.
     */
    private fun switchToRegularOrders() {
        if (isShowingHeld) {
            isShowingHeld = false
            binding.recyclerViewOrders.adapter = orderAdapter
        }
    }

    /**
     * Load held orders from the local database and display them.
     */
    private fun loadHeldOrders() {
        val terminalId = prefsManager.terminalId
        binding.progressLoadingOrders.visibility = View.VISIBLE

        lifecycleScope.launch(Dispatchers.IO) {
            val allHeld = db.holdOrderDao().getHoldOrdersByTerminal(terminalId)
            // Exclude kitchen orders — they appear in KitchenOrdersActivity
            val holdOrders = allHeld.filter { hold ->
                val json = hold.json
                json == null || !json.optBoolean("isKitchenOrder", false)
            }

            // Apply search filter if active
            val filtered = if (currentSearchQuery.isNotEmpty()) {
                holdOrders.filter { hold ->
                    val query = currentSearchQuery
                    (hold.description?.lowercase()?.contains(query) == true) ||
                    (hold.holdOrderId.toString().contains(query)) ||
                    try {
                        val amount = hold.json?.optDouble("grandtotal", 0.0) ?: 0.0
                        amount.toString().contains(query)
                    } catch (e: Exception) {
                        false
                    }
                }
            } else {
                holdOrders
            }

            withContext(Dispatchers.Main) {
                binding.progressLoadingOrders.visibility = View.GONE
                holdOrderAdapter.setHoldOrders(filtered)

                val count = filtered.size
                binding.txtResultCount.text = "$count held order${if (count != 1) "s" else ""}"

                val showEmpty = filtered.isEmpty()
                binding.layoutEmptyOrders.visibility = if (showEmpty) View.VISIBLE else View.GONE
                binding.recyclerViewOrders.visibility = if (showEmpty) View.GONE else View.VISIBLE

                if (showEmpty) {
                    binding.txtEmpty.text = if (holdOrders.isEmpty()) "No held orders" else "No held orders found"
                    binding.txtEmptySubtitle.text = if (holdOrders.isEmpty())
                        "Orders placed on hold will appear here"
                    else
                        "Try adjusting your search"
                }
            }
        }
    }

    /**
     * Update the Held chip text with the current count of held orders.
     * Shows "Held" when 0, "Held (3)" when there are held orders.
     */
    private fun updateHeldChipCount() {
        val terminalId = prefsManager.terminalId
        lifecycleScope.launch(Dispatchers.IO) {
            val allHeld = db.holdOrderDao().getHoldOrdersByTerminal(terminalId)
            val count = allHeld.count { hold ->
                val json = hold.json
                json == null || !json.optBoolean("isKitchenOrder", false)
            }
            withContext(Dispatchers.Main) {
                binding.chipHeld.text = if (count > 0) "Held ($count)" else "Held"
            }
        }
    }

    private fun observeViewModel() {
        ordersViewModel.orders.observe(this) { orders ->
            binding.progressLoadingOrders.visibility = View.GONE
            allOrders = orders
            if (!isShowingHeld) {
                applyFilters()
            }
        }
    }

    // ── Combined date + status + search filtering ───────────────────────

    private fun applyFilters() {
        var filtered = allOrders

        // 1. Apply date filter
        filtered = filterByDate(filtered)

        // 2. Apply status filter
        if (currentStatusFilter != StatusFilter.ALL && currentStatusFilter != StatusFilter.HELD) {
            filtered = filtered.filter { order ->
                when (currentStatusFilter) {
                    StatusFilter.PAID -> order.ispaid && order.status?.lowercase() != "voided"
                    StatusFilter.REFUNDED -> order.status?.lowercase() == "refunded"
                    StatusFilter.VOIDED -> order.status?.lowercase() == "voided"
                    else -> true
                }
            }
        }

        // 3. Apply search query
        if (currentSearchQuery.isNotEmpty()) {
            filtered = filtered.filter { order ->
                val query = currentSearchQuery
                (order.documentno?.lowercase()?.contains(query) == true) ||
                (order.customer_name?.lowercase()?.contains(query) == true) ||
                (order.grandtotal.toString().contains(query)) ||
                (order.dateorderedtext?.lowercase()?.contains(query) == true) ||
                (order.user_name?.lowercase()?.contains(query) == true) ||
                (order.paymenttype?.lowercase()?.contains(query) == true)
            }
        }

        // Update UI
        orderAdapter.setOrderList(filtered)
        val count = filtered.size
        val statusLabel = when (currentStatusFilter) {
            StatusFilter.PAID -> "paid order"
            StatusFilter.REFUNDED -> "refunded order"
            StatusFilter.VOIDED -> "voided order"
            else -> "order"
        }
        binding.txtResultCount.text = if (allOrders.isEmpty()) "" else "$count $statusLabel${if (count != 1) "s" else ""}"

        val showEmpty = filtered.isEmpty()
        binding.layoutEmptyOrders.visibility = if (showEmpty) View.VISIBLE else View.GONE
        binding.recyclerViewOrders.visibility = if (showEmpty) View.GONE else View.VISIBLE

        if (showEmpty) {
            binding.txtEmpty.text = if (allOrders.isEmpty()) "No orders yet" else "No orders found"
            binding.txtEmptySubtitle.text = if (allOrders.isEmpty())
                "Completed orders will appear here"
            else
                "Try adjusting your search or filters"
        }
    }

    private fun filterByDate(orders: List<OrderDetails>): List<OrderDetails> {
        if (currentDateFilter == DateFilter.ALL_TIME) return orders

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
            else -> return orders
        }

        return orders.filter { order ->
            val t = order.dateordered
            t in rangeStart..rangeEnd
        }
    }

    private fun isSameDay(cal1: Calendar, cal2: Calendar): Boolean {
        return cal1.get(Calendar.YEAR) == cal2.get(Calendar.YEAR) &&
                cal1.get(Calendar.DAY_OF_YEAR) == cal2.get(Calendar.DAY_OF_YEAR)
    }

    // --- HoldOrderAdapter callbacks ---

    override fun onEdit(holdOrder: HoldOrder, position: Int) {
        Toast.makeText(this, "Loading held order...", Toast.LENGTH_SHORT).show()

        lifecycleScope.launch(Dispatchers.IO) {
            val json = holdOrder.json
            if (json != null) {
                shoppingCart.restoreFromJson(json, productDao, sessionManager.taxCache)
            } else {
                shoppingCart.clearCart()
            }

            // Delete the hold order
            db.holdOrderDao().deleteHoldOrderById(holdOrder.holdOrderId)

            withContext(Dispatchers.Main) {
                val intent = Intent(this@OrdersActivity, CartActivity::class.java)
                startActivity(intent)
                finish()
            }
        }
    }

    override fun onDelete(holdOrder: HoldOrder, position: Int) {
        AlertDialog.Builder(this)
            .setTitle("Delete Hold Order")
            .setMessage("Are you sure you want to delete this held order?")
            .setPositiveButton(android.R.string.ok) { _, _ ->
                lifecycleScope.launch(Dispatchers.IO) {
                    db.holdOrderDao().deleteHoldOrderById(holdOrder.holdOrderId)
                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@OrdersActivity, "Hold order deleted", Toast.LENGTH_SHORT).show()
                        loadHeldOrders()
                        updateHeldChipCount()
                    }
                }
            }
            .setNegativeButton(android.R.string.cancel) { dialog, _ -> dialog.dismiss() }
            .show()
    }

    override fun onResume() {
        super.onResume()
        ordersViewModel.loadOrders()
        updateHeldChipCount()
        if (isShowingHeld) {
            loadHeldOrders()
        }
    }
}
