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
import android.widget.CheckBox
import android.widget.ImageView
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Product
import com.posterita.pos.android.data.local.entity.ProductCategory
import com.posterita.pos.android.data.local.entity.Tax
import com.posterita.pos.android.databinding.ActivityBulkImportBinding
import com.posterita.pos.android.util.DocumentTextExtractor
import com.posterita.pos.android.util.DocumentTextExtractor.DocType
import com.posterita.pos.android.util.SharedPreferencesManager
import com.posterita.pos.android.util.WebsiteSetupService
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withContext
import android.provider.DocumentsContract
import java.io.ByteArrayOutputStream
import java.io.File
import javax.inject.Inject

@AndroidEntryPoint
class BulkProductImportActivity : BaseActivity() {

    private lateinit var binding: ActivityBulkImportBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var websiteSetupService: WebsiteSetupService

    private val pendingProducts = mutableListOf<PendingProduct>()
    private var categories = listOf<ProductCategory>()
    private var taxes = listOf<Tax>()
    private var adapter: BulkImportAdapter? = null
    private var isProcessing = false

    data class PendingProduct(
        val originalUri: Uri,
        val originalImageBytes: ByteArray? = null,
        var localImageFile: File? = null,
        var analysisResult: WebsiteSetupService.BulkProductAnalysisResult? = null,
        var betterImageUrl: String? = null,
        var betterImageFile: File? = null,
        var isProcessing: Boolean = false,
        var isComplete: Boolean = false,
        var error: String? = null,
        var editedName: String = "",
        var editedPrice: Double = 0.0,
        var editedDescription: String = "",
        var editedCategory: String = "",
        var isSelected: Boolean = true,
        var imageWasReplaced: Boolean = false,
        var sourceType: DocType = DocType.IMAGE,
        var sourceFileName: String = "",
        var folderHint: String = ""  // subfolder name used as product name hint
    )

    // Accept all file types
    private val pickMultipleFiles = registerForActivityResult(
        ActivityResultContracts.OpenMultipleDocuments()
    ) { uris: List<Uri> ->
        if (uris.isNotEmpty()) {
            onFilesSelected(uris)
        }
    }

