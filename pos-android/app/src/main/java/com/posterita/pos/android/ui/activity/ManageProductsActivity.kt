package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.os.Bundle
import android.os.Environment
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.FileProvider
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.textfield.TextInputEditText
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.local.entity.ProductCategory
import com.posterita.pos.android.data.local.entity.Tax
import com.posterita.pos.android.databinding.ActivityManageListBinding
import com.posterita.pos.android.util.SharedPreferencesManager
import com.posterita.pos.android.util.WebsiteSetupService
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.io.File
import javax.inject.Inject

@AndroidEntryPoint
class ManageProductsActivity : AppCompatActivity() {

    private lateinit var binding: ActivityManageListBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var websiteSetupService: WebsiteSetupService

    private var products = mutableListOf<Product>()
    private var categories = listOf<ProductCategory>()
    private var taxes = listOf<Tax>()

    // Camera capture state
    private var photoFile: File? = null
    private var photoUri: Uri? = null
    private var capturedImageBytes: ByteArray? = null
    private var pendingDialogView: View? = null
    private var pendingDialogProduct: Product? = null
    private var pendingDialog: AlertDialog? = null

    private val takePictureLauncher = registerForActivityResult(
        ActivityResultContracts.TakePicture()
    ) { success ->
        if (success && photoFile != null) {
            onPhotoCaptured()
        }
    }

