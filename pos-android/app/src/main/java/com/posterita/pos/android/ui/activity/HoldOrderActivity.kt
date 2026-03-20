package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.recyclerview.widget.LinearLayoutManager
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.dao.ProductDao
import com.posterita.pos.android.data.local.entity.HoldOrder
import com.posterita.pos.android.databinding.ActivityHoldOrdersBinding
import com.posterita.pos.android.domain.model.ShoppingCart
import com.posterita.pos.android.ui.adapter.HoldOrderAdapter
import com.posterita.pos.android.util.SessionManager
import androidx.lifecycle.lifecycleScope
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import javax.inject.Inject

@AndroidEntryPoint
class HoldOrderActivity : BaseDrawerActivity(), HoldOrderAdapter.OnHoldOrderClickListener {

    private lateinit var binding: ActivityHoldOrdersBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var shoppingCart: ShoppingCart
    @Inject lateinit var productDao: ProductDao

    private lateinit var holdOrderAdapter: HoldOrderAdapter

    override fun getDrawerHighlightId(): Int = R.id.nav_hold_orders

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentViewWithDrawer(R.layout.activity_hold_orders)
        binding = ActivityHoldOrdersBinding.bind(drawerLayout.getChildAt(0))

        // Back button
        binding.btnBack?.setOnClickListener { finish() }

        setupDrawerNavigation()
        setupRecyclerView()
        loadHoldOrders()
    }

    override fun onResume() {
        super.onResume()
        loadHoldOrders()
    }

    private fun setupRecyclerView() {
        holdOrderAdapter = HoldOrderAdapter(this)
        binding.orderrecycle.layoutManager = LinearLayoutManager(this)
        binding.orderrecycle.adapter = holdOrderAdapter
    }

    private fun loadHoldOrders() {
        val terminalId = prefsManager.terminalId
        binding.progressLoading?.visibility = View.VISIBLE

        lifecycleScope.launch(Dispatchers.IO) {
            val allOrders = db.holdOrderDao().getHoldOrdersByTerminal(terminalId)
            // Exclude kitchen orders — they appear in KitchenOrdersActivity
            val holdOrders = allOrders.filter { hold ->
                val json = hold.json
                json == null || !json.optBoolean("isKitchenOrder", false)
            }
            withContext(Dispatchers.Main) {
                binding.progressLoading?.visibility = View.GONE
                holdOrderAdapter.setHoldOrders(holdOrders)
                binding.layoutEmptyHold?.visibility = if (holdOrders.isEmpty()) View.VISIBLE else View.GONE
                binding.orderrecycle.visibility = if (holdOrders.isEmpty()) View.GONE else View.VISIBLE

                // Update subtitle with count
                if (holdOrders.isEmpty()) {
                    binding.textSubtitle?.visibility = View.GONE
                } else {
                    val count = holdOrders.size
                    binding.textSubtitle?.text = "$count order${if (count != 1) "s" else ""} on hold"
                    binding.textSubtitle?.visibility = View.VISIBLE
                }
            }
        }
    }

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
                val intent = Intent(this@HoldOrderActivity, CartActivity::class.java)
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
                        Toast.makeText(this@HoldOrderActivity, "Hold order deleted", Toast.LENGTH_SHORT).show()
                        loadHoldOrders()
                    }
                }
            }
            .setNegativeButton(android.R.string.cancel) { dialog, _ -> dialog.dismiss() }
            .show()
    }
}