    // Folder picker — traverses subfolders
    private val pickFolder = registerForActivityResult(
        ActivityResultContracts.OpenDocumentTree()
    ) { treeUri: Uri? ->
        if (treeUri != null) {
            contentResolver.takePersistableUriPermission(
                treeUri, Intent.FLAG_GRANT_READ_URI_PERMISSION
            )
            onFolderSelected(treeUri)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityBulkImportBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.toolbar.title = "Bulk AI Import"
        binding.toolbar.setNavigationOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.btnSelectImages.setOnClickListener {
            if (!websiteSetupService.isConfigured()) {
                Toast.makeText(this, "Configure your Claude API key in Admin Settings first", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }
            pickMultipleFiles.launch(arrayOf("*/*"))
        }
        binding.btnSelectFolder.setOnClickListener {
            if (!websiteSetupService.isConfigured()) {
                Toast.makeText(this, "Configure your Claude API key in Admin Settings first", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }
            pickFolder.launch(null)
        }
        binding.btnSaveAll.setOnClickListener { saveAllProducts() }
        binding.btnAddMore.setOnClickListener {
            if (!isProcessing) {
                pickMultipleFiles.launch(arrayOf("*/*"))
            }
        }
        binding.btnSelectAll.setOnClickListener { toggleSelectAll() }

        loadReferenceData()
    }

    private fun loadReferenceData() {
        lifecycleScope.launch {
            categories = withContext(Dispatchers.IO) {
                db.productCategoryDao().getAllProductCategoriesSync()
            }
            taxes = withContext(Dispatchers.IO) {
                db.taxDao().getAllTaxesSync()
            }
        }
    }

    private fun toggleSelectAll() {
        val allSelected = pendingProducts.all { it.isSelected }
        pendingProducts.forEach { it.isSelected = !allSelected }
        adapter?.notifyDataSetChanged()
        binding.btnSelectAll.text = if (!allSelected) "Deselect All" else "Select All"
        binding.btnSaveAll.isEnabled = pendingProducts.any { it.isSelected && it.isComplete && it.error == null }
    }

    /**
     * Handles folder selection. Traverses the folder tree recursively,
     * collecting all image files. Subfolder names are used as product name hints
     * (e.g., folder "Margherita Pizza" containing product photos).
     */
    private fun onFolderSelected(treeUri: Uri) {
        lifecycleScope.launch {
            val allFiles = mutableListOf<Pair<Uri, String>>() // uri to folderHint

            withContext(Dispatchers.IO) {
                fun traverse(parentUri: Uri, parentFolderName: String) {
                    val childrenUri = DocumentsContract.buildChildDocumentsUriUsingTree(
                        treeUri, DocumentsContract.getDocumentId(parentUri)
                    )

                    contentResolver.query(
                        childrenUri,
                        arrayOf(
                            DocumentsContract.Document.COLUMN_DOCUMENT_ID,
                            DocumentsContract.Document.COLUMN_DISPLAY_NAME,
                            DocumentsContract.Document.COLUMN_MIME_TYPE
                        ),
                        null, null, null
                    )?.use { cursor ->
                        val idCol = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DOCUMENT_ID)
                        val nameCol = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_DISPLAY_NAME)
                        val mimeCol = cursor.getColumnIndex(DocumentsContract.Document.COLUMN_MIME_TYPE)

                        while (cursor.moveToNext()) {
                            val docId = cursor.getString(idCol)
                            val name = cursor.getString(nameCol) ?: ""
                            val mime = cursor.getString(mimeCol) ?: ""

                            val docUri = DocumentsContract.buildDocumentUriUsingTree(treeUri, docId)

                            if (mime == DocumentsContract.Document.MIME_TYPE_DIR) {
                                // Subfolder — recurse, using folder name as hint
                                traverse(docUri, name)
                            } else if (mime.startsWith("image/")) {
                                // Image file — use parent folder name as hint
                                allFiles.add(docUri to parentFolderName)
                            }
                        }
                    }
                }

                val rootDocUri = DocumentsContract.buildDocumentUriUsingTree(
                    treeUri, DocumentsContract.getTreeDocumentId(treeUri)
                )
                traverse(rootDocUri, "")
            }

            if (allFiles.isEmpty()) {
                Toast.makeText(this@BulkProductImportActivity, "No images found in folder", Toast.LENGTH_SHORT).show()
                return@launch
            }

            Toast.makeText(this@BulkProductImportActivity, "Found ${allFiles.size} images", Toast.LENGTH_SHORT).show()
            onFolderFilesCollected(allFiles)
        }
    }

    /**
     * Processes image files collected from folder traversal.
     * Each file gets a PendingProduct with folderHint set to the subfolder name.
     */
    private fun onFolderFilesCollected(files: List<Pair<Uri, String>>) {
        lifecycleScope.launch {
            binding.emptyState.visibility = View.GONE
            binding.recyclerView.visibility = View.VISIBLE
            binding.bottomBar.visibility = View.VISIBLE
            binding.progressSection.visibility = View.VISIBLE
            binding.btnSaveAll.isEnabled = false

            val newProducts = withContext(Dispatchers.IO) {
                files.mapNotNull { (uri, folderHint) ->
                    try {
                        val inputStream = contentResolver.openInputStream(uri) ?: return@mapNotNull null
                        val bitmap = BitmapFactory.decodeStream(inputStream)
                        inputStream.close()
                        if (bitmap == null) return@mapNotNull null

                        val scaled = scaleBitmap(bitmap, 1024)
                        val baos = ByteArrayOutputStream()
                        scaled.compress(Bitmap.CompressFormat.JPEG, 85, baos)
                        val imageBytes = baos.toByteArray()

                        val file = File(
                            getExternalFilesDir(Environment.DIRECTORY_PICTURES),
                            "bulk_${System.currentTimeMillis()}_${uri.hashCode()}.jpg"
                        )
                        file.writeBytes(imageBytes)

                        PendingProduct(
                            originalUri = uri,
                            originalImageBytes = imageBytes,
                            localImageFile = file,
                            sourceType = DocType.IMAGE,
                            sourceFileName = getFileName(uri),
                            folderHint = folderHint
                        )
                    } catch (e: Exception) {
                        null
                    }
                }
            }

            pendingProducts.addAll(newProducts)

            if (adapter == null) {
                adapter = BulkImportAdapter()
                binding.recyclerView.adapter = adapter
            } else {
                adapter?.notifyDataSetChanged()
            }

            processAll()
        }
    }

    private fun getFileName(uri: Uri): String {
        var name = ""
        contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
            if (cursor.moveToFirst() && nameIndex >= 0) {
                name = cursor.getString(nameIndex) ?: ""
            }
        }
        return name
    }

