package com.posterita.pos.android.ui.adapter

import android.graphics.Color
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.recyclerview.widget.RecyclerView
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.entity.ProductCategory

class ProductCategoryAdapter(
    private val listener: OnCategoryClickListener
) : RecyclerView.Adapter<ProductCategoryAdapter.ButtonViewHolder>() {

    interface OnCategoryClickListener {
        fun onCategoryClick(category: ProductCategory?)
        /** Called when user drills into a parent category to browse its children */
        fun onCategoryDrillDown(category: ProductCategory) {}
    }

    private var allCategories: List<ProductCategory> = emptyList()
    private var visibleCategories: List<ProductCategory> = emptyList()
    private var selectedPosition: Int = 0
    private var maxVisible: Int = Int.MAX_VALUE
    private var hasOverflow: Boolean = false

    // Breadcrumb navigation stack — list of parent categories we've drilled into
    private val breadcrumb = mutableListOf<ProductCategory>()
    private var currentParentId: Int? = null

    fun setCategories(newCategories: List<ProductCategory>) {
        allCategories = newCategories
        selectedPosition = 0
        maxVisible = Int.MAX_VALUE
        hasOverflow = false
        breadcrumb.clear()
        currentParentId = null
        updateVisibleCategories()
    }

    /** Navigate into a parent category to show its children */
    fun drillDown(parent: ProductCategory) {
        breadcrumb.add(parent)
        currentParentId = parent.productcategory_id
        selectedPosition = 0
        updateVisibleCategories()
    }

    /** Navigate back one level, returns true if we went back, false if already at root */
    fun drillUp(): Boolean {
        if (breadcrumb.isEmpty()) return false
        breadcrumb.removeAt(breadcrumb.lastIndex)
        currentParentId = breadcrumb.lastOrNull()?.productcategory_id
        selectedPosition = 0
        updateVisibleCategories()
        return true
    }

    /** Returns the current breadcrumb path as "Main > Sub > ..." or null if at root */
    fun getBreadcrumbPath(): String? {
        if (breadcrumb.isEmpty()) return null
        return breadcrumb.joinToString(" > ") { it.name ?: "" }
    }

    /** True if we're currently inside a sub-level (not root) */
    fun isInSubLevel(): Boolean = breadcrumb.isNotEmpty()

    private fun updateVisibleCategories() {
        visibleCategories = if (currentParentId == null) {
            // Root level: show categories with no parent
            allCategories.filter { it.parent_category_id == null || it.parent_category_id == 0 }
        } else {
            // Sub-level: show children of current parent
            allCategories.filter { it.parent_category_id == currentParentId }
        }
        notifyDataSetChanged()
    }

    /** Number of categories visible at the current level (excluding "All"/"Back" slot) */
    fun getVisibleCategoryCount(): Int = visibleCategories.size

    /** Check if a category has children */
    private fun hasChildren(category: ProductCategory): Boolean {
        return allCategories.any { it.parent_category_id == category.productcategory_id }
    }

    /** Get all descendant category IDs (for filtering products across a subtree) */
    fun getDescendantIds(categoryId: Int): List<Int> {
        val result = mutableListOf<Int>()
        val visited = mutableSetOf<Int>()
        fun collect(parentId: Int) {
            if (!visited.add(parentId)) return // cycle guard
            for (cat in allCategories) {
                if (cat.parent_category_id == parentId) {
                    result.add(cat.productcategory_id)
                    collect(cat.productcategory_id)
                }
            }
        }
        collect(categoryId)
        return result
    }

    fun setMaxVisible(count: Int) {
        if (count <= 0) return
        val totalItems = visibleCategories.size + 1 // +1 for "All" or "Back"
        val newMax = (count - 1).coerceAtLeast(1)
        if (newMax < totalItems) {
            maxVisible = newMax
            hasOverflow = true
        } else {
            maxVisible = Int.MAX_VALUE
            hasOverflow = false
        }
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ButtonViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_category_button, parent, false) as TextView
        return ButtonViewHolder(view)
    }

    override fun onBindViewHolder(holder: ButtonViewHolder, position: Int) {
        holder.bind(position)
    }

    override fun getItemCount(): Int {
        val totalItems = visibleCategories.size + 1 // +1 for first slot (All or Back)
        return if (hasOverflow) maxVisible + 1 else totalItems
    }

    inner class ButtonViewHolder(
        private val buttonView: TextView
    ) : RecyclerView.ViewHolder(buttonView) {

        fun bind(position: Int) {
            val isMoreButton = hasOverflow && position == maxVisible

            if (isMoreButton) {
                val overflowCount = visibleCategories.size + 1 - maxVisible
                buttonView.text = "MORE +$overflowCount"
                updateButtonStyle(buttonView, isSelected = false, isBack = false, hasChildren = false)
                buttonView.setOnClickListener { showOverflowDialog() }
                return
            }

            if (position == 0) {
                if (breadcrumb.isNotEmpty()) {
                    // Show back button when in sub-level
                    buttonView.text = "\u25C0 BACK"
                    updateButtonStyle(buttonView, isSelected = false, isBack = true, hasChildren = false)
                    buttonView.setOnClickListener {
                        drillUp()
                        // After drilling up: show parent's subtree products, or all if at root
                        val parentCat = breadcrumb.lastOrNull()
                        listener.onCategoryClick(parentCat) // null = all products (root)
                        listener.onCategoryDrillDown(parentCat ?: ProductCategory()) // recalculate overflow
                    }
                } else {
                    buttonView.text = "ALL"
                    updateButtonStyle(buttonView, isSelected = selectedPosition == 0, isBack = false, hasChildren = false)
                    buttonView.setOnClickListener {
                        val prev = selectedPosition
                        selectedPosition = 0
                        notifyItemChanged(prev)
                        notifyItemChanged(0)
                        listener.onCategoryClick(null)
                    }
                }
                return
            }

            val category = visibleCategories[position - 1]
            val catHasChildren = hasChildren(category)
            val label = (category.name ?: "").uppercase()
            buttonView.text = if (catHasChildren) "$label \u25B6" else label

            val isSelected = position == selectedPosition
            updateButtonStyle(buttonView, isSelected, isBack = false, hasChildren = catHasChildren)

            buttonView.setOnClickListener {
                if (catHasChildren) {
                    // Drill into this category
                    drillDown(category)
                    listener.onCategoryDrillDown(category)
                    // Show all products in this subtree
                    listener.onCategoryClick(category)
                } else {
                    // Leaf category — select it
                    @Suppress("DEPRECATION")
                    val pos = adapterPosition
                    if (pos == RecyclerView.NO_POSITION) return@setOnClickListener
                    val prev = selectedPosition
                    selectedPosition = pos
                    notifyItemChanged(prev)
                    notifyItemChanged(selectedPosition)
                    listener.onCategoryClick(category)
                }
            }
        }

        private fun updateButtonStyle(view: TextView, isSelected: Boolean, isBack: Boolean, hasChildren: Boolean) {
            when {
                isBack -> {
                    view.setBackgroundResource(R.drawable.stroke_btn)
                    view.setTextColor(0xFF1976D2.toInt()) // blue text for back
                }
                isSelected -> {
                    view.setBackgroundResource(R.drawable.btn_rounded)
                    view.setTextColor(Color.WHITE)
                }
                hasChildren -> {
                    view.setBackgroundResource(R.drawable.stroke_btn)
                    view.setTextColor(0xFF5E35B1.toInt()) // purple for parent categories
                }
                else -> {
                    view.setBackgroundResource(R.drawable.stroke_btn)
                    view.setTextColor(Color.BLACK)
                }
            }
        }

        private fun showOverflowDialog() {
            val context = buttonView.context
            val overflowCategories = visibleCategories.drop(maxVisible - 1)
            val names = overflowCategories.map { cat ->
                val name = cat.name ?: ""
                if (hasChildren(cat)) "$name  \u25B6" else name
            }.toTypedArray()

            AlertDialog.Builder(context)
                .setTitle(breadcrumb.lastOrNull()?.name?.let { "Sub-categories of $it" } ?: "More Categories")
                .setItems(names) { _, which ->
                    val category = overflowCategories[which]
                    if (hasChildren(category)) {
                        drillDown(category)
                        listener.onCategoryDrillDown(category)
                        listener.onCategoryClick(category)
                    } else {
                        val catIndex = visibleCategories.indexOf(category)
                        val prev = selectedPosition
                        selectedPosition = catIndex + 1
                        notifyItemChanged(prev)
                        notifyDataSetChanged()
                        listener.onCategoryClick(category)
                    }
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }
}
