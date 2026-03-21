package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.posterita.pos.android.R
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

    private val detailLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            loadData() // Refresh list after edit
        }
    }

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
        inner class VH(itemView: View) : RecyclerView.ViewHolder(itemView) {
            val card: MaterialCardView = itemView.findViewById(R.id.cardItem)
            val iconBg: View = itemView.findViewById(R.id.iconBg)
            val iconInitial: TextView = itemView.findViewById(R.id.iconInitial)
            val tvName: TextView = itemView.findViewById(R.id.tvItemName)
            val tvSubtitle: TextView = itemView.findViewById(R.id.tvItemSubtitle)
            val tvMeta: TextView = itemView.findViewById(R.id.tvItemMeta)
            val tvBadge: TextView = itemView.findViewById(R.id.tvBadge)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_manage_card, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val p = products[position]
            val name = p.name ?: "Product"
            val initial = name.firstOrNull()?.uppercase() ?: "P"

            holder.tvName.text = name
            holder.iconInitial.text = initial

            // Price + category subtitle
            val catName = categories.find { it.productcategory_id == p.productcategory_id }?.name
            val price = NumberUtils.formatPrice(p.sellingprice)
            holder.tvSubtitle.text = "$price · ${catName ?: "No category"}"

            // Barcode as meta
            if (!p.upc.isNullOrBlank()) {
                holder.tvMeta.text = "UPC: ${p.upc}"
                holder.tvMeta.visibility = View.VISIBLE
            } else if (!p.itemcode.isNullOrBlank()) {
                holder.tvMeta.text = "SKU: ${p.itemcode}"
                holder.tvMeta.visibility = View.VISIBLE
            } else {
                holder.tvMeta.visibility = View.GONE
            }

            // Color by product type
            val color = when {
                p.iskitchenitem == "Y" -> getColor(R.color.posterita_warning)
                p.ismodifier == "Y" -> getColor(R.color.posterita_purple)
                p.isfavourite == "Y" -> getColor(R.color.posterita_error)
                else -> getColor(R.color.posterita_primary)
            }
            val bg = holder.iconBg.background
            if (bg is GradientDrawable) bg.setColor(color)
            holder.iconInitial.setTextColor(getColor(R.color.white))

            // Stock badge
            if (p.isstock == "Y") {
                holder.tvBadge.text = "STOCK"
                holder.tvBadge.setTextColor(getColor(R.color.posterita_secondary))
                holder.tvBadge.visibility = View.VISIBLE
            } else {
                holder.tvBadge.visibility = View.GONE
            }

            holder.card.setOnClickListener {
                val intent = Intent(this@ManageProductsActivity, ProductDetailActivity::class.java)
                intent.putExtra(ProductDetailActivity.EXTRA_PRODUCT_ID, p.product_id)
                detailLauncher.launch(intent)
            }
        }

        override fun getItemCount() = products.size
    }
}