    private fun onFilesSelected(uris: List<Uri>) {
        lifecycleScope.launch {
            binding.emptyState.visibility = View.GONE
            binding.recyclerView.visibility = View.VISIBLE
            binding.bottomBar.visibility = View.VISIBLE
            binding.progressSection.visibility = View.VISIBLE
            binding.btnSaveAll.isEnabled = false

            // Classify and separate images from documents
            val imageUris = mutableListOf<Uri>()
            val documentUris = mutableListOf<Pair<Uri, DocType>>()

            for (uri in uris) {
                val mimeType = contentResolver.getType(uri)
                val docType = DocumentTextExtractor.classifyMimeType(mimeType)
                val fileName = getFileName(uri)

                when (docType) {
                    DocType.IMAGE -> imageUris.add(uri)
                    DocType.PDF, DocType.CSV, DocType.PLAIN_TEXT, DocType.DOCX, DocType.XLSX ->
                        documentUris.add(uri to docType)
                    DocType.UNKNOWN -> {
                        // Try to guess from file extension
                        val ext = fileName.substringAfterLast('.', "").lowercase()
                        val guessedType = when (ext) {
                            "pdf" -> DocType.PDF
                            "csv" -> DocType.CSV
                            "txt" -> DocType.PLAIN_TEXT
                            "docx", "doc" -> DocType.DOCX
                            "xlsx", "xls" -> DocType.XLSX
                            "jpg", "jpeg", "png", "webp", "bmp", "gif" -> DocType.IMAGE
                            else -> null
                        }
                        if (guessedType == DocType.IMAGE) {
                            imageUris.add(uri)
                        } else if (guessedType != null) {
                            documentUris.add(uri to guessedType)
                        } else {
                            // Skip unsupported files
                            withContext(Dispatchers.Main) {
                                Toast.makeText(
                                    this@BulkProductImportActivity,
                                    "Skipped unsupported file: $fileName",
                                    Toast.LENGTH_SHORT
                                ).show()
                            }
                        }
                    }
                }
            }

            // Process images → one PendingProduct per image
            val imageProducts = withContext(Dispatchers.IO) {
                imageUris.mapNotNull { uri ->
                    try {
                        val inputStream = contentResolver.openInputStream(uri) ?: return@mapNotNull null
                        val bitmap = BitmapFactory.decodeStream(inputStream)
                        inputStream.close()
                        if (bitmap == null) return@mapNotNull null

                        val scaled = scaleBitmap(bitmap, 1024)
                        val baos = ByteArrayOutputStream()
                        scaled.compress(Bitmap.CompressFormat.JPEG, 85, baos)
                        val imageBytes = baos.toByteArray()

                        val file = File(
                            getExternalFilesDir(Environment.DIRECTORY_PICTURES),
                            "bulk_${System.currentTimeMillis()}_${uri.hashCode()}.jpg"
                        )
                        file.writeBytes(imageBytes)

                        PendingProduct(
                            originalUri = uri,
                            originalImageBytes = imageBytes,
                            localImageFile = file,
                            sourceType = DocType.IMAGE,
                            sourceFileName = getFileName(uri)
                        )
                    } catch (e: Exception) {
                        null
                    }
                }
            }

            // Add placeholder entries for documents (will expand into multiple products)
            val documentPlaceholders = documentUris.map { (uri, docType) ->
                PendingProduct(
                    originalUri = uri,
                    sourceType = docType,
                    sourceFileName = getFileName(uri)
                )
            }

            pendingProducts.addAll(imageProducts)
            pendingProducts.addAll(documentPlaceholders)

            if (adapter == null) {
                adapter = BulkImportAdapter()
                binding.recyclerView.adapter = adapter
            } else {
                adapter?.notifyDataSetChanged()
            }

            processAll()
        }
    }

