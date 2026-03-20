package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
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
import java.util.Calendar
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
    private var currentDateFilter: DateFilter = DateFilter.ALL
    private var currentStatusFilter: StatusFilter = StatusFilter.ALL
    private var isShowingHeld: Boolean = false

    enum class DateFilter { ALL, TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH }
    enum class StatusFilter { ALL, PAID, VOIDED }

    override fun getDrawerHighlightId(): Int = R.id.nav_orders

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentViewWithDrawer(R.layout.activity_orders)
        binding = ActivityOrdersBinding.bind(
            (drawerLayout.getChildAt(0))
        )
        supportActionBar?.hide()

        // Back button (← arrow, consistent with Cart/Products)
        binding.buttonBack.setOnClickListener { finish() }

        setupDrawerNavigation()
        setupRecyclerView()
        setupSearch()
        setupFilterChips()
        observeViewModel()

        // Show loading spinner while orders load
        binding.progressLoadingOrders.visibility = View.VISIBLE
        binding.recyclerViewOrders.visibility = View.GONE
        ordersViewModel.loadOrders()

        // Load held order count for badge
        updateHeldChipCount()
    }

    private fun setupRecyclerView() {
        orderAdapter = OrderHistoryRecyclerAdapter(object : OrderHistoryRecyclerAdapter.OnItemClickListener {
            override fun onItemClick(order: OrderDetails) {
                val intent = Intent(this@OrdersActivity, ViewOrderActivity::class.java)
                intent.putExtra("ORDER_UUID", order.uuid)
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

    private fun setupFilterChips() {
        binding.chipAll.setOnClickListener {
            currentDateFilter = DateFilter.ALL
            currentStatusFilter = StatusFilter.ALL
            switchToRegularOrders()
            applyFilters()
        }
        binding.chipToday.setOnClickListener {
            currentDateFilter = DateFilter.TODAY
            currentStatusFilter = StatusFilter.ALL
            switchToRegularOrders()
            applyFilters()
        }
        binding.chipYesterday.setOnClickListener {
            currentDateFilter = DateFilter.YESTERDAY
            currentStatusFilter = StatusFilter.ALL
            switchToRegularOrders()
            applyFilters()
        }
        binding.chipThisWeek.setOnClickListener {
            currentDateFilter = DateFilter.THIS_WEEK
            currentStatusFilter = StatusFilter.ALL
            switchToRegularOrders()
            applyFilters()
        }
        binding.chipThisMonth.setOnClickListener {
            currentDateFilter = DateFilter.THIS_MONTH
            currentStatusFilter = StatusFilter.ALL
            switchToRegularOrders()
            applyFilters()
        }
        binding.chipPaid.setOnClickListener {
            currentStatusFilter = StatusFilter.PAID
            currentDateFilter = DateFilter.ALL
            switchToRegularOrders()
            applyFilters()
        }
        binding.chipVoided.setOnClickListener {
            currentStatusFilter = StatusFilter.VOIDED
            currentDateFilter = DateFilter.ALL
            switchToRegularOrders()
            applyFilters()
        }
        binding.chipHeld.setOnClickListener {
            currentDateFilter = DateFilter.ALL
            currentStatusFilter = StatusFilter.ALL
            isShowingHeld = true
            binding.recyclerViewOrders.adapter = holdOrderAdapter
            loadHeldOrders()
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

    private fun applyFilters() {
        var filtered = allOrders

        // Apply date filter
        if (currentDateFilter != DateFilter.ALL) {
            val now = Calendar.getInstance()
            filtered = filtered.filter { order ->
                val orderTime = order.dateordered
                if (orderTime == 0L) return@filter false

                val orderCal = Calendar.getInstance().apply { timeInMillis = orderTime }

                when (currentDateFilter) {
                    DateFilter.TODAY -> isSameDay(orderCal, now)
                    DateFilter.YESTERDAY -> {
                        val yesterday = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, -1) }
                        isSameDay(orderCal, yesterday)
                    }
                    DateFilter.THIS_WEEK -> {
                        val weekStart = Calendar.getInstance().apply {
                            set(Calendar.DAY_OF_WEEK, firstDayOfWeek)
                            set(Calendar.HOUR_OF_DAY, 0)
                            set(Calendar.MINUTE, 0)
                            set(Calendar.SECOND, 0)
                            set(Calendar.MILLISECOND, 0)
                        }
                        orderCal.timeInMillis >= weekStart.timeInMillis
                    }
                    DateFilter.THIS_MONTH -> {
                        orderCal.get(Calendar.YEAR) == now.get(Calendar.YEAR) &&
                                orderCal.get(Calendar.MONTH) == now.get(Calendar.MONTH)
                    }
                    else -> true
                }
            }
        }

        // Apply status filter
        if (currentStatusFilter != StatusFilter.ALL) {
            filtered = filtered.filter { order ->
                when (currentStatusFilter) {
                    StatusFilter.PAID -> order.ispaid
                    StatusFilter.VOIDED -> order.status?.lowercase() == "voided"
                    else -> true
                }
            }
        }

        // Apply search query
        if (currentSearchQuery.isNotEmpty()) {
            filtered = filtered.filter { order ->
                val query = currentSearchQuery
                // Search by order number
                (order.documentno?.lowercase()?.contains(query) == true) ||
                // Search by customer name
                (order.customer_name?.lowercase()?.contains(query) == true) ||
                // Search by amount
                (order.grandtotal.toString().contains(query)) ||
                // Search by date text
                (order.dateorderedtext?.lowercase()?.contains(query) == true) ||
                // Search by user name
                (order.user_name?.lowercase()?.contains(query) == true) ||
                // Search by payment type
                (order.paymenttype?.lowercase()?.contains(query) == true)
            }
        }

        // Update UI
        orderAdapter.setOrderList(filtered)
        val count = filtered.size
        binding.txtResultCount.text = if (allOrders.isEmpty()) "" else "$count order${if (count != 1) "s" else ""}"

        val showEmpty = filtered.isEmpty()
        binding.layoutEmptyOrders.visibility = if (showEmpty) View.VISIBLE else View.GONE
        binding.recyclerViewOrders.visibility = if (showEmpty) View.GONE else View.VISIBLE

        // Update empty state subtitle based on context
        if (showEmpty) {
            binding.txtEmpty.text = if (allOrders.isEmpty()) "No orders yet" else "No orders found"
            binding.txtEmptySubtitle.text = if (allOrders.isEmpty())
                "Completed orders will appear here"
            else
                "Try adjusting your search or filters"
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
