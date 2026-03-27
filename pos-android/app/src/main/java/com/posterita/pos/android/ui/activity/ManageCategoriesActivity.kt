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

    private var allCategories = mutableListOf<ProductCategory>()
    private var treeOrdered = mutableListOf<ProductCategory>()
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
            allCategories = withContext(Dispatchers.IO) {
                db.productCategoryDao().getAllCategoriesOrderedByLevel().toMutableList()
            }
            taxes = withContext(Dispatchers.IO) {
                db.taxDao().getAllTaxesSync()
            }
            // Build tree-ordered list for display
            treeOrdered = buildTreeOrder(allCategories)
            binding.progressLoading.visibility = View.GONE
            binding.tvEmpty.visibility = if (allCategories.isEmpty()) View.VISIBLE else View.GONE
            binding.layoutEmpty.visibility = if (allCategories.isEmpty()) View.VISIBLE else View.GONE
            binding.recyclerView.adapter = CategoryAdapter()
        }
    }

    /** Flatten categories into tree display order: parent, then children, then grandchildren */
    private fun buildTreeOrder(categories: List<ProductCategory>): MutableList<ProductCategory> {
        val byParent = categories.groupBy { it.parent_category_id ?: 0 }
        val result = mutableListOf<ProductCategory>()
        fun addChildren(parentId: Int) {
            val children = byParent[parentId] ?: return
            for (child in children.sortedWith(compareBy({ it.position }, { it.name ?: "" }))) {
                result.add(child)
                addChildren(child.productcategory_id)
            }
        }
        addChildren(0) // Start with root categories (parent_category_id = null/0)
        // Also add any with null parent that weren't caught by 0
        val addedIds = result.map { it.productcategory_id }.toSet()
        for (cat in categories) {
            if (cat.productcategory_id !in addedIds && (cat.parent_category_id == null || cat.parent_category_id == 0)) {
                result.add(cat)
            }
        }
        return result
    }

    /** Count children of a category */
    private fun childCount(categoryId: Int): Int {
        return allCategories.count { it.parent_category_id == categoryId }
    }

    /** Build breadcrumb path for a category */
    private fun buildPath(category: ProductCategory): String {
        val path = mutableListOf(category.name ?: "")
        var parentId = category.parent_category_id
        while (parentId != null && parentId != 0) {
            val parent = allCategories.find { it.productcategory_id == parentId }
            if (parent != null) {
                path.add(0, parent.name ?: "")
                parentId = parent.parent_category_id
            } else {
                break
            }
        }
        return path.joinToString(" > ")
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

    private val levelColors = intArrayOf(
        0xFF1976D2.toInt(), // level 0: blue
        0xFF5E35B1.toInt(), // level 1: purple
        0xFF00838F.toInt(), // level 2: teal
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
            val c = treeOrdered[position]
            val name = c.name ?: "Category"
            val level = c.level

            // Indent based on level
            val params = holder.card.layoutParams as? ViewGroup.MarginLayoutParams
            params?.marginStart = (level * 32 * resources.displayMetrics.density).toInt()
            holder.card.layoutParams = params

            // Level indicator
            val prefix = when (level) {
                1 -> "\u251C\u2500 "  // ├─
                2 -> "\u2502 \u2514\u2500 "  // │ └─
                else -> ""
            }

            holder.tvName.text = "$prefix$name"

            // Subtitle: tax + child count + path
            val taxName = taxes.find { it.tax_id.toString() == c.tax_id }?.let { "${it.name} (${it.rate}%)" } ?: "No tax"
            val children = childCount(c.productcategory_id)
            val subtitle = buildString {
                append("Tax: $taxName")
                if (children > 0) append(" · $children sub-${if (children == 1) "category" else "categories"}")
                if (level > 0) append(" · Level $level")
            }
            holder.tvSubtitle.text = subtitle

            // Icon
            val initial = when (level) {
                0 -> name.firstOrNull()?.uppercase() ?: "C"
                1 -> "\u2192" // →
                2 -> "\u2022" // •
                else -> "C"
            }
            holder.iconInitial.text = initial

            val color = levelColors.getOrElse(level) { categoryColors[position % categoryColors.size] }
            val bg = holder.iconBg.background
            if (bg is GradientDrawable) bg.setColor(color)
            holder.iconInitial.setTextColor(getColor(R.color.white))

            holder.card.setOnClickListener {
                val path = buildPath(c)
                val fields = arrayListOf(
                    "## GENERAL|",
                    "Name|${c.name ?: ""}",
                    "Path|$path",
                    "Level|${when (level) { 0 -> "Main"; 1 -> "Sub-category"; 2 -> "Sub-sub-category"; else -> "$level" }}",
                    "Display|${c.display ?: ""}",
                    "Position|${c.position}",
                    "Tax ID|${c.tax_id ?: ""}",
                    "Parent ID|${c.parent_category_id ?: "None (root)"}",
                    "---|",
                    "## STATUS|",
                    "Active|${if (c.isactive == "Y") "Yes" else "No"}",
                    "Category ID|${c.productcategory_id}",
                    "Sub-categories|$children"
                )
                val intent = Intent(this@ManageCategoriesActivity, DetailViewActivity::class.java)
                intent.putExtra(DetailViewActivity.EXTRA_TITLE, c.name ?: "Category Details")
                intent.putExtra(DetailViewActivity.EXTRA_SUBTITLE, path)
                intent.putExtra(DetailViewActivity.EXTRA_COLOR, color)
                intent.putStringArrayListExtra(DetailViewActivity.EXTRA_FIELDS, fields)
                startActivity(intent)
            }
        }

        override fun getItemCount() = treeOrdered.size
    }
}
