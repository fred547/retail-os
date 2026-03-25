package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.posterita.pos.android.R
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
class ManageCategoriesActivity : BaseActivity() {

    private lateinit var binding: ActivityManageListBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager

    private var categories = mutableListOf<ProductCategory>()
    private var taxes = listOf<Tax>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityManageListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.tvTitle.text = "Categories"
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
            binding.layoutEmpty.visibility = if (categories.isEmpty()) View.VISIBLE else View.GONE
            binding.recyclerView.adapter = CategoryAdapter()
        }
    }

    private val categoryColors = intArrayOf(
        0xFF1976D2.toInt(), // blue
        0xFF5E35B1.toInt(), // purple
        0xFF00838F.toInt(), // teal
        0xFFF57F17.toInt(), // amber
        0xFF2E7D32.toInt(), // green
        0xFFE53935.toInt(), // red
        0xFF6D4C41.toInt(), // brown
    )

    inner class CategoryAdapter : RecyclerView.Adapter<CategoryAdapter.VH>() {
        inner class VH(itemView: View) : RecyclerView.ViewHolder(itemView) {
            val card: MaterialCardView = itemView.findViewById(R.id.cardItem)
            val iconBg: View = itemView.findViewById(R.id.iconBg)
            val iconInitial: TextView = itemView.findViewById(R.id.iconInitial)
            val tvName: TextView = itemView.findViewById(R.id.tvItemName)
            val tvSubtitle: TextView = itemView.findViewById(R.id.tvItemSubtitle)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_manage_card, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val c = categories[position]
            val name = c.name ?: "Category"
            val initial = name.firstOrNull()?.uppercase() ?: "C"

            holder.tvName.text = name
            val taxName = taxes.find { it.tax_id.toString() == c.tax_id }?.let { "${it.name} (${it.rate}%)" } ?: "No tax"
            holder.tvSubtitle.text = "Tax: $taxName"
            holder.iconInitial.text = initial

            // Rotate colors
            val color = categoryColors[position % categoryColors.size]
            val bg = holder.iconBg.background
            if (bg is GradientDrawable) bg.setColor(color)
            holder.iconInitial.setTextColor(getColor(R.color.white))

            holder.card.setOnClickListener {
                val fields = arrayListOf(
                    "## GENERAL|",
                    "Name|${c.name ?: ""}",
                    "Display|${c.display ?: ""}",
                    "Position|${c.position}",
                    "Tax ID|${c.tax_id ?: ""}",
                    "---|",
                    "## STATUS|",
                    "Active|${if (c.isactive == "Y") "Yes" else "No"}",
                    "Category ID|${c.productcategory_id}"
                )
                val intent = Intent(this@ManageCategoriesActivity, DetailViewActivity::class.java)
                intent.putExtra(DetailViewActivity.EXTRA_TITLE, c.name ?: "Category Details")
                intent.putExtra(DetailViewActivity.EXTRA_SUBTITLE, "Tax: $taxName")
                intent.putExtra(DetailViewActivity.EXTRA_COLOR, categoryColors[position % categoryColors.size])
                intent.putStringArrayListExtra(DetailViewActivity.EXTRA_FIELDS, fields)
                startActivity(intent)
            }
        }

        override fun getItemCount() = categories.size
    }
}