    private fun processAll() {
        val unprocessed = pendingProducts.filter { !it.isComplete && !it.isProcessing && it.error == null }
        if (unprocessed.isEmpty()) return

        isProcessing = true
        updateProgress(pendingProducts.count { it.isComplete }, pendingProducts.size)

        lifecycleScope.launch {
            val semaphore = Semaphore(3)

            coroutineScope {
                unprocessed.map { pending ->
                    async(Dispatchers.IO) {
                        semaphore.withPermit {
                            if (pending.sourceType == DocType.IMAGE) {
                                processSingleImage(pending)
                            } else {
                                processSingleDocument(pending)
                            }
                        }
                    }
                }.awaitAll()
            }

            isProcessing = false
            binding.btnSaveAll.isEnabled = pendingProducts.any { it.isSelected && it.isComplete && it.error == null }
            val completed = pendingProducts.count { it.isComplete }
            binding.tvProgress.text = "Ready to save — $completed products identified"
        }
    }

    private suspend fun processSingleImage(pending: PendingProduct) {
        pending.isProcessing = true
        withContext(Dispatchers.Main) { adapter?.notifyItemChanged(pendingProducts.indexOf(pending)) }

        val imageBytes = pending.originalImageBytes ?: run {
            pending.error = "No image data"
            pending.isProcessing = false
            return
        }

        val result = websiteSetupService.analyzeProductImageWithQuality(imageBytes, pending.folderHint)

        result.onSuccess { data ->
            pending.analysisResult = data
            // If AI couldn't figure out the name but we have a folder hint, use it
            pending.editedName = if (data.name.isBlank() && pending.folderHint.isNotBlank()) {
                pending.folderHint
            } else data.name
            pending.editedPrice = data.price
            pending.editedDescription = data.description
            pending.editedCategory = data.category

            if (data.imageQuality < 60) {
                val betterUrl = websiteSetupService.searchBetterProductImage(data.name, data.searchTerms)
                if (betterUrl != null) {
                    val betterFile = File(
                        getExternalFilesDir(Environment.DIRECTORY_PICTURES),
                        "bulk_better_${System.currentTimeMillis()}_${pending.originalUri.hashCode()}.jpg"
                    )
                    val downloaded = websiteSetupService.downloadImageToFile(betterUrl, betterFile)
                    if (downloaded && betterFile.exists() && betterFile.length() > 1000) {
                        pending.betterImageUrl = betterUrl
                        pending.betterImageFile = betterFile
                        pending.imageWasReplaced = true
                    }
                }
            }

            pending.isComplete = true
            pending.isProcessing = false
        }

        result.onFailure { error ->
            pending.error = error.message ?: "Analysis failed"
            pending.isProcessing = false
        }

        withContext(Dispatchers.Main) {
            val index = pendingProducts.indexOf(pending)
            adapter?.notifyItemChanged(index)
            updateProgress(pendingProducts.count { it.isComplete }, pendingProducts.size)
        }
    }

