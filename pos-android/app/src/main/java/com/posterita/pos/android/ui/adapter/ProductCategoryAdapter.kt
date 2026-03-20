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
    }

    private var categories: List<ProductCategory> = emptyList()
    private var selectedPosition: Int = 0 // 0 = "All" selected by default
    private var maxVisible: Int = Int.MAX_VALUE // how many items fit before "More"
    private var hasOverflow: Boolean = false

    fun setCategories(newCategories: List<ProductCategory>) {
        categories = newCategories
        selectedPosition = 0
        maxVisible = Int.MAX_VALUE
        hasOverflow = false
        notifyDataSetChanged()
    }

    /**
     * Set how many items can be visible. If total exceeds this,
     * the last slot becomes a "More" button.
     */
    fun setMaxVisible(count: Int) {
        if (count <= 0) return
        val totalItems = categories.size + 1 // +1 for "All"
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
        val totalItems = categories.size + 1
        return if (hasOverflow) maxVisible + 1 else totalItems
    }

    inner class ButtonViewHolder(
        private val buttonView: TextView
    ) : RecyclerView.ViewHolder(buttonView) {

        fun bind(position: Int) {
            val isMoreButton = hasOverflow && position == maxVisible

            if (isMoreButton) {
                val overflowCount = categories.size + 1 - maxVisible
                buttonView.text = "MORE +$overflowCount"
                updateButtonStyle(buttonView, false)
                buttonView.setOnClickListener {
                    showOverflowDialog()
                }
                return
            }

            if (position == 0) {
                buttonView.text = "ALL"
            } else {
                buttonView.text = (categories[position - 1].name ?: "").uppercase()
            }

            val isSelected = position == selectedPosition
            updateButtonStyle(buttonView, isSelected)

            buttonView.setOnClickListener {
                val previousSelected = selectedPosition
                selectedPosition = adapterPosition
                notifyItemChanged(previousSelected)
                notifyItemChanged(selectedPosition)

                if (position == 0) {
                    listener.onCategoryClick(null)
                } else {
                    listener.onCategoryClick(categories[position - 1])
                }
            }
        }

        private fun updateButtonStyle(view: TextView, selected: Boolean) {
            if (selected) {
                view.setBackgroundResource(R.drawable.btn_rounded)
                view.setTextColor(Color.WHITE)
            } else {
                view.setBackgroundResource(R.drawable.stroke_btn)
                view.setTextColor(Color.BLACK)
            }
        }

        private fun showOverflowDialog() {
            val context = buttonView.context
            val overflowCategories = categories.drop(maxVisible - 1)
            val names = overflowCategories.map { it.name ?: "" }.toTypedArray()

            AlertDialog.Builder(context)
                .setTitle("More Categories")
                .setItems(names) { _, which ->
                    val category = overflowCategories[which]
                    val catIndex = categories.indexOf(category)
                    val previousSelected = selectedPosition
                    selectedPosition = catIndex + 1
                    notifyItemChanged(previousSelected)
                    notifyDataSetChanged()
                    listener.onCategoryClick(category)
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }
}