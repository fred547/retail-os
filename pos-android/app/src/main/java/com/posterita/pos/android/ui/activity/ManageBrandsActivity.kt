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
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Account
import com.posterita.pos.android.databinding.ActivityManageListBinding
import com.posterita.pos.android.service.AiImportService
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class ManageBrandsActivity : AppCompatActivity() {

    private lateinit var binding: ActivityManageListBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager

    private var accounts = mutableListOf<Account>()

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
            val result = withContext(Dispatchers.IO) {
                db.accountDao().getAllAccounts().toMutableList()
            }
            accounts = result
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
            .setMessage("AI will generate products, categories, and tax rates based on your business type and country.")
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

    inner class BrandAdapter : RecyclerView.Adapter<BrandAdapter.VH>() {
        inner class VH(itemView: View) : RecyclerView.ViewHolder(itemView) {
            val card: MaterialCardView = itemView.findViewById(R.id.cardBrand)
            val tvName: TextView = itemView.findViewById(R.id.tvBrandName)
            val tvAccountId: TextView = itemView.findViewById(R.id.tvBrandAccountId)
            val tvDetails: TextView = itemView.findViewById(R.id.tvBrandDetails)
            val tvCurrency: TextView = itemView.findViewById(R.id.tvBrandCurrency)
            val tvActiveBadge: TextView = itemView.findViewById(R.id.tvActiveBadge)
            val tvWebsite: TextView = itemView.findViewById(R.id.tvBrandWebsite)
            val btnSwitch: com.google.android.material.button.MaterialButton = itemView.findViewById(R.id.btnSwitchBrand)
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

            holder.btnSwitch.visibility = if (!isActive && accounts.size > 1) View.VISIBLE else View.GONE
            holder.btnSwitch.setOnClickListener {
                switchToBrand(account)
            }
        }

        override fun getItemCount() = accounts.size
    }
}
