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
import com.posterita.pos.android.data.local.entity.Customer
import com.posterita.pos.android.data.local.entity.LoyaltyConfig
import com.posterita.pos.android.databinding.ActivityCrmHomeBinding
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * CRM Hub: Customers & Loyalty in one place.
 * - Customer summary cards (total, with loyalty, top spenders)
 * - Loyalty program status
 * - Recent customers list
 * - Search + create customer
 */
@AndroidEntryPoint
class CrmHomeActivity : BaseActivity() {

    private lateinit var binding: ActivityCrmHomeBinding

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    private val customers = mutableListOf<Customer>()
    private lateinit var customerAdapter: CustomerListAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCrmHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)

        binding.buttonBack.setOnClickListener { finish() }

        // Action buttons
        binding.buttonSearchCustomer.setOnClickListener {
            startActivity(Intent(this, SearchCustomerActivity::class.java))
        }
        binding.buttonLoyaltyConfig.setOnClickListener {
            openWebConsole("/loyalty", "Loyalty Program")
        }

        // Customer list
        customerAdapter = CustomerListAdapter(customers) { customer ->
            val intent = Intent(this, CustomerDetailsActivity::class.java)
            intent.putExtra("CUSTOMER_ID", customer.customer_id)
            startActivity(intent)
        }
        binding.recyclerCustomers.layoutManager = LinearLayoutManager(this)
        binding.recyclerCustomers.adapter = customerAdapter
    }

    override fun onResume() {
        super.onResume()
        loadData()
    }

    private fun loadData() {
        lifecycleScope.launch {
            val accountId = prefsManager.accountId

            // Load all customers
            val allCustomers = withContext(Dispatchers.IO) {
                db.customerDao().getAllCustomersSync()
            }

            // Summary stats
            val total = allCustomers.size
            val withLoyalty = allCustomers.count { it.loyaltypoints > 0 }
            val totalPoints = allCustomers.sumOf { it.loyaltypoints }

            binding.textTotalCustomers.text = total.toString()
            binding.textLoyaltyMembers.text = withLoyalty.toString()
            binding.textTotalPoints.text = NumberUtils.formatQuantity(totalPoints.toDouble())

            // Loyalty config status
            val loyaltyConfig = withContext(Dispatchers.IO) {
                db.loyaltyConfigDao().getActiveConfig(accountId)
            }
            if (loyaltyConfig != null) {
                binding.textLoyaltyStatus.text = "Active — ${loyaltyConfig.points_per_currency} pts/unit"
                binding.textLoyaltyStatus.setTextColor(getColor(R.color.posterita_secondary))
            } else {
                binding.textLoyaltyStatus.text = "Not configured"
                binding.textLoyaltyStatus.setTextColor(getColor(R.color.posterita_muted))
            }

            // Customer list: sorted by loyalty points (top spenders first), then name
            customers.clear()
            customers.addAll(allCustomers.sortedWith(
                compareByDescending<Customer> { it.loyaltypoints }
                    .thenBy { it.name ?: "" }
            ))
            customerAdapter.notifyDataSetChanged()

            binding.layoutEmptyCustomers.visibility = if (customers.isEmpty()) View.VISIBLE else View.GONE
            binding.recyclerCustomers.visibility = if (customers.isEmpty()) View.GONE else View.VISIBLE
        }
    }

    private fun openWebConsole(path: String, title: String) {
        val intent = Intent(this, WebConsoleActivity::class.java)
        intent.putExtra(WebConsoleActivity.EXTRA_PATH, path)
        intent.putExtra(WebConsoleActivity.EXTRA_TITLE, title)
        startActivity(intent)
    }

    // --- Customer List Adapter ---

    private class CustomerListAdapter(
        private val customers: List<Customer>,
        private val onClick: (Customer) -> Unit
    ) : RecyclerView.Adapter<CustomerListAdapter.VH>() {

        class VH(view: View) : RecyclerView.ViewHolder(view) {
            val card: MaterialCardView = view as MaterialCardView
            val textInitial: TextView = view.findViewById(R.id.textInitial)
            val textName: TextView = view.findViewById(R.id.textName)
            val textPhone: TextView = view.findViewById(R.id.textPhone)
            val textPoints: TextView = view.findViewById(R.id.textPoints)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_crm_customer, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val c = customers[position]
            val name = c.name ?: "Customer"
            holder.textInitial.text = name.firstOrNull()?.uppercase() ?: "?"
            holder.textName.text = name
            holder.textPhone.text = c.phone1 ?: c.mobile ?: c.email ?: ""

            val pts = c.loyaltypoints
            if (pts > 0) {
                holder.textPoints.text = "$pts pts"
                holder.textPoints.visibility = View.VISIBLE
            } else {
                holder.textPoints.visibility = View.GONE
            }

            holder.card.setOnClickListener { onClick(c) }
        }

        override fun getItemCount() = customers.size
    }
}
