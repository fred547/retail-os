package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.LinearLayout
import androidx.activity.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ActivityOrdersBinding
import com.posterita.pos.android.domain.model.OrderDetails
import com.posterita.pos.android.ui.adapter.OrderHistoryRecyclerAdapter
import com.posterita.pos.android.ui.viewmodel.OrdersViewModel
import dagger.hilt.android.AndroidEntryPoint
import java.util.Calendar

@AndroidEntryPoint
class OrdersActivity : BaseDrawerActivity() {

    private lateinit var binding: ActivityOrdersBinding
    private val ordersViewModel: OrdersViewModel by viewModels()
    private lateinit var orderAdapter: OrderHistoryRecyclerAdapter

    private var allOrders: List<OrderDetails> = emptyList()
    private var currentSearchQuery: String = ""
    private var currentDateFilter: DateFilter = DateFilter.ALL
    private var currentStatusFilter: StatusFilter = StatusFilter.ALL

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

        // Set up toolbar with hamburger menu
        binding.toolbar.setNavigationIcon(R.drawable.ic_drawer)
        binding.toolbar.setNavigationOnClickListener { openDrawer() }

        setupDrawerNavigation()
        setupRecyclerView()
        setupSearch()
        setupFilterChips()
        observeViewModel()

        // Show loading spinner while orders load
        binding.progressLoadingOrders.visibility = View.VISIBLE
        binding.recyclerViewOrders.visibility = View.GONE
        ordersViewModel.loadOrders()
    }

    private fun setupRecyclerView() {
        orderAdapter = OrderHistoryRecyclerAdapter(object : OrderHistoryRecyclerAdapter.OnItemClickListener {
            override fun onItemClick(order: OrderDetails) {
                val intent = Intent(this@OrdersActivity, ViewOrderActivity::class.java)
                intent.putExtra("ORDER_UUID", order.uuid)
                startActivity(intent)
            }
        })
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
                applyFilters()
            }
        })
    }

    private fun setupFilterChips() {
        binding.chipAll.setOnClickListener {
            currentDateFilter = DateFilter.ALL
            currentStatusFilter = StatusFilter.ALL
            applyFilters()
        }
        binding.chipToday.setOnClickListener {
            currentDateFilter = DateFilter.TODAY
            currentStatusFilter = StatusFilter.ALL
            applyFilters()
        }
        binding.chipYesterday.setOnClickListener {
            currentDateFilter = DateFilter.YESTERDAY
            currentStatusFilter = StatusFilter.ALL
            applyFilters()
        }
        binding.chipThisWeek.setOnClickListener {
            currentDateFilter = DateFilter.THIS_WEEK
            currentStatusFilter = StatusFilter.ALL
            applyFilters()
        }
        binding.chipThisMonth.setOnClickListener {
            currentDateFilter = DateFilter.THIS_MONTH
            currentStatusFilter = StatusFilter.ALL
            applyFilters()
        }
        binding.chipPaid.setOnClickListener {
            currentStatusFilter = StatusFilter.PAID
            currentDateFilter = DateFilter.ALL
            applyFilters()
        }
        binding.chipVoided.setOnClickListener {
            currentStatusFilter = StatusFilter.VOIDED
            currentDateFilter = DateFilter.ALL
            applyFilters()
        }
    }

    private fun observeViewModel() {
        ordersViewModel.orders.observe(this) { orders ->
            binding.progressLoadingOrders.visibility = View.GONE
            allOrders = orders
            applyFilters()
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

    override fun onResume() {
        super.onResume()
        ordersViewModel.loadOrders()
    }
}
