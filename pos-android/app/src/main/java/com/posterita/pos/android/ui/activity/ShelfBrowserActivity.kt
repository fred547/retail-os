package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.HorizontalScrollView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.chip.Chip
import com.google.android.material.chip.ChipGroup
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

/**
 * Browse products by shelf location.
 * Chip bar shows shelf numbers parsed from product.shelf_location.
 * Long-press a product to print its shelf label.
 */
@AndroidEntryPoint
class ShelfBrowserActivity : BaseActivity() {

    @Inject lateinit var prefsManager: SharedPreferencesManager

    private lateinit var chipGroup: ChipGroup
    private lateinit var recyclerView: RecyclerView
    private lateinit var countText: TextView
    private lateinit var emptyText: TextView

    private var allProducts: List<Product> = emptyList()
    private var shelves: List<String> = emptyList()
    private var selectedShelf: String? = null
    private val adapter = ShelfProductAdapter()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_shelf_browser)
        setupHelpButton("shelf_browser")

        findViewById<View>(R.id.buttonBack).setOnClickListener { finish() }

        chipGroup = findViewById(R.id.chipGroup)
        recyclerView = findViewById(R.id.recyclerProducts)
        countText = findViewById(R.id.textCount)
        emptyText = findViewById(R.id.textEmpty)

        recyclerView.layoutManager = LinearLayoutManager(this)
        recyclerView.adapter = adapter

        loadProducts()
    }

    private fun loadProducts() {
        lifecycleScope.launch {
            val products = withContext(Dispatchers.IO) {
                val db = com.posterita.pos.android.data.local.AppDatabase.getInstance(
                    applicationContext, prefsManager.accountId
                )
                db.productDao().getProductsWithLocation()
            }

            allProducts = products

            // Parse unique shelf numbers from locations like "15-C" → "15"
            shelves = products
                .mapNotNull { it.shelf_location?.split("-")?.firstOrNull() }
                .distinct()
                .sortedBy { it.toIntOrNull() ?: Int.MAX_VALUE }

            buildChips()
            filterProducts()
        }
    }

    private fun buildChips() {
        chipGroup.removeAllViews()

        // "All" chip
        val allChip = Chip(this).apply {
            text = "All"
            isCheckable = true
            isChecked = selectedShelf == null
            setOnClickListener {
                selectedShelf = null
                buildChips()
                filterProducts()
            }
        }
        chipGroup.addView(allChip)

        for (shelf in shelves) {
            val chip = Chip(this).apply {
                text = shelf
                isCheckable = true
                isChecked = selectedShelf == shelf
                setOnClickListener {
                    selectedShelf = shelf
                    buildChips()
                    filterProducts()
                }
            }
            chipGroup.addView(chip)
        }
    }

    private fun filterProducts() {
        val filtered = if (selectedShelf == null) {
            allProducts
        } else {
            allProducts.filter { it.shelf_location?.startsWith("$selectedShelf-") == true }
        }

        adapter.update(filtered)
        countText.text = "${filtered.size} product${if (filtered.size != 1) "s" else ""}"
        emptyText.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
        recyclerView.visibility = if (filtered.isEmpty()) View.GONE else View.VISIBLE
    }

    // --- Adapter ---

    inner class ShelfProductAdapter : RecyclerView.Adapter<ShelfProductAdapter.VH>() {
        private var items: List<Product> = emptyList()

        fun update(newItems: List<Product>) {
            items = newItems
            notifyDataSetChanged()
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_shelf_product, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val p = items[position]
            holder.name.text = p.name ?: "Unknown"
            holder.location.text = p.shelf_location ?: "—"
            holder.price.text = String.format("%.2f", p.sellingprice)
            holder.upc.text = p.upc ?: ""
            holder.qty.text = "Qty: ${p.quantity_on_hand.toInt()}"

            // Color code stock
            val qtyColor = when {
                p.isOutOfStock -> 0xFFEF4444.toInt()
                p.isLowStock -> 0xFFF59E0B.toInt()
                else -> 0xFF10B981.toInt()
            }
            holder.qty.setTextColor(qtyColor)

            holder.itemView.setOnLongClickListener {
                Toast.makeText(this@ShelfBrowserActivity, "Print label: ${p.name} @ ${p.shelf_location}", Toast.LENGTH_SHORT).show()
                // TODO: PrinterManager.printShelfLabel(p, currency)
                true
            }
        }

        override fun getItemCount() = items.size

        inner class VH(view: View) : RecyclerView.ViewHolder(view) {
            val name: TextView = view.findViewById(R.id.textProductName)
            val location: TextView = view.findViewById(R.id.textLocation)
            val price: TextView = view.findViewById(R.id.textPrice)
            val upc: TextView = view.findViewById(R.id.textUpc)
            val qty: TextView = view.findViewById(R.id.textQty)
        }
    }
}