    private suspend fun processSingleDocument(pending: PendingProduct) {
        pending.isProcessing = true
        val placeholderIndex = pendingProducts.indexOf(pending)
        withContext(Dispatchers.Main) { adapter?.notifyItemChanged(placeholderIndex) }

        val result: Result<WebsiteSetupService.DocumentProductsResult> = withContext(Dispatchers.IO) {
            when (pending.sourceType) {
                DocType.PDF -> {
                    val bytes = DocumentTextExtractor.readBytes(contentResolver, pending.originalUri)
                    if (bytes != null) {
                        websiteSetupService.analyzePdfForProducts(bytes)
                    } else {
                        Result.failure(Exception("Could not read PDF file"))
                    }
                }
                DocType.CSV, DocType.PLAIN_TEXT -> {
                    val text = DocumentTextExtractor.readTextContent(contentResolver, pending.originalUri)
                    if (text != null) {
                        websiteSetupService.analyzeDocumentForProducts(text)
                    } else {
                        Result.failure(Exception("Could not read text file"))
                    }
                }
                DocType.DOCX -> {
                    val text = DocumentTextExtractor.extractDocxText(contentResolver, pending.originalUri)
                    if (!text.isNullOrBlank()) {
                        websiteSetupService.analyzeDocumentForProducts(text)
                    } else {
                        Result.failure(Exception("Could not extract text from Word document"))
                    }
                }
                DocType.XLSX -> {
                    val text = DocumentTextExtractor.extractXlsxText(contentResolver, pending.originalUri)
                    if (!text.isNullOrBlank()) {
                        websiteSetupService.analyzeDocumentForProducts(text)
                    } else {
                        Result.failure(Exception("Could not extract text from Excel file"))
                    }
                }
                else -> Result.failure(Exception("Unsupported document type"))
            }
        }

        result.onSuccess { data ->
            if (data.products.isEmpty()) {
                pending.error = "No products found in document"
                pending.isProcessing = false
            } else if (data.products.size == 1) {
                // Single product — just fill the placeholder
                val p = data.products[0]
                pending.editedName = p.name
                pending.editedPrice = p.price
                pending.editedDescription = p.description
                pending.editedCategory = p.category
                pending.isComplete = true
                pending.isProcessing = false
            } else {
                // Multiple products — replace placeholder with individual entries
                val firstProduct = data.products[0]
                pending.editedName = firstProduct.name
                pending.editedPrice = firstProduct.price
                pending.editedDescription = firstProduct.description
                pending.editedCategory = firstProduct.category
                pending.isComplete = true
                pending.isProcessing = false

                // Create additional entries for remaining products
                val additionalProducts = data.products.drop(1).map { p ->
                    PendingProduct(
                        originalUri = pending.originalUri,
                        sourceType = pending.sourceType,
                        sourceFileName = pending.sourceFileName,
                        editedName = p.name,
                        editedPrice = p.price,
                        editedDescription = p.description,
                        editedCategory = p.category,
                        isComplete = true,
                        isSelected = true
                    )
                }

                withContext(Dispatchers.Main) {
                    val insertIndex = pendingProducts.indexOf(pending) + 1
                    pendingProducts.addAll(insertIndex, additionalProducts)
                    adapter?.notifyDataSetChanged()
                }
            }
        }

        result.onFailure { error ->
            pending.error = error.message ?: "Document analysis failed"
            pending.isProcessing = false
        }

        withContext(Dispatchers.Main) {
            adapter?.notifyDataSetChanged()
            updateProgress(pendingProducts.count { it.isComplete }, pendingProducts.size)
        }
    }

    private fun updateProgress(completed: Int, total: Int) {
        binding.progressBar.max = total
        binding.progressBar.progress = completed
        binding.tvProgress.text = "Processing $completed of $total..."
    }

