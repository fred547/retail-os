package com.posterita.pos.android.ui.activity

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
import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.databinding.ActivityMultiStoreStockBinding
import com.posterita.pos.android.util.NumberUtils
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Multi-warehouse stock view: browse all products with stock info,
 * filter by low stock / out of stock / expiring.
 */
@AndroidEntryPoint
class MultiStoreStockActivity : BaseActivity() {

    private lateinit var binding: ActivityMultiStoreStockBinding

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    private var allProducts: List<Product> = emptyList()
    private val displayProducts = mutableListOf<Product>()
    private lateinit var adapter: StockProductAdapter

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMultiStoreStockBinding.inflate(layoutInflater)
        setContentView(binding.root)
        setupHelpButton("stock_view")
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)

        binding.buttonBack.setOnClickListener { finish() }

        adapter = StockProductAdapter(displayProducts)
        binding.recyclerProducts.layoutManager = LinearLayoutManager(this)
        binding.recyclerProducts.adapter = adapter

        // Filter tabs
        binding.tabFilter.addOnTabSelectedListener(object : TabLayout.OnTabSelectedListener {
            override fun onTabSelected(tab: TabLayout.Tab?) { filterProducts(tab?.position ?: 0) }
            override fun onTabUnselected(tab: TabLayout.Tab?) {}
            override fun onTabReselected(tab: TabLayout.Tab?) {}
        })

        loadProducts()
    }

    private fun loadProducts() {
        lifecycleScope.launch {
            allProducts = withContext(Dispatchers.IO) {
                db.productDao().getAllProductsSync()
            }
            filterProducts(0)
        }
    }

    private fun filterProducts(tabIndex: Int) {
        val tracked = allProducts.filter { it.tracksStock }
        val filtered = when (tabIndex) {
            0 -> tracked // All tracked
            1 -> tracked.filter { it.isLowStock } // Low stock
            2 -> tracked.filter { it.isOutOfStock } // Out of stock
            3 -> tracked.filter { it.isExpiringSoon || it.isExpired } // Expiring
            else -> tracked
        }
        displayProducts.clear()
        displayProducts.addAll(filtered.sortedBy { it.name })
        adapter.notifyDataSetChanged()

        binding.textResultCount.text = "${displayProducts.size} products"
    }

    // --- Adapter ---

    private class StockProductAdapter(
        private val products: List<Product>
    ) : RecyclerView.Adapter<StockProductAdapter.VH>() {

        class VH(view: View) : RecyclerView.ViewHolder(view) {
            val textName: TextView = view.findViewById(R.id.textProductName)
            val textUpc: TextView = view.findViewById(R.id.textUpc)
            val textQty: TextView = view.findViewById(R.id.textQty)
            val textLocation: TextView = view.findViewById(R.id.textLocation)
            val textExpiry: TextView = view.findViewById(R.id.textExpiry)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_stock_product, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val p = products[position]
            holder.textName.text = p.name ?: "Product #${p.product_id}"
            holder.textUpc.text = p.upc ?: ""

            // Stock qty with color
            val qty = p.quantity_on_hand.toInt()
            holder.textQty.text = qty.toString()
            holder.textQty.setTextColor(when {
                p.isOutOfStock -> android.graphics.Color.parseColor("#EF4444")
                p.isLowStock -> android.graphics.Color.parseColor("#F59E0B")
                else -> android.graphics.Color.parseColor("#10B981")
            })

            // Location
            val loc = p.shelf_location
            holder.textLocation.text = loc ?: ""
            holder.textLocation.visibility = if (loc != null) View.VISIBLE else View.GONE

            // Expiry
            val exp = p.expiry_date
            if (exp != null) {
                val dateStr = if (exp.length >= 10) exp.substring(0, 10) else exp
                holder.textExpiry.text = "Exp: $dateStr"
                holder.textExpiry.visibility = View.VISIBLE
                holder.textExpiry.setTextColor(
                    if (p.isExpired) android.graphics.Color.parseColor("#EF4444")
                    else if (p.isExpiringSoon) android.graphics.Color.parseColor("#F59E0B")
                    else android.graphics.Color.parseColor("#6B7280")
                )
            } else {
                holder.textExpiry.visibility = View.GONE
            }
        }

        override fun getItemCount() = products.size
    }
}
