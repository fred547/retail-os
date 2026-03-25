package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.local.entity.ProductCategory
import com.posterita.pos.android.data.local.entity.Tax
import com.posterita.pos.android.databinding.ActivityDetailViewBinding
import com.posterita.pos.android.ui.sheet.SectionEditorSheet
import com.posterita.pos.android.ui.sheet.SectionEditorSheet.FieldDef
import com.posterita.pos.android.ui.sheet.SectionEditorSheet.FieldType
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

/**
 * Product detail brochure with tappable section editors.
 * Pass EXTRA_PRODUCT_ID to view/edit an existing product.
 */
@AndroidEntryPoint
class ProductDetailActivity : BaseActivity() {

    private lateinit var binding: ActivityDetailViewBinding

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager

    private var product: Product? = null
    private var categories: List<ProductCategory> = emptyList()
    private var taxes: List<Tax> = emptyList()

    companion object {
        const val EXTRA_PRODUCT_ID = "product_id"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDetailViewBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.buttonBack.setOnClickListener {
            setResult(RESULT_OK)
            finish()
        }

        val productId = intent.getIntExtra(EXTRA_PRODUCT_ID, -1)
        if (productId == -1) {
            Toast.makeText(this, "Product not found", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        loadProduct(productId)
    }

    private fun loadProduct(productId: Int) {
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                Triple(
                    db.productDao().getProductByIdSync(productId),
                    db.productCategoryDao().getAllProductCategoriesSync(),
                    db.taxDao().getAllTaxesSync()
                )
            }
            product = result.first
            categories = result.second
            taxes = result.third

            val p = product
            if (p == null) {
                Toast.makeText(this@ProductDetailActivity, "Product not found", Toast.LENGTH_SHORT).show()
                finish()
                return@launch
            }

            renderBrochure(p)
        }
    }

    private fun renderBrochure(p: Product) {
        val catName = categories.find { it.productcategory_id == p.productcategory_id }?.name
        val price = NumberUtils.formatPrice(p.sellingprice)
        val color = when {
            p.iskitchenitem == "Y" -> getColor(R.color.posterita_warning)
            p.ismodifier == "Y" -> getColor(R.color.posterita_purple)
            p.isfavourite == "Y" -> getColor(R.color.posterita_error)
            else -> getColor(R.color.posterita_primary)
        }

        // Use DetailViewActivity's rendering by building the brochure programmatically
        binding.textTitle.text = p.name ?: "Product"

        // Hero
        val initial = (p.name?.firstOrNull()?.uppercase()) ?: "P"
        binding.heroInitial.text = initial
        binding.heroTitle.text = p.name ?: "Product"
        binding.heroSubtitle.text = "$price · ${catName ?: "No category"}"
        binding.heroSubtitle.visibility = View.VISIBLE

        val heroBg = binding.heroIconBg.background
        if (heroBg is android.graphics.drawable.GradientDrawable) heroBg.setColor(color)

        // Build sections
        val container = binding.layoutFields
        container.removeAllViews()

        // GENERAL section (tappable)
        addSection(container, "GENERAL", listOf(
            "Name" to (p.name ?: ""),
            "Item Code" to (p.itemcode ?: ""),
            "UPC / Barcode" to (p.upc ?: ""),
            "Description" to (p.description ?: ""),
        )) {
            openGeneralEditor(p)
        }

        // PRICING section (tappable)
        addSection(container, "PRICING", listOf(
            "Selling Price" to NumberUtils.formatPrice(p.sellingprice),
            "Cost Price" to NumberUtils.formatPrice(p.costprice),
            "Wholesale" to if (p.iswholesaleprice == "Y") NumberUtils.formatPrice(p.wholesaleprice) else "N/A",
        )) {
            openPricingEditor(p)
        }

        // CATEGORY & TAX section (tappable)
        val taxName = taxes.find { it.tax_id == p.tax_id }?.let { "${it.name} (${it.rate}%)" } ?: "None"
        addSection(container, "CATEGORY & TAX", listOf(
            "Category" to (catName ?: "None"),
            "Tax" to taxName,
            "Tax Included" to if (p.istaxincluded == "Y") "Yes" else "No",
        )) {
            openCategoryTaxEditor(p)
        }

        // FLAGS section (tappable)
        addSection(container, "FLAGS", listOf(
            "Stock Item" to if (p.isstock == "Y") "Yes" else "No",
            "Kitchen Item" to if (p.iskitchenitem == "Y") "Yes" else "No",
            "Favourite" to if (p.isfavourite == "Y") "Yes" else "No",
            "Modifier" to if (p.ismodifier == "Y") "Yes" else "No",
        )) {
            openFlagsEditor(p)
        }

        // STATUS section (read-only)
        addSection(container, "STATUS", listOf(
            "Active" to if (p.isactive == "Y") "Yes" else "No",
            "Product ID" to "${p.product_id}",
        ), onTap = null)
    }

