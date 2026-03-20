package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.local.entity.ProductCategory
import com.posterita.pos.android.data.local.entity.Tax
import com.posterita.pos.android.databinding.ActivityManageListBinding
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class ManageProductsActivity : AppCompatActivity() {

    private lateinit var binding: ActivityManageListBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager

    private var products = mutableListOf<Product>()
    private var categories = listOf<ProductCategory>()
    private var taxes = listOf<Tax>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityManageListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.tvTitle.text = "Products"
        binding.buttonBack.setOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.fabAdd.visibility = View.GONE

        loadData()
    }

    private fun loadData() {
        binding.progressLoading.visibility = View.VISIBLE
        lifecycleScope.launch {
            products = withContext(Dispatchers.IO) {
                db.productDao().getAllProductsSync().toMutableList()
            }
            categories = withContext(Dispatchers.IO) {
                db.productCategoryDao().getAllProductCategoriesSync()
            }
            taxes = withContext(Dispatchers.IO) {
                db.taxDao().getAllTaxesSync()
            }
            binding.progressLoading.visibility = View.GONE
            val isEmpty = products.isEmpty()
            binding.tvEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE
            binding.layoutEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE
            binding.recyclerView.visibility = if (isEmpty) View.GONE else View.VISIBLE
            binding.recyclerView.adapter = ProductAdapter()
        }
    }

    inner class ProductAdapter : RecyclerView.Adapter<ProductAdapter.VH>() {
        inner class VH(val card: MaterialCardView) : RecyclerView.ViewHolder(card) {
            val tvName: TextView = TextView(card.context).apply { textSize = 16f; setPadding(16, 4, 16, 0) }
            val tvDetails: TextView = TextView(card.context).apply { textSize = 13f; setPadding(16, 0, 16, 8); setTextColor(getColor(android.R.color.darker_gray)) }
            val layout = android.widget.LinearLayout(card.context).apply {
                orientation = android.widget.LinearLayout.VERTICAL
                setPadding(32, 24, 32, 24)
                addView(tvName)
                addView(tvDetails)
            }
            init {
                card.addView(layout)
                card.radius = 24f; card.useCompatPadding = true
            }
        }
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = VH(
            MaterialCardView(parent.context).apply {
                layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            }
        )
        override fun onBindViewHolder(holder: VH, position: Int) {
            val p = products[position]
            holder.tvName.text = p.name ?: "Unknown"
            val catName = categories.find { it.productcategory_id == p.productcategory_id }?.name ?: ""
            holder.tvDetails.text = "Price: ${p.sellingprice ?: 0.0} | ${catName.ifEmpty { "No category" }}"
            holder.card.setOnClickListener {
                val fields = arrayListOf(
                    "## GENERAL|",
                    "Name|${p.name ?: ""}",
                    "Item Code|${p.itemcode ?: ""}",
                    "UPC / Barcode|${p.upc ?: ""}",
                    "Barcode Type|${p.barcodetype ?: ""}",
                    "Description|${p.description ?: ""}",
                    "---|",
                    "## PRICING|",
                    "Selling Price|${NumberUtils.formatPrice(p.sellingprice)}",
                    "Cost Price|${NumberUtils.formatPrice(p.costprice)}",
                    "Wholesale Price|${if (p.iswholesaleprice == "Y") NumberUtils.formatPrice(p.wholesaleprice) else "N/A"}",
                    "Tax Included|${if (p.istaxincluded == "Y") "Yes" else "No"}",
                    "Tax Amount|${NumberUtils.formatPrice(p.taxamount)}",
                    "---|",
                    "## FLAGS|",
                    "Stock Item|${if (p.isstock == "Y") "Yes" else "No"}",
                    "Kitchen Item|${if (p.iskitchenitem == "Y") "Yes" else "No"}",
                    "Favourite|${if (p.isfavourite == "Y") "Yes" else "No"}",
                    "Modifier|${if (p.ismodifier == "Y") "Yes" else "No"}",
                    "BOM|${if (p.isbom == "Y") "Yes" else "No"}",
                    "Variable Item|${if (p.isvariableitem == "Y") "Yes" else "No"}",
                    "Editable|${if (p.iseditable == "Y") "Yes" else "No"}",
                    "Print Order Copy|${if (p.printordercopy == "Y") "Yes" else "No"}",
                    "---|",
                    "## STATUS|",
                    "Active|${if (p.isactive == "Y") "Yes" else "No"}",
                    "Needs Price Review|${if (p.needs_price_review == "Y") "Yes" else "No"}",
                    "Category ID|${p.productcategory_id}",
                    "Tax ID|${p.tax_id}",
                    "Product ID|${p.product_id}"
                )
                val intent = Intent(this@ManageProductsActivity, DetailViewActivity::class.java)
                intent.putExtra(DetailViewActivity.EXTRA_TITLE, p.name ?: "Product Details")
                intent.putStringArrayListExtra(DetailViewActivity.EXTRA_FIELDS, fields)
                startActivity(intent)
            }
        }
        override fun getItemCount() = products.size
    }
}