    private val pickImageLauncher = registerForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            onImagePicked(uri)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityManageListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.toolbar.title = "Manage Products"
        binding.toolbar.setNavigationOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.fabAdd.setOnClickListener { showProductDialog(null) }
        binding.fabAdd.setOnLongClickListener {
            startActivity(Intent(this, BulkProductImportActivity::class.java))
            true
        }

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
            binding.tvEmpty.visibility = if (products.isEmpty()) View.VISIBLE else View.GONE
            binding.recyclerView.adapter = ProductAdapter()
        }
    }

    private fun showProductDialog(product: Product?) {
        val isEdit = product != null
        val view = LayoutInflater.from(this).inflate(R.layout.dialog_edit_product, null)
        val etName = view.findViewById<TextInputEditText>(R.id.etProductName)
        val etPrice = view.findViewById<TextInputEditText>(R.id.etProductPrice)
        val etCost = view.findViewById<TextInputEditText>(R.id.etProductCost)
        val etUpc = view.findViewById<TextInputEditText>(R.id.etProductUpc)
        val etDescription = view.findViewById<TextInputEditText>(R.id.etProductDescription)

        // Reset camera state for new dialog
        capturedImageBytes = null

        if (isEdit) {
            etName.setText(product!!.name)
            etPrice.setText(product.sellingprice?.toString() ?: "0")
            etCost.setText(product.costprice?.toString() ?: "0")
            etUpc.setText(product.upc ?: "")
            etDescription.setText(product.description ?: "")

            // Show existing product image
            if (!product.image.isNullOrBlank()) {
                val ivPhoto = view.findViewById<ImageView>(R.id.ivProductPhoto)
                val file = File(product.image!!)
                if (file.exists()) {
                    val bmp = BitmapFactory.decodeFile(file.absolutePath)
                    if (bmp != null) ivPhoto?.setImageBitmap(bmp)
                }
            }
        }

        val categoryNames = listOf("None") + categories.map { it.name ?: "Unknown" }
        val taxNames = listOf("No Tax") + taxes.map { "${it.name} (${it.rate}%)" }

        var selectedCategoryIndex = 0
        var selectedTaxIndex = 0

        if (isEdit) {
            selectedCategoryIndex = categories.indexOfFirst { it.productcategory_id == product!!.productcategory_id }.let { if (it >= 0) it + 1 else 0 }
            selectedTaxIndex = taxes.indexOfFirst { it.tax_id == product!!.tax_id }.let { if (it >= 0) it + 1 else 0 }
        }

        val dialog = AlertDialog.Builder(this)
            .setTitle(if (isEdit) "Edit Product" else "Add Product")
            .setView(view)
            .setPositiveButton("Save", null)
            .setNegativeButton("Cancel", null)
            .apply {
                if (isEdit) {
                    setNeutralButton("Delete") { _, _ -> deleteProduct(product!!) }
                }
            }
            .create()

        dialog.setOnShowListener {
            // AI photo button — disable if no API key
            val btnAiPhoto = view.findViewById<MaterialButton>(R.id.btnAiPhoto)
            val tvAiHint = view.findViewById<TextView>(R.id.tvAiPhotoHint)
            if (!websiteSetupService.isConfigured()) {
                btnAiPhoto?.isEnabled = false
                tvAiHint?.text = "Add your Claude API key in Admin Settings"
            }
            btnAiPhoto?.setOnClickListener {
                showImageSourcePicker(view, product, dialog)
            }

            // Show category picker
            view.findViewById<View>(R.id.btnSelectCategory)?.setOnClickListener {
                AlertDialog.Builder(this)
                    .setTitle("Select Category")
                    .setSingleChoiceItems(categoryNames.toTypedArray(), selectedCategoryIndex) { d, which ->
                        selectedCategoryIndex = which
                        view.findViewById<TextView>(R.id.tvSelectedCategory)?.text =
                            if (which == 0) "None" else categoryNames[which]
                        d.dismiss()
                    }
                    .show()
            }

            // Show tax picker
            view.findViewById<View>(R.id.btnSelectTax)?.setOnClickListener {
                AlertDialog.Builder(this)
                    .setTitle("Select Tax")
                    .setSingleChoiceItems(taxNames.toTypedArray(), selectedTaxIndex) { d, which ->
                        selectedTaxIndex = which
                        view.findViewById<TextView>(R.id.tvSelectedTax)?.text =
                            if (which == 0) "No Tax" else taxNames[which]
                        d.dismiss()
                    }
                    .show()
            }

            // Set initial display
            view.findViewById<TextView>(R.id.tvSelectedCategory)?.text =
                if (selectedCategoryIndex == 0) "None" else categoryNames[selectedCategoryIndex]
            view.findViewById<TextView>(R.id.tvSelectedTax)?.text =
                if (selectedTaxIndex == 0) "No Tax" else taxNames[selectedTaxIndex]

            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val name = etName.text?.toString()?.trim() ?: ""
                val price = etPrice.text?.toString()?.toDoubleOrNull() ?: 0.0
                val cost = etCost.text?.toString()?.toDoubleOrNull() ?: 0.0
                val upc = etUpc.text?.toString()?.trim()
                val desc = etDescription.text?.toString()?.trim()

                if (name.isEmpty()) {
                    Toast.makeText(this, "Product name is required", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                val categoryId = if (selectedCategoryIndex > 0) categories[selectedCategoryIndex - 1].productcategory_id else 0
                val taxId = if (selectedTaxIndex > 0) taxes[selectedTaxIndex - 1].tax_id else 0
                val taxRate = if (selectedTaxIndex > 0) taxes[selectedTaxIndex - 1].rate else 0.0
                val taxAmt = if (taxRate > 0) price * taxRate / (100 + taxRate) else 0.0

                val imagePath = photoFile?.takeIf { capturedImageBytes != null }?.absolutePath

                lifecycleScope.launch {
                    withContext(Dispatchers.IO) {
                        val newProduct = if (isEdit) {
                            product!!.copy(
                                name = name, sellingprice = price, costprice = cost,
                                upc = upc, description = desc,
                                productcategory_id = categoryId, tax_id = taxId,
                                taxamount = taxAmt, isactive = "Y",
                                image = imagePath ?: product.image
                            )
                        } else {
                            val maxId = db.productDao().getMaxProductId() ?: 0
                            Product(
                                product_id = maxId + 1, name = name, sellingprice = price,
                                costprice = cost, upc = upc, description = desc,
                                productcategory_id = categoryId, tax_id = taxId,
                                taxamount = taxAmt, isactive = "Y",
                                istaxincluded = "Y", isstock = "Y",
                                image = imagePath
                            )
                        }
                        db.productDao().insertProduct(newProduct)
                    }
                    // Reset camera state
                    capturedImageBytes = null
                    photoFile = null
                    dialog.dismiss()
                    loadData()
                    Toast.makeText(this@ManageProductsActivity,
                        if (isEdit) "Product updated" else "Product added", Toast.LENGTH_SHORT).show()
                }
            }
        }
        dialog.show()
    }

    private fun deleteProduct(product: Product) {
        AlertDialog.Builder(this)
            .setTitle("Delete Product")
            .setMessage("Are you sure you want to delete '${product.name}'?")
            .setPositiveButton("Delete") { _, _ ->
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) { db.productDao().deleteProduct(product) }
                    loadData()
                    Toast.makeText(this@ManageProductsActivity, "Product deleted", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showImageSourcePicker(dialogView: View, product: Product?, dialog: AlertDialog?) {
        AlertDialog.Builder(this)
            .setTitle("Add Product Photo")
            .setItems(arrayOf("Take Photo", "Choose from Gallery")) { _, which ->
                when (which) {
                    0 -> launchCamera(dialogView, product, dialog)
                    1 -> launchGallery(dialogView, product, dialog)
                }
            }
            .show()
    }

    private fun launchGallery(dialogView: View, product: Product?, dialog: AlertDialog?) {
        pendingDialogView = dialogView
        pendingDialogProduct = product
        pendingDialog = dialog
        pickImageLauncher.launch("image/*")
    }

    private fun onImagePicked(uri: Uri) {
        val view = pendingDialogView ?: return

        try {
            val inputStream = contentResolver.openInputStream(uri) ?: return
            val bitmap = BitmapFactory.decodeStream(inputStream)
            inputStream.close()
            if (bitmap == null) return

            val scaled = scaleBitmap(bitmap, 1024)
            val baos = ByteArrayOutputStream()
            scaled.compress(Bitmap.CompressFormat.JPEG, 85, baos)
            capturedImageBytes = baos.toByteArray()

            // Save to a file for the product image
            val file = File(
                getExternalFilesDir(Environment.DIRECTORY_PICTURES),
                "product_${System.currentTimeMillis()}.jpg"
            )
            file.writeBytes(capturedImageBytes!!)
            photoFile = file

            // Show thumbnail in dialog
            val ivPhoto = view.findViewById<ImageView>(R.id.ivProductPhoto)
            ivPhoto?.setImageBitmap(scaled)

            // Auto-trigger AI analysis
            analyzeWithAi(view)
        } catch (e: Exception) {
            Toast.makeText(this, "Could not load image", Toast.LENGTH_SHORT).show()
        }
    }

    private fun launchCamera(dialogView: View, product: Product?, dialog: AlertDialog?) {
        pendingDialogView = dialogView
        pendingDialogProduct = product
        pendingDialog = dialog

        val file = File(
            getExternalFilesDir(Environment.DIRECTORY_PICTURES),
            "product_${System.currentTimeMillis()}.jpg"
        )
        photoFile = file
        photoUri = FileProvider.getUriForFile(this, "$packageName.fileprovider", file)
        takePictureLauncher.launch(photoUri!!)
    }

    private fun onPhotoCaptured() {
        val file = photoFile ?: return
        val view = pendingDialogView ?: return

        // Decode, compress, and store image bytes for AI
        val bitmap = BitmapFactory.decodeFile(file.absolutePath) ?: return
        val scaled = scaleBitmap(bitmap, 1024)
        val baos = ByteArrayOutputStream()
        scaled.compress(Bitmap.CompressFormat.JPEG, 85, baos)
        capturedImageBytes = baos.toByteArray()

        // Show thumbnail in dialog
        val ivPhoto = view.findViewById<ImageView>(R.id.ivProductPhoto)
        ivPhoto?.setImageBitmap(scaled)

        // Auto-trigger AI analysis
        analyzeWithAi(view)
    }

    private fun scaleBitmap(bitmap: Bitmap, maxDim: Int): Bitmap {
        val ratio = minOf(maxDim.toFloat() / bitmap.width, maxDim.toFloat() / bitmap.height)
        if (ratio >= 1f) return bitmap
        return Bitmap.createScaledBitmap(
            bitmap,
            (bitmap.width * ratio).toInt(),
            (bitmap.height * ratio).toInt(),
            true
        )
    }

    private fun analyzeWithAi(view: View) {
        val imageBytes = capturedImageBytes ?: return
        val btnAi = view.findViewById<MaterialButton>(R.id.btnAiPhoto) ?: return
        val tvHint = view.findViewById<TextView>(R.id.tvAiPhotoHint) ?: return

        btnAi.isEnabled = false
        btnAi.text = "Analyzing..."
        tvHint.text = "AI is identifying this product..."

        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                websiteSetupService.analyzeProductImage(imageBytes)
            }

            btnAi.isEnabled = true
            btnAi.text = "AI Scan Product"

            result.onSuccess { data ->
                tvHint.text = "AI filled in the details below"

                // Pre-fill form fields
                val etName = view.findViewById<TextInputEditText>(R.id.etProductName)
                val etPrice = view.findViewById<TextInputEditText>(R.id.etProductPrice)
                val etDesc = view.findViewById<TextInputEditText>(R.id.etProductDescription)

                if (data.name.isNotBlank()) etName?.setText(data.name)
                if (data.price > 0) etPrice?.setText(data.price.toString())
                if (data.description.isNotBlank()) etDesc?.setText(data.description)

                // Try to match AI-suggested category to existing categories
                if (data.category.isNotBlank()) {
                    val matchIndex = categories.indexOfFirst {
                        it.name?.equals(data.category, ignoreCase = true) == true
                    }
                    if (matchIndex >= 0) {
                        view.findViewById<TextView>(R.id.tvSelectedCategory)?.text =
                            categories[matchIndex].name
                    }
                }
            }

            result.onFailure { error ->
                tvHint.text = "Could not analyze: ${error.message}"
            }
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
                card.setOnClickListener { showProductDialog(products[adapterPosition]) }
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
        }
        override fun getItemCount() = products.size
    }
}
