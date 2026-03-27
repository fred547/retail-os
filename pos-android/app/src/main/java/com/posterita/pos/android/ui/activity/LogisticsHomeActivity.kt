package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.google.android.material.tabs.TabLayout
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Delivery
import com.posterita.pos.android.databinding.ActivityLogisticsHomeBinding
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Logistics Hub: Deliveries & Dispatch.
 * - Delivery summary cards (pending, in transit, delivered today)
 * - Delivery list with status filters
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
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)

        binding.buttonBack.setOnClickListener { finish() }

        // Web console for full management
        binding.buttonManageDeliveries.setOnClickListener {
            openWebConsole("/deliveries", "Deliveries")
        }

        // Delivery list
        deliveryAdapter = DeliveryListAdapter(displayDeliveries)
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
            val accountId = prefsManager.accountId
            allDeliveries = withContext(Dispatchers.IO) {
                db.deliveryDao().getDeliveries(accountId)
            }

            // Summary
            val pending = allDeliveries.count { it.status == Delivery.STATUS_PENDING }
            val inTransit = allDeliveries.count { it.status in listOf(Delivery.STATUS_ASSIGNED, Delivery.STATUS_PICKED_UP, Delivery.STATUS_IN_TRANSIT) }
            val delivered = allDeliveries.count { it.status == Delivery.STATUS_DELIVERED }

            binding.textPending.text = pending.toString()
            binding.textInTransit.text = inTransit.toString()
            binding.textDelivered.text = delivered.toString()

            filterDeliveries(binding.tabFilter.selectedTabPosition)
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

    private fun openWebConsole(path: String, title: String) {
        val intent = Intent(this, WebConsoleActivity::class.java)
        intent.putExtra(WebConsoleActivity.EXTRA_PATH, path)
        intent.putExtra(WebConsoleActivity.EXTRA_TITLE, title)
        startActivity(intent)
    }

    // --- Delivery Adapter ---

    private class DeliveryListAdapter(
        private val deliveries: List<Delivery>
    ) : RecyclerView.Adapter<DeliveryListAdapter.VH>() {

        class VH(view: View) : RecyclerView.ViewHolder(view) {
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
            holder.textCustomer.text = d.customer_name ?: "Customer #${d.customer_id ?: "?"}"
            holder.textAddress.text = d.delivery_address ?: ""
            holder.textDriver.text = d.driver_name ?: "Unassigned"

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
        }

        override fun getItemCount() = deliveries.size
    }
}
