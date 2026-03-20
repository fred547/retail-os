package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.ProductCategory
import com.posterita.pos.android.data.local.entity.Tax
import com.posterita.pos.android.databinding.ActivityManageListBinding
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class ManageCategoriesActivity : AppCompatActivity() {

    private lateinit var binding: ActivityManageListBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager

    private var categories = mutableListOf<ProductCategory>()
    private var taxes = listOf<Tax>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityManageListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.tvTitle.text = "Manage Categories"
        binding.buttonBack.setOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.fabAdd.visibility = View.GONE

        loadData()
    }

    private fun loadData() {
        binding.progressLoading.visibility = View.VISIBLE
        lifecycleScope.launch {
            categories = withContext(Dispatchers.IO) {
                db.productCategoryDao().getAllProductCategoriesSync().toMutableList()
            }
            taxes = withContext(Dispatchers.IO) {
                db.taxDao().getAllTaxesSync()
            }
            binding.progressLoading.visibility = View.GONE
            binding.tvEmpty.visibility = if (categories.isEmpty()) View.VISIBLE else View.GONE
            binding.recyclerView.adapter = CategoryAdapter()
        }
    }

    inner class CategoryAdapter : RecyclerView.Adapter<CategoryAdapter.VH>() {
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
            val c = categories[position]
            holder.tvName.text = c.name ?: "Unknown"
            val taxName = taxes.find { it.tax_id.toString() == c.tax_id }?.let { "${it.name} (${it.rate}%)" } ?: "No Tax"
            holder.tvDetails.text = "Tax: $taxName"
            holder.card.setOnClickListener {
                val details = buildString {
                    appendLine("Name: ${c.name ?: "N/A"}")
                    appendLine("Active: ${if (c.isactive == "Y") "Yes" else "No"}")
                    appendLine("Tax: $taxName")
                    appendLine("Display: ${c.display ?: "N/A"}")
                    appendLine("Position: ${c.position}")
                }
                AlertDialog.Builder(this@ManageCategoriesActivity)
                    .setTitle(c.name ?: "Category Details")
                    .setMessage(details)
                    .setPositiveButton("Close", null)
                    .show()
            }
        }
        override fun getItemCount() = categories.size
    }
}
