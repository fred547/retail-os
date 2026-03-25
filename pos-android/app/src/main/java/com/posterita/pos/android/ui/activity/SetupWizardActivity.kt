package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.AutoCompleteTextView
import android.widget.ArrayAdapter
import android.widget.RadioGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
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
import com.posterita.pos.android.util.AppErrorLogger
import com.posterita.pos.android.util.DemoDataSeeder
import com.posterita.pos.android.util.LocalAccountRegistry
import com.posterita.pos.android.util.SharedPreferencesManager
import com.posterita.pos.android.util.ConnectivityMonitor
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.withTimeoutOrNull
import com.posterita.pos.android.util.SessionTimeoutManager
import com.posterita.pos.android.util.WebsiteSetupService
import com.posterita.pos.android.worker.CloudSyncWorker
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

/**
 * SetupWizardActivity — online-first onboarding flow.
 *
 * Flow:
 *   Welcome → Create Account (email + password + phone) → Name → Brand →
 *   Country → Category → PIN → Setting Up (server signup + sync) →
 *   Review Products → Home
 *
 * Requires internet. No standalone/offline fallback.
 */
@AndroidEntryPoint
class SetupWizardActivity : BaseActivity() {

    companion object {
        private const val REQUEST_CODE_ENROLL = 9001
    }

    private lateinit var binding: ActivitySetupWizardBinding

    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var accountRegistry: LocalAccountRegistry
    @Inject lateinit var demoSeeder: DemoDataSeeder
    @Inject lateinit var websiteSetupService: WebsiteSetupService
    @Inject lateinit var connectivityMonitor: ConnectivityMonitor

    private var currentStep = 0

    // ── Collected values ──────────────────────────────────────
    private var collectedEmail = ""
    private var collectedPassword = ""
    private var collectedPhone = ""
    private var collectedName = ""
    private var collectedBrand = ""
    private var collectedCountry = ""
    private var collectedCategory = ""
    private var collectedPin = ""

