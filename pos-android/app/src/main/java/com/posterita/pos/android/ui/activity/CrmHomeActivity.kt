package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.inputmethod.EditorInfo
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
 * - Loyalty program status & config detail (earn rate, point value, min redeem, welcome bonus)
 * - Quick points lookup by name/phone (inline, no navigation needed)
 * - Recent customers list sorted by loyalty points
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

    private var loyaltyConfig: LoyaltyConfig? = null
    private val handler = Handler(Looper.getMainLooper())
    private var searchRunnable: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCrmHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupHelpButton("crm_home")
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)

        binding.buttonBack.setOnClickListener { finish() }

        // Action buttons
        binding.buttonSearchCustomer.setOnClickListener {
            startActivity(Intent(this, SearchCustomerActivity::class.java))
        }
        binding.buttonLoyaltyConfig.setOnClickListener {
            openWebConsole("/loyalty", "Loyalty Program")
        }

        // Quick search
        setupQuickSearch()

        // Customer list
        customerAdapter = CustomerListAdapter(customers, loyaltyConfig) { customer ->
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

    private fun setupQuickSearch() {
        binding.editQuickSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                searchRunnable?.let { handler.removeCallbacks(it) }
            }
            override fun afterTextChanged(s: Editable?) {
                val query = s.toString().trim()
                if (query.isEmpty()) {
                    binding.cardQuickResult.visibility = View.GONE
                    binding.textQuickNoResult.visibility = View.GONE
                    return
                }
                searchRunnable = Runnable { performQuickSearch(query) }
                handler.postDelayed(searchRunnable!!, 400)
            }
        })

        binding.editQuickSearch.setOnEditorActionListener { _, actionId, _ ->
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                val query = binding.editQuickSearch.text.toString().trim()
                if (query.isNotEmpty()) performQuickSearch(query)
                true
            } else false
        }

        binding.buttonQuickSearch.setOnClickListener {
            val query = binding.editQuickSearch.text.toString().trim()
            if (query.isNotEmpty()) performQuickSearch(query)
        }
    }

    private fun performQuickSearch(query: String) {
        lifecycleScope.launch {
            val results = withContext(Dispatchers.IO) {
                val byPhone = db.customerDao().searchCustomersByPhone("%$query%")
                val byName = db.customerDao().searchCustomersByName("%$query%")
                (byPhone + byName).distinctBy { it.customer_id }
            }

            if (results.isEmpty()) {
                binding.cardQuickResult.visibility = View.GONE
                binding.textQuickNoResult.visibility = View.VISIBLE
                return@launch
            }

            // Show the best match (highest loyalty points, or first result)
            val best = results.maxByOrNull { it.loyaltypoints } ?: results.first()
            showQuickResult(best)
        }
    }

    private fun showQuickResult(customer: Customer) {
        binding.textQuickNoResult.visibility = View.GONE
        binding.cardQuickResult.visibility = View.VISIBLE

        val name = customer.name ?: "Customer"
        binding.textQuickResultInitial.text = name.firstOrNull()?.uppercase() ?: "?"
        binding.textQuickResultName.text = name
        binding.textQuickResultPhone.text = customer.phone1 ?: customer.mobile ?: customer.email ?: ""

        val pts = customer.loyaltypoints
        binding.textQuickResultPoints.text = "$pts pts"

        // Show currency value of points
        val config = loyaltyConfig
        val currency = sessionManager.account?.currency ?: ""
        if (config != null && pts > 0) {
            val value = pts * config.redemption_rate
            binding.textQuickResultValue.text = "Worth $currency ${NumberUtils.formatPrice(value)}"
            binding.textQuickResultValue.visibility = View.VISIBLE

            // Redeemable indicator
            if (pts >= config.min_redeem_points) {
                binding.textQuickResultRedeemable.text = "Can redeem"
                binding.textQuickResultRedeemable.setTextColor(getColor(R.color.posterita_secondary))
                binding.textQuickResultRedeemable.setBackgroundColor(getColor(R.color.posterita_secondary_light))
            } else {
                val needed = config.min_redeem_points - pts
                binding.textQuickResultRedeemable.text = "$needed more pts to redeem"
                binding.textQuickResultRedeemable.setTextColor(getColor(R.color.posterita_muted))
                binding.textQuickResultRedeemable.setBackgroundColor(0x00000000)
            }
            binding.textQuickResultRedeemable.visibility = View.VISIBLE
        } else {
            binding.textQuickResultValue.visibility = View.GONE
            binding.textQuickResultRedeemable.visibility = View.GONE
        }

        // Tap to open full details
        binding.cardQuickResult.setOnClickListener {
            val intent = Intent(this, CustomerDetailsActivity::class.java)
            intent.putExtra("CUSTOMER_ID", customer.customer_id)
            startActivity(intent)
        }
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

            // Loyalty config
            loyaltyConfig = withContext(Dispatchers.IO) {
                db.loyaltyConfigDao().getActiveConfig(accountId)
            }
            val config = loyaltyConfig
            val currency = sessionManager.account?.currency ?: ""

            if (config != null) {
                binding.textLoyaltyStatus.text = "Active"
                binding.textLoyaltyStatus.setTextColor(getColor(R.color.posterita_secondary))
                binding.layoutLoyaltyDetails.visibility = View.VISIBLE
                binding.textLoyaltyInactive.visibility = View.GONE

                // Populate config details
                binding.textEarnRate.text = "${NumberUtils.formatQuantity(config.points_per_currency)} pts / $currency 1"
                binding.textRedemptionRate.text = "1 pt = $currency ${NumberUtils.formatPrice(config.redemption_rate)}"
                binding.textMinRedeem.text = "${config.min_redeem_points} pts"
                binding.textWelcomeBonus.text = if (config.welcome_bonus > 0) "${config.welcome_bonus} pts" else "None"
            } else {
                binding.textLoyaltyStatus.text = "Inactive"
                binding.textLoyaltyStatus.setTextColor(getColor(R.color.posterita_muted))
                binding.layoutLoyaltyDetails.visibility = View.GONE
                binding.textLoyaltyInactive.visibility = View.VISIBLE
            }

            // Update adapter's config reference for currency value display
            customerAdapter.updateConfig(config)

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
        private var config: LoyaltyConfig?,
        private val onClick: (Customer) -> Unit
    ) : RecyclerView.Adapter<CustomerListAdapter.VH>() {

        fun updateConfig(newConfig: LoyaltyConfig?) {
            config = newConfig
        }

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