    private fun saveAllProducts() {
        val selected = pendingProducts.filter { it.isSelected && it.isComplete && it.error == null }
        if (selected.isEmpty()) {
            Toast.makeText(this, "No products to save", Toast.LENGTH_SHORT).show()
            return
        }

        binding.btnSaveAll.isEnabled = false
        binding.btnAddMore.isEnabled = false

        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                val maxId = db.productDao().getMaxProductId() ?: 0
                val products = selected.mapIndexed { index, pending ->
                    val categoryId = matchCategory(pending.editedCategory)
                    val imagePath = pending.betterImageFile?.absolutePath
                        ?: pending.localImageFile?.absolutePath

                    Product(
                        product_id = maxId + 1 + index,
                        name = pending.editedName,
                        sellingprice = pending.editedPrice,
                        description = pending.editedDescription,
                        productcategory_id = categoryId,
                        image = imagePath,
                        isactive = "Y",
                        istaxincluded = "Y",
                        isstock = "Y"
                    )
                }
                db.productDao().insertProducts(products)
            }
            Toast.makeText(
                this@BulkProductImportActivity,
                "${selected.size} products imported successfully",
                Toast.LENGTH_SHORT
            ).show()
            finish()
        }
    }

    private fun matchCategory(categoryName: String): Int {
        if (categoryName.isBlank()) return 0
        val match = categories.firstOrNull {
            it.name?.equals(categoryName, ignoreCase = true) == true
        }
        return match?.productcategory_id ?: 0
    }

    private fun showEditDialog(pending: PendingProduct) {
        val view = LayoutInflater.from(this).inflate(R.layout.dialog_edit_product, null)
        val etName = view.findViewById<TextInputEditText>(R.id.etProductName)
        val etPrice = view.findViewById<TextInputEditText>(R.id.etProductPrice)
        val etCost = view.findViewById<TextInputEditText>(R.id.etProductCost)
        val etDescription = view.findViewById<TextInputEditText>(R.id.etProductDescription)

        view.findViewById<MaterialButton>(R.id.btnAiPhoto)?.visibility = View.GONE
        view.findViewById<TextView>(R.id.tvAiPhotoHint)?.visibility = View.GONE

        val ivPhoto = view.findViewById<ImageView>(R.id.ivProductPhoto)
        val imageFile = pending.betterImageFile ?: pending.localImageFile
        if (imageFile != null) {
            Glide.with(this).load(imageFile).into(ivPhoto)
        }

        etName.setText(pending.editedName)
        etPrice.setText(if (pending.editedPrice > 0) pending.editedPrice.toString() else "")
        etCost.setText("")
        etDescription.setText(pending.editedDescription)

        val categoryNames = listOf("None") + categories.map { it.name ?: "Unknown" }
        var selectedCategoryIndex = categories.indexOfFirst {
            it.name?.equals(pending.editedCategory, ignoreCase = true) == true
        }.let { if (it >= 0) it + 1 else 0 }

        view.findViewById<TextView>(R.id.tvSelectedCategory)?.text =
            if (selectedCategoryIndex == 0) "None" else categoryNames[selectedCategoryIndex]

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

        AlertDialog.Builder(this)
            .setTitle("Edit Product")
            .setView(view)
            .setPositiveButton("Save") { _, _ ->
                pending.editedName = etName.text?.toString()?.trim() ?: pending.editedName
                pending.editedPrice = etPrice.text?.toString()?.toDoubleOrNull() ?: pending.editedPrice
                pending.editedDescription = etDescription.text?.toString()?.trim() ?: pending.editedDescription
                if (selectedCategoryIndex > 0) {
                    pending.editedCategory = categories[selectedCategoryIndex - 1].name ?: ""
                }
                adapter?.notifyItemChanged(pendingProducts.indexOf(pending))
            }
            .setNegativeButton("Cancel", null)
            .show()
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

    // ── RecyclerView Adapter ──

    inner class BulkImportAdapter : RecyclerView.Adapter<BulkImportAdapter.VH>() {

        inner class VH(itemView: View) : RecyclerView.ViewHolder(itemView) {
            val ivImage: ImageView = itemView.findViewById(R.id.ivProductImage)
            val progressItem: ProgressBar = itemView.findViewById(R.id.progressItem)
            val ivQualityBadge: ImageView = itemView.findViewById(R.id.ivQualityBadge)
            val tvName: TextView = itemView.findViewById(R.id.tvProductName)
            val tvPrice: TextView = itemView.findViewById(R.id.tvProductPrice)
            val tvCategory: TextView = itemView.findViewById(R.id.tvProductCategory)
            val tvDescription: TextView = itemView.findViewById(R.id.tvProductDescription)
            val tvQualityNote: TextView = itemView.findViewById(R.id.tvQualityNote)
            val tvError: TextView = itemView.findViewById(R.id.tvError)
            val cbSelected: CheckBox = itemView.findViewById(R.id.cbSelected)
            val btnEdit: ImageView = itemView.findViewById(R.id.btnEdit)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_bulk_import_product, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val pending = pendingProducts[position]

            // Image: show better image if available, otherwise original, or document icon
            val imageSource: Any? = when {
                pending.betterImageFile != null -> pending.betterImageFile
                pending.localImageFile != null -> pending.localImageFile
                pending.sourceType != DocType.IMAGE -> R.drawable.ic_product_placeholder
                else -> R.drawable.ic_product_placeholder
            }
            Glide.with(holder.ivImage.context)
                .load(imageSource)
                .placeholder(R.drawable.ic_product_placeholder)
                .error(R.drawable.ic_product_placeholder)
                .centerCrop()
                .into(holder.ivImage)

            holder.progressItem.visibility = if (pending.isProcessing) View.VISIBLE else View.GONE

            if (pending.isProcessing) {
                val label = if (pending.sourceType == DocType.IMAGE) "Analyzing image..."
                    else "Analyzing ${pending.sourceFileName}..."
                holder.tvName.text = label
                holder.tvPrice.visibility = View.GONE
                holder.tvCategory.visibility = View.GONE
                holder.tvDescription.visibility = View.GONE
                holder.tvQualityNote.visibility = View.GONE
                holder.tvError.visibility = View.GONE
                holder.btnEdit.visibility = View.GONE
                return
            }

            if (pending.error != null) {
                holder.tvName.text = "Analysis failed"
                holder.tvError.visibility = View.VISIBLE
                holder.tvError.text = pending.error
                holder.tvPrice.visibility = View.GONE
                holder.tvCategory.visibility = View.GONE
                holder.tvDescription.visibility = View.GONE
                holder.tvQualityNote.visibility = View.GONE
                holder.btnEdit.visibility = View.GONE
                holder.cbSelected.isChecked = false
                pending.isSelected = false
                return
            }

            if (pending.isComplete) {
                holder.tvName.text = pending.editedName.ifBlank { "Unknown Product" }

                if (pending.editedPrice > 0) {
                    holder.tvPrice.visibility = View.VISIBLE
                    holder.tvPrice.text = String.format("%.2f", pending.editedPrice)
                } else {
                    holder.tvPrice.visibility = View.VISIBLE
                    holder.tvPrice.text = "Price not detected"
                }

                if (pending.editedCategory.isNotBlank()) {
                    holder.tvCategory.visibility = View.VISIBLE
                    holder.tvCategory.text = pending.editedCategory
                } else {
                    holder.tvCategory.visibility = View.GONE
                }

                if (pending.editedDescription.isNotBlank()) {
                    holder.tvDescription.visibility = View.VISIBLE
                    holder.tvDescription.text = pending.editedDescription
                } else {
                    holder.tvDescription.visibility = View.GONE
                }

                // Quality badge and source note
                if (pending.sourceType != DocType.IMAGE) {
                    holder.tvQualityNote.visibility = View.VISIBLE
                    holder.tvQualityNote.text = "From: ${pending.sourceFileName}"
                    holder.ivQualityBadge.visibility = View.GONE
                } else if (pending.imageWasReplaced) {
                    holder.tvQualityNote.visibility = View.VISIBLE
                    holder.tvQualityNote.text = "Better image found online"
                    holder.ivQualityBadge.visibility = View.VISIBLE
                    holder.ivQualityBadge.setImageResource(android.R.drawable.ic_dialog_info)
                } else if (pending.analysisResult != null && pending.analysisResult!!.imageQuality < 60) {
                    holder.tvQualityNote.visibility = View.VISIBLE
                    val issues = pending.analysisResult!!.qualityIssues.joinToString(", ")
                    holder.tvQualityNote.text = "Low quality image: $issues"
                } else {
                    holder.tvQualityNote.visibility = View.GONE
                    holder.ivQualityBadge.visibility = View.GONE
                }

                holder.btnEdit.visibility = View.VISIBLE
                holder.btnEdit.setOnClickListener { showEditDialog(pending) }

                holder.cbSelected.isChecked = pending.isSelected
                holder.cbSelected.setOnCheckedChangeListener { _, isChecked ->
                    pending.isSelected = isChecked
                    binding.btnSaveAll.isEnabled = pendingProducts.any { it.isSelected && it.isComplete && it.error == null }
                }
            }
        }

        override fun getItemCount() = pendingProducts.size
    }
}