    // ── Server response ───────────────────────────────────────
    private var serverAccountId: String? = null
    private var serverDemoAccountId: String? = null

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
        StepInfo("Set PIN", "Quick unlock for your POS", R.layout.setup_step_pin),
        StepInfo("Setting Up", "Creating your account on the server", R.layout.setup_step_ai_building),
        StepInfo("Your Products", "Review what we set up for you", R.layout.setup_step_complete)
    )

    private var isOnline = false

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

        // Reactive connectivity — updates dot + label in real-time
        connectivityMonitor.isConnected.observe(this) { connected ->
            isOnline = connected
            val dot = binding.viewInternetDot
            val label = binding.tvInternetLabel
            if (connected) {
                dot.background.setTint(0xFF4CAF50.toInt())
                label.text = "Online"
                label.setTextColor(0xFF4CAF50.toInt())
            } else {
                dot.background.setTint(0xFFF44336.toInt())
                label.text = "Offline"
                label.setTextColor(0xFFF44336.toInt())
            }
        }

        showStep(0)
    }

    // ─── Step Navigation ─────────────────────────────────────

    private fun showStep(step: Int) {
        currentStep = step
        val info = steps[step]
        val totalSteps = steps.size

        val isWelcome = step == 0
        val isAutoStep = info.layoutRes == R.layout.setup_step_ai_building
        val isReviewStep = info.layoutRes == R.layout.setup_step_complete
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

        if (isWelcome) {
            binding.btnNext.visibility = View.GONE
            binding.btnBack.visibility = View.GONE
        } else if (isAutoStep) {
            binding.btnNext.visibility = View.GONE
            binding.btnBack.visibility = View.GONE
        } else if (isReviewStep) {
            binding.btnNext.visibility = View.VISIBLE
            binding.btnNext.text = "Start Selling"
            binding.btnBack.visibility = View.GONE
        } else {
            binding.btnNext.visibility = View.VISIBLE
            binding.btnNext.text = "Next"
            binding.btnBack.visibility = if (step == 1) View.INVISIBLE else View.VISIBLE
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
            R.layout.setup_step_pin -> setupPinStep(contentView)
            R.layout.setup_step_ai_building -> setupServerCreationStep(contentView)
            R.layout.setup_step_complete -> setupReviewStep(contentView)
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
            R.layout.setup_step_pin -> validatePinStep()
            else -> true
        }
    }

    private fun setupWelcomeStep(view: View) {
        // Sign Up → new owner onboarding
        view.findViewById<MaterialButton>(R.id.btnSignUp)?.setOnClickListener {
            if (!isOnline) {
                toast("Internet connection required to create an account")
                checkInternetStatus()
                return@setOnClickListener
            }
            goNext()
        }

        // Owner Log In → email + password
        view.findViewById<MaterialButton>(R.id.btnLogIn)?.setOnClickListener {
            // If there's already an owner with a PIN on this device, go to PIN screen
            lifecycleScope.launch {
                val restoredEntry = withContext(Dispatchers.IO) {
                    for (entry in accountRegistry.getAllAccounts()) {
                        val dbName = "${AppDatabase.DATABASE_NAME}_${entry.id}"
                        val dbFile = this@SetupWizardActivity.getDatabasePath(dbName)
                        if (!dbFile.exists()) continue
                        try {
                            val brandDb = androidx.room.Room.databaseBuilder(
                                this@SetupWizardActivity.applicationContext,
                                AppDatabase::class.java, dbName
                            ).fallbackToDestructiveMigration().build()
                            try {
                                val user = brandDb.userDao().getAllUsers().firstOrNull()
                                if (user != null && !user.pin.isNullOrEmpty()) {
                                    return@withContext entry
                                }
                            } finally {
                                brandDb.close()
                            }
                        } catch (_: Exception) {}
                    }
                    null
                }

                if (restoredEntry != null) {
                    // Restore this account as active and go to PIN screen
                    prefsManager.setAccountIdSync(restoredEntry.id)
                    prefsManager.setStringSync("setup_completed", "true")
                    AppDatabase.resetInstance()
                    SessionTimeoutManager.lock()
                    val intent = Intent(this@SetupWizardActivity, LockScreenActivity::class.java)
                    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    startActivity(intent)
                    finish()
                } else {
                    // No local user with PIN — need email+password login
                    startActivity(Intent(this@SetupWizardActivity, LoginActivity::class.java))
                }
            }
        }

        // Enroll Device → scan QR to set up for a store
        view.findViewById<MaterialButton>(R.id.btnEnrollDevice)?.setOnClickListener {
            val scanIntent = Intent(this, ScanBarcodeActivity::class.java)
            scanIntent.putExtra("EXTRA_MODE", "enroll")
            @Suppress("DEPRECATION")
            startActivityForResult(scanIntent, REQUEST_CODE_ENROLL)
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

    private var selectedDialCode = "+230" // default Mauritius

    private var signupEmailExists = false
    private var signupPhoneExists = false

    private fun setupSignupStep(view: View) {
        val etEmail = view.findViewById<TextInputEditText>(R.id.etEmail)
        val etPassword = view.findViewById<TextInputEditText>(R.id.etPassword)
        val etPhone = view.findViewById<TextInputEditText>(R.id.etPhone)
        val tvCountryCode = view.findViewById<android.widget.TextView>(R.id.tvCountryCode)
        val btnCountryCode = view.findViewById<View>(R.id.btnCountryCode)
        val tvError = view.findViewById<android.widget.TextView>(R.id.tvSignupError)
        val tvSignIn = view.findViewById<android.widget.TextView>(R.id.tvSignInLink)
        val emailLayout = etEmail?.parent?.parent as? com.google.android.material.textfield.TextInputLayout
        val phoneLayout = etPhone?.parent?.parent as? com.google.android.material.textfield.TextInputLayout

        // Pre-populate email from Google account if not yet collected
        if (collectedEmail.isEmpty()) {
            try {
                val am = android.accounts.AccountManager.get(this)
                val googleAccounts = am.getAccountsByType("com.google")
                if (googleAccounts.isNotEmpty()) {
                    collectedEmail = googleAccounts[0].name
                }
            } catch (_: Exception) {}
        }

        if (collectedEmail.isNotEmpty()) etEmail.setText(collectedEmail)
        if (collectedPhone.isNotEmpty()) etPhone.setText(collectedPhone)

        // Real-time email uniqueness check on focus loss
        etEmail.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) {
                val email = etEmail.text?.toString()?.trim() ?: ""
                if (email.isNotEmpty() && android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
                    checkFieldUniqueness(email, "", emailLayout, null, tvError, tvSignIn)
                }
            }
        }

        // Real-time phone uniqueness check on focus loss
        etPhone.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) {
                val phone = etPhone.text?.toString()?.trim() ?: ""
                if (phone.isNotEmpty()) {
                    val fullPhone = if (!phone.startsWith("+")) "$selectedDialCode$phone" else phone
                    checkFieldUniqueness("", fullPhone, null, phoneLayout, tvError, tvSignIn)
                }
            }
        }

        // Sign in link
        tvSignIn?.setOnClickListener {
            val intent = Intent(this, LoginActivity::class.java)
            intent.putExtra("email", etEmail.text?.toString()?.trim() ?: "")
            startActivity(intent)
            finish()
        }

        // Detect device locale and default country code
        val deviceCountryCode = try {
            val tm = getSystemService(android.content.Context.TELEPHONY_SERVICE) as? android.telephony.TelephonyManager
            val simCountry = tm?.simCountryIso?.uppercase()
                ?: tm?.networkCountryIso?.uppercase()
                ?: java.util.Locale.getDefault().country
            countryIsoToDialCode(simCountry)
        } catch (_: Exception) {
            "+230" // fallback to Mauritius
        }
        selectedDialCode = deviceCountryCode
        tvCountryCode?.text = selectedDialCode

        // Also pre-select the country for the Country step
        val matchedCountry = countries.find { it.dialCode == selectedDialCode }
        if (matchedCountry != null) selectedCountry = matchedCountry

        // Country code picker
        btnCountryCode?.setOnClickListener {
            val items = countries.map { "${it.name} (${it.dialCode})" }.toTypedArray()
            val currentIndex = countries.indexOfFirst { it.dialCode == selectedDialCode }.coerceAtLeast(0)
            androidx.appcompat.app.AlertDialog.Builder(this)
                .setTitle("Select country")
                .setSingleChoiceItems(items, currentIndex) { dialog, which ->
                    val selected = countries[which]
                    selectedDialCode = selected.dialCode
                    tvCountryCode?.text = selectedDialCode
                    selectedCountry = selected
                    dialog.dismiss()
                }
                .show()
        }

        etEmail.requestFocus()
    }

    /** Calls /api/auth/check to see if email or phone already exists */
    private fun checkFieldUniqueness(
        email: String,
        phone: String,
        emailLayout: com.google.android.material.textfield.TextInputLayout?,
        phoneLayout: com.google.android.material.textfield.TextInputLayout?,
        tvError: android.widget.TextView?,
        tvSignIn: android.widget.TextView?
    ) {
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                try {
                    val url = java.net.URL("https://web.posterita.com/api/auth/check")
                    val conn = url.openConnection() as java.net.HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.connectTimeout = 5000
                    conn.readTimeout = 5000
                    conn.doOutput = true
                    val payload = org.json.JSONObject().apply {
                        if (email.isNotEmpty()) put("email", email)
                        if (phone.isNotEmpty()) put("phone", phone)
                    }
                    conn.outputStream.bufferedWriter().use { it.write(payload.toString()) }
                    if (conn.responseCode == 200) {
                        org.json.JSONObject(conn.inputStream.bufferedReader().readText())
                    } else null
                } catch (_: Exception) { null }
            }

            val exists = result?.optBoolean("exists", false) ?: false
            val matchedOn = result?.optString("matched_on", "") ?: ""

            if (exists && matchedOn == "email") {
                signupEmailExists = true
                emailLayout?.error = "This email is already registered"
                tvError?.text = "An account with this email already exists."
                tvError?.visibility = View.VISIBLE
                tvSignIn?.visibility = View.VISIBLE
            } else if (email.isNotEmpty()) {
                signupEmailExists = false
                emailLayout?.error = null
                if (!signupPhoneExists) {
                    tvError?.visibility = View.GONE
                    tvSignIn?.visibility = View.GONE
                }
            }

            if (exists && matchedOn == "phone") {
                signupPhoneExists = true
                phoneLayout?.error = "This mobile number is already registered"
                tvError?.text = "An account with this mobile number already exists."
                tvError?.visibility = View.VISIBLE
                tvSignIn?.visibility = View.VISIBLE
            } else if (phone.isNotEmpty()) {
                signupPhoneExists = false
                phoneLayout?.error = null
                if (!signupEmailExists) {
                    tvError?.visibility = View.GONE
                    tvSignIn?.visibility = View.GONE
                }
            }
        }
    }

    private fun countryIsoToDialCode(iso: String): String {
        return when (iso.uppercase()) {
            "MU" -> "+230"
            "RE" -> "+262"
            "ZA" -> "+27"
            "KE" -> "+254"
            "TZ" -> "+255"
            "NG" -> "+234"
            "IN" -> "+91"
            "AE" -> "+971"
            "GB" -> "+44"
            "FR" -> "+33"
            "US" -> "+1"
            "CA" -> "+1"
            "AU" -> "+61"
            else -> "+230" // default Mauritius
        }
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
        if (signupEmailExists) {
            toast("This email is already registered. Please sign in instead.")
            return false
        }
        if (signupPhoneExists) {
            toast("This mobile number is already registered. Please sign in instead.")
            return false
        }
        if (password.length < 6) { toast("Password must be at least 6 characters"); return false }
        if (password != confirmPassword) { toast("Passwords don't match"); return false }

        if (!isOnline) {
            toast("Internet connection required")
            checkInternetStatus()
            return false
        }

        collectedEmail = email
        collectedPassword = password
        // Prepend dial code if user didn't include it
        collectedPhone = if (phone.isNotEmpty() && !phone.startsWith("+")) {
            "$selectedDialCode$phone"
        } else {
            phone
        }
        return true
    }

    // ─── Name ────────────────────────────────────────────────

    private fun setupNameStep(view: View) {
        val etName = view.findViewById<TextInputEditText>(R.id.etName)

        // Pre-populate from device owner profile if name not yet collected
        if (collectedName.isEmpty()) {
            val deviceName = getDeviceOwnerName()
            if (deviceName.isNotEmpty()) {
                collectedName = deviceName
            }
        }

        if (collectedName.isNotEmpty()) etName.setText(collectedName)
        etName.requestFocus()
    }

    /** Try to get the device owner's name from the primary Google account or device profile */
    private fun getDeviceOwnerName(): String {
        // Try AccountManager for Google account display name
        try {
            val am = android.accounts.AccountManager.get(this)
            val googleAccounts = am.getAccountsByType("com.google")
            if (googleAccounts.isNotEmpty()) {
                // Google account email → extract first name from email prefix
                val email = googleAccounts[0].name
                collectedEmail = email // also pre-fill email
                val namePart = email.substringBefore("@")
                    .replace(".", " ")
                    .replace("_", " ")
                    .split(" ")
                    .joinToString(" ") { it.replaceFirstChar { c -> c.uppercase() } }
                return namePart
            }
        } catch (_: Exception) {}

        return ""
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

    // ─── PIN Step ──────────────────────────────────────────────

    private var pinBuffer = ""
    private var pinConfirmMode = false
    private var firstPin = ""

    private fun setupPinStep(view: View) {
        pinBuffer = ""
        pinConfirmMode = false
        firstPin = ""

        // Hide the Next button — PIN auto-advances when 4 digits entered
        binding.btnNext.visibility = View.GONE

        val buttons = mapOf(
            R.id.btn_0 to "0", R.id.btn_1 to "1", R.id.btn_2 to "2",
            R.id.btn_3 to "3", R.id.btn_4 to "4", R.id.btn_5 to "5",
            R.id.btn_6 to "6", R.id.btn_7 to "7", R.id.btn_8 to "8",
            R.id.btn_9 to "9"
        )

        for ((id, digit) in buttons) {
            view.findViewById<View>(id)?.setOnClickListener {
                if (pinBuffer.length < 4) {
                    pinBuffer += digit
                    updatePinDots(view)
                    if (pinBuffer.length == 4) {
                        handlePinComplete(view)
                    }
                }
            }
        }

        view.findViewById<View>(R.id.btn_backspace)?.setOnClickListener {
            if (pinBuffer.isNotEmpty()) {
                pinBuffer = pinBuffer.dropLast(1)
                updatePinDots(view)
            }
        }

        view.findViewById<View>(R.id.btn_clear)?.setOnClickListener {
            pinBuffer = ""
            updatePinDots(view)
        }
    }

    private fun updatePinDots(view: View) {
        val dots = listOf(
            view.findViewById<View>(R.id.dot1),
            view.findViewById<View>(R.id.dot2),
            view.findViewById<View>(R.id.dot3),
            view.findViewById<View>(R.id.dot4)
        )
        val filledColor = getColor(R.color.posterita_primary)
        val emptyColor = getColor(R.color.posterita_line)

        for (i in dots.indices) {
            val bg = dots[i]?.background?.mutate()
            if (bg is android.graphics.drawable.GradientDrawable) {
                bg.setColor(if (i < pinBuffer.length) filledColor else emptyColor)
                dots[i]?.background = bg
            }
        }

        view.findViewById<android.widget.TextView>(R.id.text_pin_error)?.visibility = View.GONE
    }

    private fun flashDots(view: View, color: Int) {
        val dots = listOf(
            view.findViewById<View>(R.id.dot1),
            view.findViewById<View>(R.id.dot2),
            view.findViewById<View>(R.id.dot3),
            view.findViewById<View>(R.id.dot4)
        )
        for (dot in dots) {
            val bg = dot?.background?.mutate()
            if (bg is android.graphics.drawable.GradientDrawable) {
                bg.setColor(color)
                dot?.background = bg
            }
        }
    }

    private fun handlePinComplete(view: View) {
        val statusText = view.findViewById<android.widget.TextView>(R.id.text_pin_status)
        val hintText = view.findViewById<android.widget.TextView>(R.id.text_pin_hint)
        val iconBg = view.findViewById<View>(R.id.icon_bg)

        if (!pinConfirmMode) {
            // First entry — flash green, then switch to confirm
            firstPin = pinBuffer
            flashDots(view, getColor(R.color.posterita_secondary))

            view.postDelayed({
                pinBuffer = ""
                pinConfirmMode = true
                updatePinDots(view)

                // Update in-layout text to confirm mode
                statusText?.text = "Confirm your PIN"
                hintText?.text = "Enter the same 4 digits again"
                iconBg?.backgroundTintList = android.content.res.ColorStateList.valueOf(getColor(R.color.posterita_secondary))
            }, 400)
        } else {
            if (pinBuffer == firstPin) {
                // Match — flash green and advance
                flashDots(view, getColor(R.color.posterita_secondary))
                statusText?.text = "PIN set!"
                hintText?.text = ""

                collectedPin = pinBuffer
                view.postDelayed({
                    binding.btnNext.visibility = View.VISIBLE
                    goNext()
                }, 500)
            } else {
                // Mismatch — flash red, shake, reset
                flashDots(view, getColor(R.color.posterita_error))
                view.findViewById<android.widget.TextView>(R.id.text_pin_error)?.apply {
                    text = "PINs don't match — try again"
                    visibility = View.VISIBLE
                }

                val dotLayout = view.findViewById<View>(R.id.layout_pin_dots)
                dotLayout?.animate()
                    ?.translationX(20f)?.setDuration(50)
                    ?.withEndAction {
                        dotLayout.animate()
                            .translationX(-20f).setDuration(50)
                            .withEndAction {
                                dotLayout.animate()
                                    .translationX(0f).setDuration(50).start()
                            }.start()
                    }?.start()

                view.postDelayed({
                    pinBuffer = ""
                    pinConfirmMode = false
                    firstPin = ""
                    updatePinDots(view)
                    statusText?.text = "Enter a 4-digit PIN"
                    hintText?.text = "You'll use this to quickly unlock the POS"
                    iconBg?.backgroundTintList = android.content.res.ColorStateList.valueOf(getColor(R.color.posterita_primary))
                }, 600)
            }
        }
    }

    private fun validatePinStep(): Boolean {
        if (collectedPin.length != 4) {
            toast("Please set a 4-digit PIN")
            return false
        }
        return true
    }

    // ─── Server Account Creation Step ─────────────────────────

    private fun inferBusinessType(category: String): String {
        val foodKeywords = listOf("food", "beverage", "restaurant", "cafe", "coffee", "bar", "bakery", "pizza", "kitchen")
        return if (foodKeywords.any { category.contains(it, ignoreCase = true) }) "restaurant" else "retail"
    }

    private fun setupServerCreationStep(view: View) {
        val tvTitle = view.findViewById<TextView>(R.id.tvAiBuildingTitle)
        val tvSubtitle = view.findViewById<TextView>(R.id.tvAiBuildingSubtitle)
        val progressStore = view.findViewById<CircularProgressIndicator>(R.id.progressStore)
        val tvStatusStore = view.findViewById<TextView>(R.id.tvStatusStore)
        val layoutProducts = view.findViewById<View>(R.id.layoutStatusProducts)
        val progressProducts = view.findViewById<CircularProgressIndicator>(R.id.progressProducts)
        val tvStatusProducts = view.findViewById<TextView>(R.id.tvStatusProducts)
        val layoutFinish = view.findViewById<View>(R.id.layoutStatusFinish)
        val progressFinish = view.findViewById<CircularProgressIndicator>(R.id.progressFinish)
        val tvStatusFinish = view.findViewById<TextView>(R.id.tvStatusFinish)

        tvTitle.text = "Setting up $collectedBrand"
        tvSubtitle.text = "Creating your account on the server..."
        tvStatusStore.text = "Creating account..."
        progressStore.visibility = View.VISIBLE

        val businessType = inferBusinessType(collectedCategory)
        prefsManager.businessType = businessType
        prefsManager.terminalType = if (businessType == "restaurant") "pos_restaurant" else "pos_retail"

        lifecycleScope.launch {
            try {
                val currency = selectedCountry.currency

                // Step 1: Call signup API (required — online-first)
                tvStatusStore.text = "Creating your account..."

                val signupResult = withContext(Dispatchers.IO) {
                    callSignupApi(currency)
                }

                if (signupResult == null) {
                    showSetupError(view, "Could not create account. Check your internet connection and try again.")
                    return@launch
                }

                // Check for account-exists error (409)
                if (signupResult.optString("error_code") == "ACCOUNT_EXISTS") {
                    val errorMsg = signupResult.optString("error", "An account with this email already exists")
                    withContext(Dispatchers.Main) {
                        AlertDialog.Builder(this@SetupWizardActivity)
                            .setTitle("Account Already Exists")
                            .setMessage("$errorMsg\n\nWould you like to sign in with your existing account instead?")
                            .setPositiveButton("Sign In") { _, _ ->
                                val intent = Intent(this@SetupWizardActivity, LoginActivity::class.java)
                                intent.putExtra("email", collectedEmail)
                                startActivity(intent)
                                finish()
                            }
                            .setNegativeButton("Use Different Email") { _, _ ->
                                // Go back to the signup step
                                collectedEmail = ""
                                showStep(1) // signup step
                            }
                            .setCancelable(false)
                            .show()
                    }
                    return@launch
                }

                // optString returns "null" for JSON null — guard against it
                serverAccountId = signupResult.optString("live_account_id", "").let {
                    if (it == "null") "" else it
                }
                serverDemoAccountId = signupResult.optString("demo_account_id", "").let {
                    if (it == "null") "" else it
                }

                // Save HMAC sync secret for signing sync requests
                val syncSecret = signupResult.optString("sync_secret", "")
                if (syncSecret.isNotEmpty()) {
                    prefsManager.syncSecret = syncSecret
                }

                // Server-assigned IDs (globally unique, no PK collisions)
                val serverStoreId = signupResult.optInt("live_store_id", 0)
                val serverTerminalId = signupResult.optInt("live_terminal_id", 0)
                val serverUserId = signupResult.optInt("live_user_id", 0)
                val serverDemoStoreId = signupResult.optInt("demo_store_id", 0)
                val serverDemoTerminalId = signupResult.optInt("demo_terminal_id", 0)
                val serverDemoUserId = signupResult.optInt("demo_user_id", 0)

                if (serverAccountId.isNullOrEmpty()) {
                    showSetupError(view, "Account creation failed — no valid account ID returned. Please try again or use a different email.")
                    return@launch
                }

                val finalAccountId = serverAccountId!!

                // Step 1 done
                progressStore.visibility = View.GONE
                tvStatusStore.text = "Account created"
                tvStatusStore.setCompoundDrawablesRelativeWithIntrinsicBounds(R.drawable.ic_check_circle, 0, 0, 0)
                tvStatusStore.compoundDrawablePadding = 8

                // Step 2: Set up local database
                layoutProducts?.alpha = 1f
                progressProducts?.visibility = View.VISIBLE
                tvStatusProducts?.text = "Setting up local data..."

                withContext(Dispatchers.IO) {
                    prefsManager.setAccountIdSync(finalAccountId)
                    prefsManager.setStringSync("setup_mode", "cloud")
                    prefsManager.setStringSync("currency", currency)
                    prefsManager.setEmailSync(collectedEmail)
                    prefsManager.setOwnerPhoneSync(collectedPhone)

                    AppDatabase.resetInstance()
                    val freshDb = AppDatabase.getInstance(this@SetupWizardActivity, finalAccountId)

                    // Account
                    freshDb.accountDao().insertAccounts(listOf(
                        Account(account_id = finalAccountId, businessname = collectedBrand,
                            address1 = collectedCountry, isactive = "Y", currency = currency)
                    ))

                    // Store — use server-assigned ID (globally unique, no PK collisions)
                    val localStoreId = if (serverStoreId > 0) serverStoreId else 1
                    freshDb.storeDao().insertStore(
                        Store(storeId = localStoreId, name = collectedBrand, address = "",
                            country = selectedCountry.name, currency = currency, isactive = "Y",
                            account_id = finalAccountId)
                    )
                    prefsManager.setStoreIdSync(localStoreId)
                    prefsManager.setStoreNameSync(collectedBrand)

                    val localTerminalId = if (serverTerminalId > 0) serverTerminalId else 1
                    freshDb.terminalDao().insertTerminal(
                        Terminal(terminalId = localTerminalId, name = "POS 1", store_id = localStoreId,
                            prefix = "INV", isactive = "Y", account_id = finalAccountId)
                    )
                    prefsManager.setTerminalIdSync(localTerminalId)
                    prefsManager.setTerminalNameSync("POS 1")

                    // Owner user — use server-assigned ID
                    val localUserId = if (serverUserId > 0) serverUserId else 1
                    freshDb.userDao().insertUser(User(
                        user_id = localUserId, firstname = collectedName, lastname = "",
                        username = collectedEmail, pin = collectedPin,
                        isadmin = "Y", isactive = "Y", issalesrep = "Y",
                        role = User.ROLE_OWNER, email = collectedEmail, phone1 = collectedPhone
                    ))

                    // Register accounts
                    accountRegistry.addAccount(
                        id = finalAccountId, name = collectedBrand, storeName = collectedBrand,
                        ownerEmail = collectedEmail, ownerPhone = collectedPhone,
                        type = "live", status = "onboarding"
                    )

                    if (!serverDemoAccountId.isNullOrEmpty()) {
                        prefsManager.setStringSync("demo_account_id", serverDemoAccountId!!)
                        accountRegistry.addAccount(
                            id = serverDemoAccountId!!, name = "${collectedName}'s Demo",
                            storeName = "${collectedName}'s Demo Store",
                            ownerEmail = collectedEmail, ownerPhone = collectedPhone,
                            type = "demo", status = "testing"
                        )
                    }
                }

                // Step 2 done
                progressProducts?.visibility = View.GONE
                tvStatusProducts?.text = "Local data ready"
                tvStatusProducts?.setCompoundDrawablesRelativeWithIntrinsicBounds(R.drawable.ic_check_circle, 0, 0, 0)
                tvStatusProducts?.compoundDrawablePadding = 8

                // Step 3: Sync with server to pull demo brand data
                layoutFinish?.alpha = 1f
                progressFinish?.visibility = View.VISIBLE
                tvStatusFinish?.text = "Syncing with server..."

                // Reset sync timestamps to epoch so first sync pulls EVERYTHING
                withContext(Dispatchers.IO) {
                    val epoch = "1970-01-01T00:00:00.000Z"
                    prefsManager.setStringSync(
                        com.posterita.pos.android.service.CloudSyncService.syncDateKey(finalAccountId), epoch)
                    if (!serverDemoAccountId.isNullOrEmpty()) {
                        prefsManager.setStringSync(
                            com.posterita.pos.android.service.CloudSyncService.syncDateKey(serverDemoAccountId!!), epoch)
                    }
                }

                // Trigger sync and wait for it to complete
                CloudSyncWorker.syncNow(this@SetupWizardActivity)
                val syncCompleted = withTimeoutOrNull(30_000L) {
                    com.posterita.pos.android.service.SyncStatusManager.status.first { s ->
                        s.state == com.posterita.pos.android.service.SyncStatusManager.SyncState.COMPLETE ||
                        s.state == com.posterita.pos.android.service.SyncStatusManager.SyncState.ERROR
                    }
                    true
                } ?: false

                if (syncCompleted) {
                    tvStatusFinish?.text = "Sync complete!"
                } else {
                    tvStatusFinish?.text = "Sync in progress — data will arrive shortly"
                }
                progressFinish?.visibility = View.GONE
                tvStatusFinish?.setCompoundDrawablesRelativeWithIntrinsicBounds(R.drawable.ic_check_circle, 0, 0, 0)
                tvStatusFinish?.compoundDrawablePadding = 8

                // Auto-advance to review step
                delay(1000)
                showStep(currentStep + 1)

            } catch (e: Exception) {
                AppErrorLogger.log(this@SetupWizardActivity, "SetupWizard", "Account creation failed", e)
                showSetupError(view, "Setup failed: ${e.message ?: "Unknown error"}")
            }
        }
    }

    private fun showSetupError(view: View, message: String) {
        val tvError = view.findViewById<TextView>(R.id.tvAiBuildingError)
        tvError?.text = message
        tvError?.visibility = View.VISIBLE
        binding.btnNext.visibility = View.VISIBLE
        binding.btnNext.text = "Retry"
        binding.btnBack.visibility = View.VISIBLE
    }

    // ─── Review Products Step ─────────────────────────────────

    private fun setupReviewStep(view: View) {
        val tvTitle = view.findViewById<TextView>(R.id.tvCompleteTitle)
            ?: view.findViewById<TextView>(R.id.tvAiBuildingTitle)
        val tvSubtitle = view.findViewById<TextView>(R.id.tvCompleteSubtitle)
            ?: view.findViewById<TextView>(R.id.tvAiBuildingSubtitle)

        tvTitle?.text = "You're all set!"
        tvSubtitle?.text = "Your account has been created. Here's what we set up for you."

        // Load product counts from local DB
        lifecycleScope.launch {
            val summary = withContext(Dispatchers.IO) {
                try {
                    val db = AppDatabase.getInstance(this@SetupWizardActivity, serverAccountId ?: prefsManager.accountId)
                    val productCount = db.productDao().getAllProductsSync().size
                    val categoryCount = db.productCategoryDao().getAllProductCategoriesSync().size
                    val storeCount = db.storeDao().getAllStores().size
                    Triple(productCount, categoryCount, storeCount)
                } catch (_: Exception) {
                    Triple(0, 0, 0)
                }
            }

            // Build summary in the complete layout
            val summaryContainer = view.findViewById<android.widget.LinearLayout>(R.id.layoutSummary)
            if (summaryContainer != null) {
                summaryContainer.removeAllViews()
                addSummaryRow(summaryContainer, "Brand", collectedBrand)
                addSummaryRow(summaryContainer, "Store", collectedBrand)
                addSummaryRow(summaryContainer, "Terminal", "POS 1")
                addSummaryRow(summaryContainer, "Country", selectedCountry.name)
                addSummaryRow(summaryContainer, "Currency", selectedCountry.currency)
                addSummaryRow(summaryContainer, "Products", "${summary.first}")
                addSummaryRow(summaryContainer, "Categories", "${summary.second}")
                if (websiteSetupService.isConfigured()) {
                    addSummaryRow(summaryContainer, "AI Import", "Running in background")
                }
            }

            // Show email verification banner
            val tvBanner = view.findViewById<TextView>(R.id.tvVerificationBanner)
            if (tvBanner != null) {
                tvBanner.text = "Check your email ($collectedEmail) to verify your account"
                tvBanner.visibility = View.VISIBLE
            }
        }
    }

    private fun addSummaryRow(container: android.widget.LinearLayout, label: String, value: String) {
        val row = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.HORIZONTAL
            setPadding(0, 8, 0, 8)
        }

        val labelView = TextView(this).apply {
            text = label
            setTextColor(getColor(R.color.posterita_muted))
            textSize = 14f
            layoutParams = android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        val valueView = TextView(this).apply {
            text = value
            setTextColor(getColor(R.color.posterita_ink))
            textSize = 14f
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        }

        row.addView(labelView)
        row.addView(valueView)
        container.addView(row)
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
                    val url = java.net.URL("https://web.posterita.com/api/sync")
                    val conn = url.openConnection() as java.net.HttpURLConnection
                    conn.connectTimeout = 5000
                    conn.readTimeout = 5000
                    conn.requestMethod = "GET"
                    conn.connect()
                    val code = conn.responseCode
                    conn.disconnect()
                    code in 200..499 // Any response means server is reachable
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
        val url = java.net.URL("https://web.posterita.com/api/auth/signup")
        val conn = url.openConnection() as java.net.HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.connectTimeout = 15_000
        conn.readTimeout = 15_000
        conn.doOutput = true

        val payload = org.json.JSONObject().apply {
            put("phone", collectedPhone)
            put("email", collectedEmail)
            put("firstname", collectedName)
            put("password", collectedPassword)
            put("pin", collectedPin)
            put("businessname", collectedBrand)
            put("country", collectedCountry)
            put("currency", currency)
        }

        java.io.OutputStreamWriter(conn.outputStream).use { writer ->
            writer.write(payload.toString())
            writer.flush()
        }

        val responseCode = conn.responseCode
        return if (responseCode == 200) {
            val response = conn.inputStream.bufferedReader().readText()
            android.util.Log.d("SetupWizard", "Signup API success")
            org.json.JSONObject(response)
        } else if (responseCode == 409) {
            // Account already exists — return structured error for the UI to handle
            val errorBody = try { conn.errorStream?.bufferedReader()?.readText() } catch (_: Exception) { null }
            android.util.Log.w("SetupWizard", "Account already exists (409): $errorBody")
            val errorJson = try { org.json.JSONObject(errorBody ?: "{}") } catch (_: Exception) { org.json.JSONObject() }
            // Return a marker so the caller knows this is a 409
            org.json.JSONObject().apply {
                put("error_code", "ACCOUNT_EXISTS")
                put("error", errorJson.optString("error", "An account with this email already exists"))
            }
        } else {
            val errorBody = try { conn.errorStream?.bufferedReader()?.readText() } catch (_: Exception) { null }
            android.util.Log.w("SetupWizard", "Signup API failed: $responseCode $errorBody")
            null
        }
    }

    /**
     * If signup returns 409, look up the existing account IDs by email/phone.
     */
    private fun fetchExistingAccountId(email: String, phone: String): org.json.JSONObject? {
        return try {
            val url = java.net.URL("https://web.posterita.com/api/auth/lookup")
            val conn = url.openConnection() as java.net.HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.connectTimeout = 5_000
            conn.readTimeout = 5_000
            conn.doOutput = true

            val payload = org.json.JSONObject().apply {
                if (email.isNotEmpty()) put("email", email)
                if (phone.isNotEmpty()) put("phone", phone)
            }

            java.io.OutputStreamWriter(conn.outputStream).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            if (conn.responseCode == 200) {
                val response = conn.inputStream.bufferedReader().readText()
                android.util.Log.d("SetupWizard", "Lookup success")
                org.json.JSONObject(response)
            } else {
                android.util.Log.w("SetupWizard", "Lookup failed: ${conn.responseCode}")
                null
            }
        } catch (e: Exception) {
            android.util.Log.w("SetupWizard", "Lookup failed", e)
            null
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        @Suppress("DEPRECATION")
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == REQUEST_CODE_ENROLL && resultCode == RESULT_OK) {
            // Enrollment completed successfully in ScanBarcodeActivity — go to Home
            prefsManager.setString("setup_completed", "true")
            restartApp()
        }
    }

    private fun finishWizard() {
        prefsManager.setString("setup_completed", "true")
        restartApp()
    }

    private fun toast(msg: String) = Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()
}
