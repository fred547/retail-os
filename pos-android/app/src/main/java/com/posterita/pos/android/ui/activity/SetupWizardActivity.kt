package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.AutoCompleteTextView
import android.widget.ArrayAdapter
import android.widget.LinearLayout
import android.widget.RadioGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.progressindicator.CircularProgressIndicator
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.*
import com.posterita.pos.android.databinding.ActivitySetupWizardBinding
import com.posterita.pos.android.service.AiImportService
import com.posterita.pos.android.util.DemoDataSeeder
import com.posterita.pos.android.util.LocalAccountRegistry
import com.posterita.pos.android.util.SharedPreferencesManager
import com.posterita.pos.android.util.WebsiteSetupService
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

/**
 * SetupWizardActivity — 7-step onboarding flow.
 *
 * Flow:
 *   Welcome → Phone → OTP Verify → Name → Brand → Country → Category →
 *   AI Building (infers business type, discovers stores, seeds demo, queues import)
 *   → finishWizard → Home
 */
@AndroidEntryPoint
class SetupWizardActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySetupWizardBinding

    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var accountRegistry: LocalAccountRegistry
    @Inject lateinit var demoSeeder: DemoDataSeeder
    @Inject lateinit var websiteSetupService: WebsiteSetupService

    private var currentStep = 0
    private var websiteSetupResult: WebsiteSetupService.StoreSetupResult? = null

    // ── Collected values ──────────────────────────────────────
    private var collectedEmail = ""
    private var collectedPassword = ""
    private var collectedPhone = ""
    private var collectedName = ""
    private var collectedBrand = ""
    private var collectedCountry = ""
    private var collectedCategory = ""

    data class StepInfo(
        val title: String,
        val description: String,
        val layoutRes: Int
    )

    private val steps = listOf(
        StepInfo("Welcome", "Set up your point of sale system", R.layout.setup_step_welcome),
        StepInfo("Create Account", "Your login details", R.layout.setup_step_signup),
        StepInfo("Your Name", "Tell us who you are", R.layout.setup_step_name),
        StepInfo("Brand Name", "Name your business", R.layout.setup_step_brand),
        StepInfo("Country", "Where do you operate?", R.layout.setup_step_country),
        StepInfo("Category", "What do you sell?", R.layout.setup_step_category),
        StepInfo("Setting Up", "AI is building your store", R.layout.setup_step_ai_building)
    )

    private var aiBuildingComplete = false
    private var isOnline = false
    private var discoveredStoreCount = 1

    private data class CountryInfo(
        val name: String,
        val dialCode: String,
        val currency: String,
        val taxName: String,
        val taxRate: Double
    ) {
        override fun toString(): String = name
    }

    private val countries = listOf(
        CountryInfo("Mauritius", "+230", "MUR", "VAT", 15.0),
        CountryInfo("Reunion", "+262", "EUR", "TVA", 8.5),
        CountryInfo("South Africa", "+27", "ZAR", "VAT", 15.0),
        CountryInfo("Kenya", "+254", "KES", "VAT", 16.0),
        CountryInfo("Tanzania", "+255", "TZS", "VAT", 18.0),
        CountryInfo("Nigeria", "+234", "NGN", "VAT", 7.5),
        CountryInfo("India", "+91", "INR", "GST", 18.0),
        CountryInfo("United Arab Emirates", "+971", "AED", "VAT", 5.0),
        CountryInfo("United Kingdom", "+44", "GBP", "VAT", 20.0),
        CountryInfo("France", "+33", "EUR", "TVA", 20.0),
        CountryInfo("United States", "+1", "USD", "Tax", 0.0),
        CountryInfo("Canada", "+1", "CAD", "GST", 5.0),
        CountryInfo("Australia", "+61", "AUD", "GST", 10.0)
    )

    private var selectedCountry = countries.first() // default Mauritius

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySetupWizardBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.toolbar.setNavigationOnClickListener { confirmCancelSetup() }
        binding.btnBack.setOnClickListener { goBack() }
        binding.btnNext.setOnClickListener { goNext() }

        checkInternetStatus()
        binding.layoutInternetIndicator.setOnClickListener { checkInternetStatus() }

        showStep(0)
    }

    // ─── Step Navigation ─────────────────────────────────────

    private fun showStep(step: Int) {
        currentStep = step
        val info = steps[step]
        val totalSteps = steps.size

        val isWelcome = step == 0
        val isAutoStep = info.layoutRes == R.layout.setup_step_ai_building
        val chromeVisibility = if (isWelcome) View.GONE else View.VISIBLE

        binding.appBarLayout.visibility = chromeVisibility
        binding.progressBar.visibility = chromeVisibility
        binding.tvStepIndicator.visibility = chromeVisibility
        binding.tvStepTitle.visibility = chromeVisibility
        binding.tvStepDescription.visibility = chromeVisibility
        binding.dividerTop.visibility = chromeVisibility
        binding.dividerBottom.visibility = if (isWelcome) View.GONE else View.VISIBLE
        binding.layoutButtons.visibility = if (isWelcome) View.GONE else View.VISIBLE

        if (!isWelcome) {
            binding.progressBar.max = totalSteps
            binding.progressBar.progress = step + 1
            binding.tvStepIndicator.text = "Step ${step} of ${totalSteps - 1}"
            binding.tvStepTitle.text = info.title
            binding.tvStepDescription.text = info.description
        }

        binding.btnNext.text = if (isWelcome) "Get Started" else "Next"

        if (isWelcome) {
            binding.btnNext.visibility = View.GONE
            binding.btnBack.visibility = View.GONE
        } else {
            binding.btnNext.visibility = if (isAutoStep) View.GONE else View.VISIBLE
            binding.btnBack.visibility = when {
                isAutoStep -> View.GONE
                step == 1 -> View.INVISIBLE
                else -> View.VISIBLE
            }
        }

        binding.contentFrame.removeAllViews()
        val contentView = LayoutInflater.from(this).inflate(info.layoutRes, binding.contentFrame, false)
        binding.contentFrame.addView(contentView)

        when (info.layoutRes) {
            R.layout.setup_step_welcome -> setupWelcomeStep(contentView)
            R.layout.setup_step_signup -> setupSignupStep(contentView)
            R.layout.setup_step_name -> setupNameStep(contentView)
            R.layout.setup_step_brand -> setupBrandStep(contentView)
            R.layout.setup_step_country -> setupCountryStep(contentView)
            R.layout.setup_step_category -> setupCategoryStep(contentView)
            R.layout.setup_step_ai_building -> setupAiBuildingStep(contentView)
        }
    }

    private fun goNext() {
        if (!validateCurrentStep()) return
        if (currentStep < steps.size - 1) showStep(currentStep + 1) else finishWizard()
    }

    private fun goBack() {
        if (currentStep > 0) showStep(currentStep - 1)
    }

    private fun validateCurrentStep(): Boolean {
        val info = steps[currentStep]
        return when (info.layoutRes) {
            R.layout.setup_step_signup -> validateSignupStep()
            R.layout.setup_step_name -> validateNameStep()
            R.layout.setup_step_brand -> validateBrandStep()
            R.layout.setup_step_country -> validateCountryStep()
            R.layout.setup_step_category -> validateCategoryStep()
            else -> true
        }
    }

    private fun setupWelcomeStep(view: View) {
        // Sign Up → new owner onboarding
        view.findViewById<MaterialButton>(R.id.btnSignUp)?.setOnClickListener {
            goNext()
        }

        // Owner Log In → email + password
        view.findViewById<MaterialButton>(R.id.btnLogIn)?.setOnClickListener {
            startActivity(Intent(this, LoginActivity::class.java))
        }

        // Enroll Device → scan QR to set up for a store
        view.findViewById<MaterialButton>(R.id.btnEnrollDevice)?.setOnClickListener {
            // Phase 1: will open camera to scan enrollment QR
            // For now, show placeholder
            Toast.makeText(this, "Device enrollment requires a QR code from the store owner. Coming in Phase 1.", Toast.LENGTH_LONG).show()
        }

        // Try Demo → load demo and go to home
        view.findViewById<MaterialButton>(R.id.btnTryDemo)?.setOnClickListener {
            it.isEnabled = false
            (it as MaterialButton).text = "Loading demo..."
            lifecycleScope.launch {
                withContext(Dispatchers.IO) {
                    demoSeeder.activateDemoAccount()
                }
                restartApp()
            }
        }
    }

    private fun restartApp() {
        val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        startActivity(intent)
        finish()
        Runtime.getRuntime().exit(0)
    }

    // ─── Sign Up (email + password) ─────────────────────────

    private fun setupSignupStep(view: View) {
        val etEmail = view.findViewById<TextInputEditText>(R.id.etEmail)
        val etPassword = view.findViewById<TextInputEditText>(R.id.etPassword)
        val etPhone = view.findViewById<TextInputEditText>(R.id.etPhone)
        if (collectedEmail.isNotEmpty()) etEmail.setText(collectedEmail)
        if (collectedPhone.isNotEmpty()) etPhone.setText(collectedPhone)
        etEmail.requestFocus()
    }

    private fun validateSignupStep(): Boolean {
        val email = binding.contentFrame.findViewById<TextInputEditText>(R.id.etEmail)
            ?.text?.toString()?.trim() ?: ""
        val password = binding.contentFrame.findViewById<TextInputEditText>(R.id.etPassword)
            ?.text?.toString() ?: ""
        val confirmPassword = binding.contentFrame.findViewById<TextInputEditText>(R.id.etPasswordConfirm)
            ?.text?.toString() ?: ""
        val phone = binding.contentFrame.findViewById<TextInputEditText>(R.id.etPhone)
            ?.text?.toString()?.trim() ?: ""

        if (email.isEmpty()) { toast("Email is required"); return false }
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            toast("Please enter a valid email"); return false
        }
        if (password.length < 6) { toast("Password must be at least 6 characters"); return false }
        if (password != confirmPassword) { toast("Passwords don't match"); return false }

        collectedEmail = email
        collectedPassword = password
        collectedPhone = phone
        return true
    }

    // ─── Name ────────────────────────────────────────────────

    private fun setupNameStep(view: View) {
        val etName = view.findViewById<TextInputEditText>(R.id.etName)
        if (collectedName.isNotEmpty()) etName.setText(collectedName)
        etName.requestFocus()
    }

    private fun validateNameStep(): Boolean {
        val name = binding.contentFrame.findViewById<TextInputEditText>(R.id.etName)
            ?.text?.toString()?.trim() ?: ""
        if (name.isEmpty()) { toast("Please enter your name"); return false }
        collectedName = name
        return true
    }

    // ─── Brand ───────────────────────────────────────────────

    private fun setupBrandStep(view: View) {
        val etBrand = view.findViewById<TextInputEditText>(R.id.etBrand)
        if (collectedBrand.isNotEmpty()) etBrand.setText(collectedBrand)
        etBrand.requestFocus()
    }

    private fun validateBrandStep(): Boolean {
        val brand = binding.contentFrame.findViewById<TextInputEditText>(R.id.etBrand)
            ?.text?.toString()?.trim() ?: ""
        if (brand.isEmpty()) { toast("Please enter your brand name"); return false }
        collectedBrand = brand
        return true
    }

    // ─── Country ─────────────────────────────────────────────

    private fun setupCountryStep(view: View) {
        val autoCountry = view.findViewById<AutoCompleteTextView>(R.id.autoCountry)
        val adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, countries)
        autoCountry.setAdapter(adapter)
        autoCountry.setText(selectedCountry.name, false)
        autoCountry.setOnClickListener { autoCountry.showDropDown() }
        autoCountry.setOnItemClickListener { _, _, position, _ ->
            selectedCountry = adapter.getItem(position) ?: selectedCountry
        }
    }

    private fun validateCountryStep(): Boolean {
        collectedCountry = selectedCountry.name
        return true
    }

    // ─── Product Category ────────────────────────────────────

    private fun setupCategoryStep(view: View) {
        val radioGroup = view.findViewById<RadioGroup>(R.id.radioGroupCategory)
        val tilOther = view.findViewById<TextInputLayout>(R.id.tilOtherCategory)
        val etOther = view.findViewById<TextInputEditText>(R.id.etOtherCategory)

        when (collectedCategory) {
            "Fashion & Apparel" -> radioGroup.check(R.id.rbFashion)
            "Footwear" -> radioGroup.check(R.id.rbFootwear)
            "Electronics" -> radioGroup.check(R.id.rbElectronics)
            "Food & Beverage" -> radioGroup.check(R.id.rbFood)
            "Health & Beauty" -> radioGroup.check(R.id.rbHealth)
            "Sports & Outdoor" -> radioGroup.check(R.id.rbSports)
            "Home & Living" -> radioGroup.check(R.id.rbHome)
            else -> {
                if (collectedCategory.isNotEmpty()) {
                    radioGroup.check(R.id.rbOther)
                    tilOther.visibility = View.VISIBLE
                    etOther.setText(collectedCategory)
                }
            }
        }

        radioGroup.setOnCheckedChangeListener { _, checkedId ->
            tilOther.visibility = if (checkedId == R.id.rbOther) View.VISIBLE else View.GONE
        }
    }

    private fun validateCategoryStep(): Boolean {
        val radioGroup = binding.contentFrame.findViewById<RadioGroup>(R.id.radioGroupCategory)
        val checkedId = radioGroup.checkedRadioButtonId
        if (checkedId == -1) { toast("Please select a category"); return false }

        collectedCategory = when (checkedId) {
            R.id.rbFashion -> "Fashion & Apparel"
            R.id.rbFootwear -> "Footwear"
            R.id.rbElectronics -> "Electronics"
            R.id.rbFood -> "Food & Beverage"
            R.id.rbHealth -> "Health & Beauty"
            R.id.rbSports -> "Sports & Outdoor"
            R.id.rbHome -> "Home & Living"
            R.id.rbOther -> {
                val other = binding.contentFrame.findViewById<TextInputEditText>(R.id.etOtherCategory)
                    ?.text?.toString()?.trim() ?: ""
                if (other.isEmpty()) { toast("Please describe what you sell"); return false }
                other
            }
            else -> ""
        }
        return true
    }

    // ─── AI Building Step ────────────────────────────────────

    private fun inferBusinessType(category: String): String {
        val foodKeywords = listOf("food", "beverage", "restaurant", "cafe", "coffee", "bar", "bakery", "pizza", "kitchen")
        return if (foodKeywords.any { category.contains(it, ignoreCase = true) }) "restaurant" else "retail"
    }

    private fun setupAiBuildingStep(view: View) {
        val tvTitle = view.findViewById<TextView>(R.id.tvAiBuildingTitle)
        val progressStore = view.findViewById<CircularProgressIndicator>(R.id.progressStore)
        val tvStatusStore = view.findViewById<TextView>(R.id.tvStatusStore)

        tvTitle.text = "Setting up $collectedBrand"
        tvStatusStore.text = "Creating your account..."
        progressStore.visibility = View.VISIBLE

        val businessType = inferBusinessType(collectedCategory)
        prefsManager.businessType = businessType

        lifecycleScope.launch {
            try {
                val currency = selectedCountry.currency

                // Try server signup first (creates 2 brands: live + demo)
                var accountId: String? = null
                var demoAccountId: String? = null

                if (isOnline) {
                    withContext(Dispatchers.IO) {
                        try {
                            val result = callSignupApi(currency)
                            accountId = result?.optString("live_account_id")
                            demoAccountId = result?.optString("demo_account_id")
                        } catch (e: Exception) {
                            android.util.Log.w("SetupWizard", "Server signup failed, falling back to local", e)
                        }
                    }
                }

                // Fallback to local if server signup failed
                if (accountId.isNullOrEmpty()) {
                    accountId = "standalone_${System.currentTimeMillis()}"
                }

                val finalAccountId = accountId!!

                withContext(Dispatchers.IO) {
                    prefsManager.setAccountIdSync(finalAccountId)
                    AppDatabase.resetInstance()
                    val freshDb = AppDatabase.getInstance(this@SetupWizardActivity, finalAccountId)

                    // Account
                    freshDb.accountDao().insertAccounts(listOf(
                        Account(account_id = finalAccountId, businessname = collectedBrand,
                            address1 = collectedCountry, isactive = "Y", currency = currency)
                    ))

                    // Store
                    freshDb.storeDao().insertStore(
                        Store(storeId = 1, name = collectedBrand, address = "",
                            country = selectedCountry.name, currency = currency, isactive = "Y")
                    )
                    prefsManager.setStoreIdSync(1)
                    prefsManager.setStoreNameSync(collectedBrand)

                    freshDb.terminalDao().insertTerminal(
                        Terminal(terminalId = 1, name = "POS 1", store_id = 1, prefix = "INV", isactive = "Y")
                    )
                    prefsManager.setTerminalIdSync(1)
                    prefsManager.setTerminalNameSync("POS 1")

                    // Owner
                    freshDb.userDao().insertUser(User(
                        user_id = 1, firstname = collectedName, lastname = "",
                        username = collectedEmail, pin = collectedPassword, password = collectedPassword,
                        isadmin = "Y", isactive = "Y", issalesrep = "Y",
                        role = User.ROLE_OWNER, email = collectedEmail, phone1 = collectedPhone
                    ))

                    prefsManager.setEmailSync(collectedEmail)
                    prefsManager.setOwnerPhoneSync(collectedPhone)
                    prefsManager.setStringSync("setup_mode", "standalone")
                    prefsManager.setStringSync("currency", currency)

                    // Store demo account ID if we got one from server
                    if (!demoAccountId.isNullOrEmpty()) {
                        prefsManager.setStringSync("demo_account_id", demoAccountId!!)
                    }

                    // Seed demo products locally — POS works immediately
                    demoSeeder.seedDemoProducts(freshDb, collectedCategory)

                    accountRegistry.addAccount(
                        id = finalAccountId, name = collectedBrand, storeName = collectedBrand,
                        ownerEmail = collectedEmail, ownerPhone = collectedPhone,
                        type = "live", status = "onboarding"
                    )

                    // Register demo brand too if server created it
                    if (!demoAccountId.isNullOrEmpty()) {
                        accountRegistry.addAccount(
                            id = demoAccountId!!, name = "${collectedName}'s Demo",
                            storeName = "${collectedName}'s Demo Store",
                            ownerEmail = collectedEmail, ownerPhone = collectedPhone,
                            type = "demo", status = "testing"
                        )
                    }
                }

                // Queue AI in background — don't wait
                if (isOnline && websiteSetupService.isConfigured()) {
                    withContext(Dispatchers.IO) {
                        try {
                            AiImportService.queueStart(
                                prefs = prefsManager, urls = emptyList(),
                                businessName = collectedBrand, businessLocation = collectedCountry,
                                businessType = businessType, accountId = finalAccountId,
                                ownerEmail = collectedEmail, ownerPhone = collectedPhone,
                                accountType = "live"
                            )
                        } catch (e: Exception) {
                            android.util.Log.w("SetupWizard", "AI queue failed, continuing", e)
                        }
                    }
                }

                // Go straight to home
                finishWizard()

            } catch (e: Exception) {
                android.util.Log.e("SetupWizard", "Account creation failed", e)
                val tvError = view.findViewById<TextView>(R.id.tvAiBuildingError)
                tvError.text = "Setup failed: ${e.message ?: "Unknown error"}"
                tvError.visibility = View.VISIBLE
                binding.btnNext.visibility = View.VISIBLE
                binding.btnNext.text = "Retry"
                binding.btnBack.visibility = View.VISIBLE
            }
        }
    }

    private suspend fun seedAiData(
        freshDb: AppDatabase,
        data: WebsiteSetupService.StoreSetupResult
    ) {
        // Use country's tax info, or AI-detected
        val taxRate = if (data.taxRate > 0) data.taxRate else selectedCountry.taxRate
        val taxName = data.taxName.orEmpty().ifEmpty { selectedCountry.taxName }

        val taxId = 1
        freshDb.taxDao().insertTax(
            Tax(tax_id = taxId, name = "$taxName ${taxRate.toInt()}%",
                rate = taxRate, taxcode = taxName.uppercase().replace(" ", "").ifEmpty { "TAX" },
                isactive = "Y")
        )
        freshDb.taxDao().insertTax(
            Tax(tax_id = 2, name = "No Tax", rate = 0.0, taxcode = "NONE", isactive = "Y")
        )

        var categoryId = 1
        var productId = 100 // start at 100 to not conflict with demo products

        for (catData in data.categories) {
            if (catData.name.isNullOrBlank()) continue

            freshDb.productCategoryDao().insertProductCategory(
                ProductCategory(
                    productcategory_id = categoryId + 10, // offset to not conflict with demo
                    name = catData.name,
                    isactive = "Y",
                    position = categoryId + 10
                )
            )

            val products = catData.products.map { prodData ->
                val taxAmount = if (taxRate > 0) prodData.price * taxRate / 100.0 else 0.0
                Product(
                    product_id = productId++,
                    name = prodData.name,
                    sellingprice = prodData.price,
                    costprice = 0.0,
                    productcategory_id = categoryId + 10,
                    tax_id = if (taxRate > 0) taxId else 2,
                    taxamount = taxAmount,
                    isactive = "Y",
                    description = prodData.description,
                    image = prodData.imageUrl?.ifEmpty { null },
                    iskitchenitem = if (inferBusinessType(collectedCategory) == "restaurant") "Y" else "N"
                )
            }
            if (products.isNotEmpty()) {
                freshDb.productDao().insertProducts(products)
            }
            categoryId++
        }
    }

    // ─── Internet Check ──────────────────────────────────────

    private fun checkInternetStatus() {
        val dot = binding.viewInternetDot
        val label = binding.tvInternetLabel
        label.text = "Checking..."
        dot.background.setTint(0xFF888888.toInt())

        lifecycleScope.launch {
            isOnline = withContext(Dispatchers.IO) {
                try {
                    val url = java.net.URL("https://api.anthropic.com")
                    val conn = url.openConnection() as java.net.HttpURLConnection
                    conn.connectTimeout = 5000
                    conn.readTimeout = 5000
                    conn.requestMethod = "HEAD"
                    conn.connect()
                    conn.disconnect()
                    true
                } catch (e: Exception) {
                    false
                }
            }
            if (isOnline) {
                dot.background.setTint(0xFF4CAF50.toInt())
                label.text = "Online"
                label.setTextColor(0xFF4CAF50.toInt())
            } else {
                dot.background.setTint(0xFFF44336.toInt())
                label.text = "Offline"
                label.setTextColor(0xFFF44336.toInt())
            }
        }
    }

    // ─── Cancel / Finish ─────────────────────────────────────

    private fun confirmCancelSetup() {
        AlertDialog.Builder(this)
            .setTitle("Cancel Setup?")
            .setMessage("Are you sure you want to cancel?")
            .setPositiveButton("Cancel Setup") { _, _ -> finish() }
            .setNegativeButton("Continue", null)
            .show()
    }

    /**
     * Calls the signup API to create 2 brands on the server (live + demo).
     * Returns the JSON response or null on failure.
     */
    private fun callSignupApi(currency: String): org.json.JSONObject? {
        val url = java.net.URL("https://posterita-cloud.vercel.app/api/auth/signup")
        val conn = url.openConnection() as java.net.HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.connectTimeout = 10_000
        conn.readTimeout = 10_000
        conn.doOutput = true

        val payload = org.json.JSONObject().apply {
            put("phone", collectedPhone)
            put("email", collectedEmail)
            put("firstname", collectedName)
            put("businessname", collectedBrand)
            put("country", collectedCountry)
            put("currency", currency)
        }

        java.io.OutputStreamWriter(conn.outputStream).use { writer ->
            writer.write(payload.toString())
            writer.flush()
        }

        return if (conn.responseCode == 200) {
            val response = conn.inputStream.bufferedReader().readText()
            org.json.JSONObject(response)
        } else {
            val errorBody = try { conn.errorStream?.bufferedReader()?.readText() } catch (_: Exception) { null }
            android.util.Log.w("SetupWizard", "Signup API failed: ${conn.responseCode} $errorBody")
            null
        }
    }

    private fun finishWizard() {
        prefsManager.setString("setup_completed", "true")
        restartApp()
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
}
