package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.*
import com.posterita.pos.android.databinding.ActivityManageListBinding
import com.posterita.pos.android.service.AiImportService
import com.posterita.pos.android.util.LocalAccountRegistry
import com.posterita.pos.android.worker.CloudSyncWorker
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class ManageBrandsActivity : BaseActivity() {

    private lateinit var binding: ActivityManageListBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var accountRegistry: LocalAccountRegistry
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    private var accounts = mutableListOf<Account>()

    /** Cached stats per account_id: products, categories, stores, DB size */
    data class BrandStats(val products: Int, val categories: Int, val stores: Int, val sizeKb: Long = 0)
    private var brandStats = mutableMapOf<String, BrandStats>()

    private val countries = listOf(
        "Mauritius", "Reunion", "South Africa", "Kenya", "Tanzania",
        "Nigeria", "India", "United Arab Emirates", "United Kingdom",
        "France", "United States", "Canada", "Australia"
    )

    private val businessTypes = listOf("Retail", "Restaurant", "Cafe", "Grocery", "Fashion", "Electronics", "Other")

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityManageListBinding.inflate(layoutInflater)
        setContentView(binding.root)
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)

        binding.tvTitle.text = "Brands"
        binding.buttonBack.setOnClickListener { finish() }

        // FAB — new brand with AI
        binding.fabAdd.visibility = View.VISIBLE
        binding.fabAdd.contentDescription = "New Brand"
        binding.fabAdd.setOnClickListener { showNewBrandDialog() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)

        // Owner-only check
        val user = sessionManager.user
        if (user != null && !user.isOwner) {
            Toast.makeText(this, "Owner access required", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        loadData()
    }

    private fun loadData() {
        binding.progressLoading.visibility = View.VISIBLE
        lifecycleScope.launch {
            // Load ALL brands from the registry (not just current DB)
            val registryAccounts = accountRegistry.getAllAccounts()

            // Build Account entities from registry + stats from each brand's DB
            // IMPORTANT: open each DB independently (not via singleton) to avoid cross-contamination
            val accountList = mutableListOf<Account>()
            withContext(Dispatchers.IO) {
                for (entry in registryAccounts) {
                    try {
                        val dbName = "${AppDatabase.DATABASE_NAME}_${entry.id}"
                        val dbFile = this@ManageBrandsActivity.getDatabasePath(dbName)

                        if (!dbFile.exists()) {
                            // No Room DB yet — just use registry info
                            accountList.add(Account(account_id = entry.id, businessname = entry.name, isactive = "Y"))
                            brandStats[entry.id] = BrandStats(0, 0, 0, 0)
                            continue
                        }

                        // Open a dedicated DB instance (NOT the singleton)
                        val brandDb = androidx.room.Room.databaseBuilder(
                            this@ManageBrandsActivity.applicationContext,
                            AppDatabase::class.java,
                            dbName
                        ).fallbackToDestructiveMigration().build()

                        try {
                            val acct = brandDb.accountDao().getAccountById(entry.id)
                            // Use registry name as override — it comes from server via sibling discovery
                            val displayName = entry.name.takeIf { it.isNotBlank() } ?: acct?.businessname ?: entry.id
                            accountList.add(
                                (acct ?: Account(account_id = entry.id, isactive = "Y"))
                                    .copy(businessname = displayName)
                            )

                            val products = brandDb.productDao().getAllProductsSync().size
                            val categories = brandDb.productCategoryDao().getAllProductCategoriesSync().size
                            val stores = brandDb.storeDao().getAllStores().size

                            val walFile = java.io.File("${dbFile.absolutePath}-wal")
                            val shmFile = java.io.File("${dbFile.absolutePath}-shm")
                            val totalBytes = dbFile.length() +
                                (if (walFile.exists()) walFile.length() else 0L) +
                                (if (shmFile.exists()) shmFile.length() else 0L)

                            brandStats[entry.id] = BrandStats(products, categories, stores, totalBytes / 1024)
                        } finally {
                            brandDb.close()
                        }
                    } catch (e: Exception) {
                        Log.w("ManageBrands", "Failed to load brand ${entry.id}", e)
                        accountList.add(Account(account_id = entry.id, businessname = entry.name, isactive = "Y"))
                        brandStats[entry.id] = BrandStats(0, 0, 0, 0)
                    }
                }
            }

            accounts = accountList
            binding.progressLoading.visibility = View.GONE
            val isEmpty = accounts.isEmpty()
            binding.layoutEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE
            binding.tvEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE
            if (isEmpty) {
                binding.tvEmpty.text = "No brand information available"
            }
            binding.recyclerView.adapter = BrandAdapter()
        }
    }

    private fun showNewBrandDialog() {
        // AI Import is web-only (via /ai-import on web console) — not available on Android
        showCreateDemoBrandDialog()
    }

    private fun showCreateDemoBrandDialog() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(60, 40, 60, 20)
        }
        val nameInput = EditText(this).apply {
            hint = "Brand name (e.g. My Demo Store)"
            inputType = android.text.InputType.TYPE_TEXT_FLAG_CAP_WORDS
            textSize = 16f
            setText("Demo Store")
        }
        layout.addView(nameInput)

        AlertDialog.Builder(this)
            .setTitle("Create Demo Brand")
            .setMessage("Creates a brand with 15 sample products (food, drinks, snacks, desserts) with images. Great for testing the POS.")
            .setView(layout)
            .setPositiveButton("Create") { _, _ ->
                val name = nameInput.text.toString().trim().ifEmpty { "Demo Store" }
                createDemoBrand(name)
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun createDemoBrand(name: String) {
        Toast.makeText(this, "Creating demo brand on server...", Toast.LENGTH_SHORT).show()
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                try {
                    val url = java.net.URL("https://web.posterita.com/api/account/create-demo")
                    val conn = url.openConnection() as java.net.HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.connectTimeout = 15_000
                    conn.readTimeout = 15_000
                    conn.doOutput = true
                    val email = prefsManager.email.let { if (it == "null" || it.isBlank()) sessionManager.user?.email ?: "" else it }
                    val phone = prefsManager.getString("owner_phone", "").let { if (it == "null") "" else it }
                    val payload = org.json.JSONObject().apply {
                        put("name", name)
                        put("owner_email", email)
                        put("phone", phone)
                        put("currency", prefsManager.getString("currency", "MUR"))
                    }
                    conn.outputStream.bufferedWriter().use { it.write(payload.toString()) }
                    if (conn.responseCode == 200) {
                        org.json.JSONObject(conn.inputStream.bufferedReader().readText())
                    } else {
                        val err = conn.errorStream?.bufferedReader()?.readText() ?: "Failed"
                        Log.e("ManageBrands", "Create demo failed: $err")
                        null
                    }
                } catch (e: Exception) {
                    Log.e("ManageBrands", "Create demo error", e)
                    null
                }
            }

            if (result == null) {
                Toast.makeText(this@ManageBrandsActivity, "Failed to create demo brand. Check your connection.", Toast.LENGTH_LONG).show()
                return@launch
            }

            val demoId = result.optString("account_id", "")
            val storeId = result.optInt("store_id", 1)
            val terminalId = result.optInt("terminal_id", 1)
            val userId = result.optInt("user_id", 1)
            val productCount = result.optInt("product_count", 0)

            // Register in local account registry
            accountRegistry.addAccount(
                id = demoId, name = name, storeName = name,
                ownerEmail = prefsManager.email, ownerPhone = "",
                type = "demo", status = "testing"
            )

            // Create local Room DB shell with account entity — sync will pull everything else
            withContext(Dispatchers.IO) {
                val activeAccountId = prefsManager.accountId
                AppDatabase.resetInstance()
                val demoDb = AppDatabase.getInstance(this@ManageBrandsActivity, demoId)

                demoDb.accountDao().insertAccounts(listOf(
                    Account(account_id = demoId, businessname = name, isactive = "Y", currency = "MUR")
                ))

                // Ensure sync timestamp is at epoch so first sync pulls everything
                val syncKey = com.posterita.pos.android.service.CloudSyncService.syncDateKey(demoId)
                prefsManager.setStringSync(syncKey, "1970-01-01T00:00:00.000Z")

                // Restore active brand DB
                AppDatabase.resetInstance()
                AppDatabase.getInstance(this@ManageBrandsActivity, activeAccountId)
            }

            // Trigger sync to pull the demo data from server
            CloudSyncWorker.syncNow(this@ManageBrandsActivity)

            Toast.makeText(this@ManageBrandsActivity, "Demo brand created with $productCount products! Syncing...", Toast.LENGTH_LONG).show()

            // Wait briefly for sync to pull, then reload
            kotlinx.coroutines.delay(5000)
            loadData()
        }
    }

    private fun showCreateAiBrandDialog() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(60, 40, 60, 20)
        }

        val nameInput = EditText(this).apply {
            hint = "Brand / business name"
            inputType = android.text.InputType.TYPE_TEXT_FLAG_CAP_WORDS
            textSize = 16f
        }
        layout.addView(nameInput)

        val typeLabel = TextView(this).apply {
            text = "Business type"
            textSize = 13f
            setPadding(0, 24, 0, 8)
            setTextColor(getColor(R.color.posterita_muted))
        }
        layout.addView(typeLabel)

        var selectedType = "Retail"
        val typeSpinner = AutoCompleteTextView(this).apply {
            setText("Retail", false)
            setAdapter(ArrayAdapter(this@ManageBrandsActivity,
                android.R.layout.simple_dropdown_item_1line, businessTypes))
            setOnItemClickListener { _, _, position, _ ->
                selectedType = businessTypes[position]
            }
            textSize = 16f
        }
        layout.addView(typeSpinner)

        val countryLabel = TextView(this).apply {
            text = "Country"
            textSize = 13f
            setPadding(0, 24, 0, 8)
            setTextColor(getColor(R.color.posterita_muted))
        }
        layout.addView(countryLabel)

        var selectedCountry = "Mauritius"
        val countrySpinner = AutoCompleteTextView(this).apply {
            setText("Mauritius", false)
            setAdapter(ArrayAdapter(this@ManageBrandsActivity,
                android.R.layout.simple_dropdown_item_1line, countries))
            setOnItemClickListener { _, _, position, _ ->
                selectedCountry = countries[position]
            }
            textSize = 16f
        }
        layout.addView(countrySpinner)

        AlertDialog.Builder(this)
            .setTitle("Create Brand with AI")
            .setMessage("AI will search the web for your business and discover products, categories, and pricing.")
            .setView(layout)
            .setPositiveButton("Create") { _, _ ->
                val name = nameInput.text.toString().trim()
                if (name.isEmpty()) {
                    Toast.makeText(this, "Please enter a brand name", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }

                // Generate a new account ID
                val newAccountId = "ai_${System.currentTimeMillis()}"

                AiImportService.start(
                    context = this,
                    urls = emptyList(),
                    businessName = name,
                    businessLocation = selectedCountry,
                    businessType = selectedType.lowercase(),
                    accountId = newAccountId,
                    accountType = "live"
                )

                Toast.makeText(this,
                    "Creating \"$name\" with AI... Check the notification for progress.",
                    Toast.LENGTH_LONG).show()
            }
            .setNegativeButton("Cancel", null)
            .show()
        nameInput.requestFocus()
    }

    private fun switchToBrand(account: Account) {
        val brandName = account.businessname ?: "Brand ${account.account_id}"
        MaterialAlertDialogBuilder(this)
            .setTitle("Switch Brand")
            .setMessage("Switch to \"$brandName\"? This will reload all data.")
            .setPositiveButton("Switch") { _, _ ->
                // Clear session state
                sessionManager.resetSession()

                // Switch account in prefs
                prefsManager.setAccountIdSync(account.account_id)
                prefsManager.setStoreNameSync(brandName)
                AppDatabase.resetInstance()

                // Save as last selected
                prefsManager.setStringSync("last_brand_id", account.account_id)

                // Load user from new DB, then navigate to Home
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) {
                        try {
                            val newDb = AppDatabase.getInstance(this@ManageBrandsActivity, account.account_id)
                            val user = newDb.userDao().getAllUsers().firstOrNull()
                            if (user != null) {
                                sessionManager.user = user
                            }
                            // Load account entity into session
                            val acct = newDb.accountDao().getAccountById(account.account_id)
                            if (acct != null) {
                                sessionManager.account = acct
                            }
                            // Load first store/terminal
                            val store = newDb.storeDao().getAllStores().firstOrNull()
                            if (store != null) {
                                sessionManager.store = store
                                prefsManager.setStoreIdSync(store.storeId)
                                prefsManager.setStoreNameSync(store.name ?: brandName)
                            }
                            val terminal = if (store != null) {
                                newDb.terminalDao().getTerminalsForStore(store.storeId).firstOrNull()
                            } else null
                            if (terminal != null) {
                                sessionManager.terminal = terminal
                                prefsManager.setTerminalIdSync(terminal.terminalId)
                                prefsManager.setTerminalNameSync(terminal.name ?: "Terminal")
                            }
                        } catch (e: Exception) {
                            Log.w("ManageBrands", "Failed to load data for brand ${account.account_id}", e)
                        }
                        Unit
                    }

                    val intent = Intent(this@ManageBrandsActivity, HomeActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    startActivity(intent)
                    finish()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun deleteBrand(account: Account) {
        val brandName = account.businessname ?: account.account_id
        val isActive = account.account_id == prefsManager.accountId

        if (isActive) {
            Toast.makeText(this, "Cannot delete the active brand. Switch to another brand first.", Toast.LENGTH_LONG).show()
            return
        }

        MaterialAlertDialogBuilder(this)
            .setTitle("Delete Brand")
            .setMessage("Delete \"$brandName\" and all its data?\n\nThis will remove:\n• All products, orders, and tills\n• Store and terminal configuration\n• Cloud data (if synced)\n\nThis cannot be undone.")
            .setPositiveButton("Delete") { _, _ ->
                lifecycleScope.launch {
                    Toast.makeText(this@ManageBrandsActivity, "Deleting brand...", Toast.LENGTH_SHORT).show()

                    withContext(Dispatchers.IO) {
                        // 1. Delete cloud data (best-effort)
                        try {
                            val url = java.net.URL("https://web.posterita.com/api/auth/reset")
                            val conn = url.openConnection() as java.net.HttpURLConnection
                            conn.requestMethod = "POST"
                            conn.setRequestProperty("Content-Type", "application/json")
                            conn.connectTimeout = 5000
                            conn.readTimeout = 5000
                            conn.doOutput = true
                            val payload = org.json.JSONObject().apply {
                                put("account_id", account.account_id)
                            }
                            conn.outputStream.bufferedWriter().use { it.write(payload.toString()) }
                            conn.responseCode
                            conn.disconnect()
                        } catch (_: Exception) {}

                        // 2. Delete local Room database
                        try {
                            val dbName = "${AppDatabase.DATABASE_NAME}_${account.account_id}"
                            this@ManageBrandsActivity.deleteDatabase(dbName)
                            val dbPath = this@ManageBrandsActivity.getDatabasePath(dbName).absolutePath
                            java.io.File("${dbPath}-wal").delete()
                            java.io.File("${dbPath}-shm").delete()
                        } catch (_: Exception) {}

                        // 3. Remove from current DB's account table
                        try {
                            db.accountDao().deleteAccountById(account.account_id)
                        } catch (_: Exception) {}

                        // 4. Remove from account registry
                        accountRegistry.removeAccount(account.account_id)
                    }

                    Toast.makeText(this@ManageBrandsActivity, "\"$brandName\" deleted", Toast.LENGTH_SHORT).show()
                    loadData()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    inner class BrandAdapter : RecyclerView.Adapter<BrandAdapter.VH>() {
        inner class VH(itemView: View) : RecyclerView.ViewHolder(itemView) {
            val card: MaterialCardView = itemView.findViewById(R.id.cardBrand)
            val tvName: TextView = itemView.findViewById(R.id.tvBrandName)
            val tvAccountId: TextView = itemView.findViewById(R.id.tvBrandAccountId)
            val tvDetails: TextView = itemView.findViewById(R.id.tvBrandDetails)
            val tvCurrency: TextView = itemView.findViewById(R.id.tvBrandCurrency)
            val tvActiveBadge: TextView = itemView.findViewById(R.id.tvActiveBadge)
            val tvWebsite: TextView = itemView.findViewById(R.id.tvBrandWebsite)
            val tvImportStatus: TextView = itemView.findViewById(R.id.tvImportStatus)
            val layoutStats: LinearLayout = itemView.findViewById(R.id.layoutStats)
            val tvProductCount: TextView = itemView.findViewById(R.id.tvProductCount)
            val tvCategoryCount: TextView = itemView.findViewById(R.id.tvCategoryCount)
            val tvStoreCount: TextView = itemView.findViewById(R.id.tvStoreCount)
            val btnSwitch: com.google.android.material.button.MaterialButton = itemView.findViewById(R.id.btnSwitchBrand)
            val btnDelete: com.google.android.material.button.MaterialButton = itemView.findViewById(R.id.btnDeleteBrand)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_brand, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val account = accounts[position]
            val isActive = account.account_id == prefsManager.accountId

            holder.tvName.text = account.businessname?.takeIf { it.isNotBlank() }
                ?: "Brand ${account.account_id}"

            holder.tvAccountId.text = "Account ID: ${account.account_id}"

            holder.tvActiveBadge.visibility = if (isActive) View.VISIBLE else View.GONE

            if (isActive) {
                holder.card.strokeColor = getColor(R.color.posterita_primary)
                holder.card.strokeWidth = 2
            } else {
                holder.card.strokeColor = getColor(R.color.posterita_line)
                holder.card.strokeWidth = 0
            }

            val addressParts = listOfNotNull(
                account.address1?.takeIf { it.isNotBlank() },
                account.city?.takeIf { it.isNotBlank() },
                account.state?.takeIf { it.isNotBlank() }
            ).joinToString(", ")
            holder.tvDetails.text = addressParts
            holder.tvDetails.visibility = if (addressParts.isNotEmpty()) View.VISIBLE else View.GONE

            holder.tvCurrency.text = if (!account.currency.isNullOrBlank()) "Currency: ${account.currency}" else ""
            holder.tvCurrency.visibility = if (!account.currency.isNullOrBlank()) View.VISIBLE else View.GONE

            holder.tvWebsite.text = if (!account.website.isNullOrBlank()) account.website else ""
            holder.tvWebsite.visibility = if (!account.website.isNullOrBlank()) View.VISIBLE else View.GONE

            // Show product/category/store stats + DB size
            val stats = brandStats[account.account_id]
            if (stats != null) {
                holder.layoutStats.visibility = View.VISIBLE
                holder.tvProductCount.text = "${stats.products} products"
                holder.tvCategoryCount.text = "${stats.categories} categories"
                val sizeStr = if (stats.sizeKb >= 1024) {
                    "${"%.1f".format(stats.sizeKb / 1024.0)} MB"
                } else {
                    "${stats.sizeKb} KB"
                }
                holder.tvStoreCount.text = "${stats.stores} stores · $sizeStr"
            } else {
                holder.layoutStats.visibility = View.GONE
            }

            // Show AI import status from registry
            val registryEntry = accountRegistry.getAccount(account.account_id)
            val importRunning = prefsManager.getString(AiImportService.PREF_IMPORT_RUNNING) == "true" &&
                prefsManager.getString(AiImportService.PREF_IMPORT_TARGET_ACCOUNT_ID) == account.account_id
            val importStatus = if (importRunning) {
                prefsManager.getString(AiImportService.PREF_IMPORT_STATUS)
            } else null
            val importStats = prefsManager.getString(AiImportService.PREF_IMPORT_STATS)
                .takeIf { prefsManager.getString(AiImportService.PREF_IMPORT_ACCOUNT_ID) == account.account_id }

            if (importRunning && !importStatus.isNullOrBlank()) {
                holder.tvImportStatus.visibility = View.VISIBLE
                holder.tvImportStatus.text = "⏳ $importStatus"
                holder.tvImportStatus.setTextColor(getColor(R.color.posterita_primary))
            } else if (!importStats.isNullOrBlank()) {
                holder.tvImportStatus.visibility = View.VISIBLE
                holder.tvImportStatus.text = "✓ AI Import: $importStats"
                holder.tvImportStatus.setTextColor(getColor(R.color.posterita_secondary))
            } else if (registryEntry?.status == "failed") {
                holder.tvImportStatus.visibility = View.VISIBLE
                holder.tvImportStatus.text = "✗ AI Import failed — tap to retry"
                holder.tvImportStatus.setTextColor(getColor(R.color.posterita_error))
            } else if (stats != null && stats.products == 0 && registryEntry?.status == "in_progress") {
                holder.tvImportStatus.visibility = View.VISIBLE
                holder.tvImportStatus.text = "⏳ AI Import in progress..."
                holder.tvImportStatus.setTextColor(getColor(R.color.posterita_primary))
            } else {
                holder.tvImportStatus.visibility = View.GONE
            }

            // Tap card to switch brand
            holder.card.setOnClickListener {
                if (!isActive) {
                    switchToBrand(account)
                }
            }

            // Retry failed import on status tap
            holder.tvImportStatus.setOnClickListener {
                if (registryEntry?.status == "failed" && !importRunning) {
                    AiImportService.resume(this@ManageBrandsActivity, prefsManager)
                    Toast.makeText(this@ManageBrandsActivity, "Retrying AI import...", Toast.LENGTH_SHORT).show()
                }
            }

            holder.btnSwitch.visibility = if (!isActive && accounts.size > 1) View.VISIBLE else View.GONE
            holder.btnSwitch.setOnClickListener {
                switchToBrand(account)
            }

            // Delete button — only for non-active demo/test/trial brands
            val registryEntryForDelete = accountRegistry.getAccount(account.account_id)
            val isDeletable = !isActive && (
                registryEntryForDelete?.type == "demo" ||
                registryEntryForDelete?.type == "trial" ||
                registryEntryForDelete?.status == "testing" ||
                registryEntryForDelete?.status == "failed" ||
                account.account_id.startsWith("demo_") ||
                account.account_id.startsWith("standalone_") ||
                account.account_id.startsWith("ai_")
            )
            holder.btnDelete.visibility = if (isDeletable) View.VISIBLE else View.GONE
            holder.btnDelete.setOnClickListener {
                deleteBrand(account)
            }
        }

        override fun getItemCount() = accounts.size
    }
}
