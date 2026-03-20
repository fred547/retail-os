package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Spinner
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
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

        binding.toolbar.title = "Manage Categories"
        binding.toolbar.setNavigationOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.fabAdd.setOnClickListener { showCategoryDialog(null) }

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

    private fun showCategoryDialog(category: ProductCategory?) {
        val isEdit = category != null

        val container = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(64, 32, 64, 16)
        }

        val tilName = TextInputLayout(this).apply {
            hint = "Category Name"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        val etName = TextInputEditText(this)
        tilName.addView(etName)
        container.addView(tilName)

        val tvTaxLabel = TextView(this).apply {
            text = "Tax"
            setPadding(0, 24, 0, 8)
        }
        container.addView(tvTaxLabel)

        val taxNames = listOf("No Tax") + taxes.map { "${it.name} (${it.rate}%)" }
        val spinnerTax = Spinner(this)
        spinnerTax.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, taxNames)
        container.addView(spinnerTax)

        if (isEdit) {
            etName.setText(category!!.name)
            val taxIndex = taxes.indexOfFirst { it.tax_id.toString() == category.tax_id }.let { if (it >= 0) it + 1 else 0 }
            spinnerTax.setSelection(taxIndex)
        }

        val dialog = AlertDialog.Builder(this)
            .setTitle(if (isEdit) "Edit Category" else "Add Category")
            .setView(container)
            .setPositiveButton("Save", null)
            .setNegativeButton("Cancel", null)
            .apply {
                if (isEdit) {
                    setNeutralButton("Delete") { _, _ -> deleteCategory(category!!) }
                }
            }
            .create()

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val name = etName.text?.toString()?.trim() ?: ""
                if (name.isEmpty()) {
                    Toast.makeText(this, "Category name is required", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                val selectedTaxIndex = spinnerTax.selectedItemPosition
                val taxId = if (selectedTaxIndex > 0) taxes[selectedTaxIndex - 1].tax_id.toString() else null

                lifecycleScope.launch {
                    withContext(Dispatchers.IO) {
                        if (isEdit) {
                            val updated = category!!.copy(name = name, tax_id = taxId)
                            db.productCategoryDao().updateProductCategory(updated)
                        } else {
                            val maxId = db.productCategoryDao().getMaxCategoryId() ?: 0
                            val newCategory = ProductCategory(
                                productcategory_id = maxId + 1,
                                name = name,
                                tax_id = taxId,
                                isactive = "Y"
                            )
                            db.productCategoryDao().insertProductCategory(newCategory)
                        }
                    }
                    dialog.dismiss()
                    loadData()
                    Toast.makeText(this@ManageCategoriesActivity,
                        if (isEdit) "Category updated" else "Category added", Toast.LENGTH_SHORT).show()
                }
            }
        }
        dialog.show()
    }

    private fun deleteCategory(category: ProductCategory) {
        AlertDialog.Builder(this)
            .setTitle("Delete Category")
            .setMessage("Are you sure you want to delete '${category.name}'?")
            .setPositiveButton("Delete") { _, _ ->
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) { db.productCategoryDao().deleteProductCategory(category) }
                    loadData()
                    Toast.makeText(this@ManageCategoriesActivity, "Category deleted", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
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
                card.setOnClickListener { showCategoryDialog(categories[adapterPosition]) }
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
        }
        override fun getItemCount() = categories.size
    }
}