    private fun addSection(
        container: android.widget.LinearLayout,
        title: String,
        fields: List<Pair<String, String>>,
        onTap: (() -> Unit)?
    ) {
        val density = resources.displayMetrics.density
        val card = com.google.android.material.card.MaterialCardView(this).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = (8 * density).toInt()
            }
            radius = 14 * density
            cardElevation = 0f
            strokeWidth = (1 * density).toInt()
            strokeColor = getColor(R.color.posterita_line)
            setCardBackgroundColor(getColor(R.color.posterita_paper))
            if (onTap != null) {
                isClickable = true
                isFocusable = true
                foreground = resources.getDrawable(
                    android.R.attr.selectableItemBackground.let {
                        val a = obtainStyledAttributes(intArrayOf(it))
                        val res = a.getResourceId(0, 0)
                        a.recycle()
                        res
                    }, theme
                )
                setOnClickListener { onTap() }
            }
        }

        val inner = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding((16 * density).toInt(), (14 * density).toInt(), (16 * density).toInt(), (14 * density).toInt())
        }

        // Header row: title + edit icon
        val headerRow = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = (10 * density).toInt()
            }
        }
        val headerText = android.widget.TextView(this).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            text = title
            setTextColor(getColor(R.color.posterita_muted))
            textSize = 11f
            letterSpacing = 0.08f
            typeface = androidx.core.content.res.ResourcesCompat.getFont(this@ProductDetailActivity, R.font.lexend_semibold)
        }
        headerRow.addView(headerText)

        if (onTap != null) {
            val editIcon = android.widget.TextView(this).apply {
                text = "Edit"
                setTextColor(getColor(R.color.posterita_primary))
                textSize = 12f
                typeface = androidx.core.content.res.ResourcesCompat.getFont(this@ProductDetailActivity, R.font.lexend_semibold)
            }
            headerRow.addView(editIcon)
        }
        inner.addView(headerRow)

        // Field rows
        for ((label, value) in fields) {
            val row = android.widget.LinearLayout(this).apply {
                orientation = android.widget.LinearLayout.HORIZONTAL
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                    android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply {
                    bottomMargin = (6 * density).toInt()
                }
                gravity = android.view.Gravity.CENTER_VERTICAL
            }
            val labelView = android.widget.TextView(this).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 0.4f)
                text = label
                setTextColor(getColor(R.color.posterita_muted))
                textSize = 13f
            }
            row.addView(labelView)

            val valueView = android.widget.TextView(this).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 0.6f)
                text = value.ifEmpty { "—" }
                setTextColor(getColor(R.color.posterita_ink))
                textSize = 14f
                typeface = androidx.core.content.res.ResourcesCompat.getFont(this@ProductDetailActivity, R.font.lexend_medium)
                gravity = android.view.Gravity.END
            }
            row.addView(valueView)

            inner.addView(row)
        }

        card.addView(inner)
        container.addView(card)
    }

    // ---- Section Editors ----

    private fun openGeneralEditor(p: Product) {
        SectionEditorSheet.create(
            title = "General",
            fields = listOf(
                FieldDef("name", "Product Name", FieldType.TEXT, p.name ?: ""),
                FieldDef("itemcode", "Item Code / SKU", FieldType.TEXT, p.itemcode ?: ""),
                FieldDef("upc", "UPC / Barcode", FieldType.TEXT, p.upc ?: ""),
                FieldDef("description", "Description", FieldType.MULTILINE, p.description ?: ""),
            ),
            onSave = { values ->
                saveProduct(p.copy(
                    name = values["name"],
                    itemcode = values["itemcode"],
                    upc = values["upc"],
                    description = values["description"],
                ))
            }
        ).show(supportFragmentManager, "general")
    }

    private fun openPricingEditor(p: Product) {
        SectionEditorSheet.create(
            title = "Pricing",
            fields = listOf(
                FieldDef("sellingprice", "Selling Price", FieldType.CURRENCY, p.sellingprice.toString()),
                FieldDef("costprice", "Cost Price", FieldType.CURRENCY, p.costprice.toString()),
                FieldDef("wholesaleprice", "Wholesale Price", FieldType.CURRENCY, p.wholesaleprice.toString()),
            ),
            onSave = { values ->
                val selling = values["sellingprice"]?.toDoubleOrNull() ?: p.sellingprice
                val cost = values["costprice"]?.toDoubleOrNull() ?: p.costprice
                val wholesale = values["wholesaleprice"]?.toDoubleOrNull() ?: p.wholesaleprice
                saveProduct(p.copy(
                    sellingprice = selling,
                    costprice = cost,
                    wholesaleprice = wholesale,
                    iswholesaleprice = if (wholesale > 0) "Y" else "N",
                ))
            }
        ).show(supportFragmentManager, "pricing")
    }

    private fun openCategoryTaxEditor(p: Product) {
        val catNames = categories.map { it.name ?: "Unknown" }
        val taxNames = taxes.map { "${it.name} (${it.rate}%)" }
        val currentCat = categories.find { it.productcategory_id == p.productcategory_id }?.name ?: ""
        val currentTax = taxes.find { it.tax_id == p.tax_id }?.let { "${it.name} (${it.rate}%)" } ?: ""

        SectionEditorSheet.create(
            title = "Category & Tax",
            fields = listOf(
                FieldDef("category", "Category", FieldType.DROPDOWN, currentCat, catNames),
                FieldDef("tax", "Tax Rate", FieldType.DROPDOWN, currentTax, taxNames),
                FieldDef("istaxincluded", "Tax Included in Price", FieldType.TOGGLE, p.istaxincluded ?: "N"),
            ),
            onSave = { values ->
                val selectedCat = categories.find { it.name == values["category"] }
                val selectedTax = taxes.find { "${it.name} (${it.rate}%)" == values["tax"] }
                saveProduct(p.copy(
                    productcategory_id = selectedCat?.productcategory_id ?: p.productcategory_id,
                    tax_id = selectedTax?.tax_id ?: p.tax_id,
                    istaxincluded = values["istaxincluded"],
                ))
            }
        ).show(supportFragmentManager, "category_tax")
    }

    private fun openFlagsEditor(p: Product) {
        SectionEditorSheet.create(
            title = "Flags",
            fields = listOf(
                FieldDef("isstock", "Stock Item", FieldType.TOGGLE, p.isstock ?: "N"),
                FieldDef("iskitchenitem", "Kitchen Item", FieldType.TOGGLE, p.iskitchenitem ?: "N"),
                FieldDef("isfavourite", "Favourite", FieldType.TOGGLE, p.isfavourite ?: "N"),
                FieldDef("ismodifier", "Modifier", FieldType.TOGGLE, p.ismodifier ?: "N"),
            ),
            onSave = { values ->
                saveProduct(p.copy(
                    isstock = values["isstock"],
                    iskitchenitem = values["iskitchenitem"],
                    isfavourite = values["isfavourite"],
                    ismodifier = values["ismodifier"],
                ))
            }
        ).show(supportFragmentManager, "flags")
    }

    private fun saveProduct(updated: Product) {
        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                try {
                    db.productDao().updateProduct(updated)
                } catch (e: Exception) {
                    Log.e("ProductDetail", "Failed to save product", e)
                    withContext(Dispatchers.Main) {
                        Toast.makeText(this@ProductDetailActivity, "Failed to save", Toast.LENGTH_SHORT).show()
                    }
                    return@withContext
                }
                Unit
            }
            product = updated
            renderBrochure(updated)
            Toast.makeText(this@ProductDetailActivity, "Saved", Toast.LENGTH_SHORT).show()
        }
    }
}
