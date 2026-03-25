package com.posterita.pos.android.ui.activity

import android.graphics.Typeface
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Customer
import com.posterita.pos.android.data.local.entity.Order
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class CustomerDetailsActivity : BaseActivity() {

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var sessionManager: SessionManager

    private var customer: Customer? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_customer_details)

        @Suppress("DEPRECATION")
        customer = intent.getSerializableExtra("customer") as? Customer

        if (customer == null) {
            Toast.makeText(this, "No customer data found", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        findViewById<View>(R.id.back).setOnClickListener { finish() }
        findViewById<View>(R.id.button_remove_customer).setOnClickListener {
            setResult(RESULT_OK)
            finish()
        }

        displayCustomer(customer!!)
        loadStats(customer!!)
    }

    private fun displayCustomer(c: Customer) {
        val name = c.name ?: "Unknown"
        val phone = c.phone1 ?: c.mobile ?: ""

        // Hero
        findViewById<TextView>(R.id.tv_hero_initial).text = name.firstOrNull()?.uppercase() ?: "?"
        findViewById<TextView>(R.id.tv_hero_name).text = name
        findViewById<TextView>(R.id.tv_hero_phone).apply {
            text = phone
            visibility = if (phone.isNotBlank()) View.VISIBLE else View.GONE
        }

        // Loyalty points
        if (c.loyaltypoints > 0) {
            findViewById<View>(R.id.layout_stat_loyalty).visibility = View.VISIBLE
            findViewById<TextView>(R.id.tv_stat_loyalty).text = c.loyaltypoints.toInt().toString()
        }

        // Contact card
        setRow(R.id.row_phone, "Phone", c.phone1)
        setRow(R.id.row_mobile, "Mobile", c.mobile)
        setRow(R.id.row_email, "Email", c.email)
        val address = listOfNotNull(c.address1, c.city).filter { it.isNotBlank() }.joinToString(", ")
        setRow(R.id.row_address, "Address", address.ifBlank { null })

        // Account card — show only if there's data
        val hasAccount = c.openbalance != 0.0 || c.creditlimit != 0.0 || !c.note.isNullOrBlank()
        if (hasAccount) {
            val currency = sessionManager.account?.currency ?: ""
            findViewById<View>(R.id.card_account).visibility = View.VISIBLE
            setRow(R.id.row_balance, "Open Balance", "$currency ${NumberUtils.formatPrice(c.openbalance)}")
            setRow(R.id.row_credit_limit, "Credit Limit", "$currency ${NumberUtils.formatPrice(c.creditlimit)}")
            setRow(R.id.row_note, "Note", c.note)
        }
    }

    private fun setRow(rowId: Int, label: String, value: String?) {
        val row = findViewById<View>(rowId) ?: return
        row.findViewById<TextView>(R.id.tv_label)?.text = label
        row.findViewById<TextView>(R.id.tv_value)?.text = value ?: "—"
        if (value.isNullOrBlank()) {
            row.visibility = View.GONE
        }
    }

    private fun loadStats(c: Customer) {
        lifecycleScope.launch {
            val stats = withContext(Dispatchers.IO) {
                val orderCount = db.orderDao().getOrderCountForCustomer(c.customer_id)
                val totalSpent = db.orderDao().getTotalSpentByCustomer(c.customer_id)
                val recentOrders = db.orderDao().getOrdersByCustomerId(c.customer_id).take(10)
                Triple(orderCount, totalSpent, recentOrders)
            }

            val currency = sessionManager.account?.currency ?: ""

            // Stats
            findViewById<TextView>(R.id.tv_stat_orders).text = stats.first.toString()
            findViewById<TextView>(R.id.tv_stat_spent).text = "$currency ${NumberUtils.formatPrice(stats.second)}"

            // Recent orders
            val orders = stats.third
            val layoutOrders = findViewById<LinearLayout>(R.id.layout_orders_list)
            val tvNoOrders = findViewById<TextView>(R.id.tv_no_orders)

            if (orders.isEmpty()) {
                tvNoOrders.visibility = View.VISIBLE
                layoutOrders.visibility = View.GONE
            } else {
                tvNoOrders.visibility = View.GONE
                layoutOrders.visibility = View.VISIBLE
                layoutOrders.removeAllViews()

                for (order in orders) {
                    val row = LinearLayout(this@CustomerDetailsActivity).apply {
                        orientation = LinearLayout.HORIZONTAL
                        gravity = android.view.Gravity.CENTER_VERTICAL
                        setPadding(0, 12, 0, 12)
                    }

                    val tvDoc = TextView(this@CustomerDetailsActivity).apply {
                        text = order.documentNo ?: "#${order.orderId}"
                        textSize = 14f
                        setTextColor(getColor(R.color.posterita_primary))
                        setTypeface(typeface, Typeface.BOLD)
                        layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
                    }
                    row.addView(tvDoc)

                    val tvDate = TextView(this@CustomerDetailsActivity).apply {
                        text = formatOrderDate(order)
                        textSize = 12f
                        setTextColor(getColor(R.color.posterita_muted))
                        layoutParams = LinearLayout.LayoutParams(
                            LinearLayout.LayoutParams.WRAP_CONTENT,
                            LinearLayout.LayoutParams.WRAP_CONTENT
                        ).apply { marginEnd = 12 }
                    }
                    row.addView(tvDate)

                    val tvAmount = TextView(this@CustomerDetailsActivity).apply {
                        text = "$currency ${NumberUtils.formatPrice(order.grandTotal)}"
                        textSize = 14f
                        setTextColor(getColor(R.color.posterita_ink))
                        setTypeface(typeface, Typeface.BOLD)
                    }
                    row.addView(tvAmount)

                    layoutOrders.addView(row)

                    // Divider
                    if (order != orders.last()) {
                        val divider = View(this@CustomerDetailsActivity).apply {
                            layoutParams = LinearLayout.LayoutParams(
                                LinearLayout.LayoutParams.MATCH_PARENT, 1
                            )
                            setBackgroundColor(getColor(R.color.posterita_line))
                        }
                        layoutOrders.addView(divider)
                    }
                }
            }
        }
    }

    private fun formatOrderDate(order: Order): String {
        val date = order.dateOrdered?.toString() ?: return ""
        return try {
            val sdf = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.US)
            val parsed = sdf.parse(date.take(10))
            val outFmt = java.text.SimpleDateFormat("dd MMM", java.util.Locale.US)
            outFmt.format(parsed!!)
        } catch (_: Exception) {
            date.take(10)
        }
    }
}
