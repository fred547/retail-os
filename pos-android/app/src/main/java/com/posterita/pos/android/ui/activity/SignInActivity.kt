package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.posterita.pos.android.databinding.ActivitySignInBinding
import com.posterita.pos.android.service.AiImportService
import com.posterita.pos.android.util.DemoDataSeeder
import com.posterita.pos.android.util.LocalAccountRegistry
import com.posterita.pos.android.util.OwnerAccountCloudService
import com.posterita.pos.android.util.OwnerAccountSnapshot
import com.posterita.pos.android.util.SharedPreferencesManager
import com.posterita.pos.android.util.WebsiteSetupService
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class SignInActivity : BaseActivity() {

    private lateinit var binding: ActivitySignInBinding

    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var ownerAccountCloudService: OwnerAccountCloudService
    @Inject lateinit var localAccountRegistry: LocalAccountRegistry
    @Inject lateinit var websiteSetupService: WebsiteSetupService
    @Inject lateinit var demoDataSeeder: DemoDataSeeder

    private enum class SignInMethod {
        PHONE,
        EMAIL
    }

    private data class CountryOption(
        val name: String,
        val dialCode: String
    ) {
        override fun toString(): String = "$name ($dialCode)"
    }

    private val countries = listOf(
        CountryOption("Mauritius", "+230"),
        CountryOption("Reunion", "+262"),
        CountryOption("South Africa", "+27"),
        CountryOption("Kenya", "+254"),
        CountryOption("Tanzania", "+255"),
        CountryOption("Nigeria", "+234"),
        CountryOption("India", "+91"),
        CountryOption("United Arab Emirates", "+971"),
        CountryOption("United Kingdom", "+44"),
        CountryOption("France", "+33"),
        CountryOption("United States", "+1"),
        CountryOption("Canada", "+1"),
        CountryOption("Australia", "+61")
    )

    private var signInMethod = SignInMethod.PHONE
    private var selectedSignInCountry = countries.first()
    private var selectedSignupCountry = countries.first()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySignInBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayShowTitleEnabled(false)

        setupCountryDropdowns()
        prefillKnownOwnerIdentity()
        updateSignInMode(SignInMethod.PHONE)

        binding.btnSignInPhone.setOnClickListener { updateSignInMode(SignInMethod.PHONE) }
        binding.btnSignInEmail.setOnClickListener { updateSignInMode(SignInMethod.EMAIL) }
        binding.buttonSignIn.setOnClickListener { lookupOwnerAccounts() }
        binding.buttonCreateSandbox.setOnClickListener { createSandboxFromSignup() }
        binding.textDemoAccount.setOnClickListener { openDemoSandbox() }
    }

    private fun setupCountryDropdowns() {
        val adapter = ArrayAdapter(this, android.R.layout.simple_list_item_1, countries)
        setupCountryDropdown(
            view = binding.autoSignInCountry,
            defaultCountry = selectedSignInCountry,
            adapter = adapter
        ) { country ->
            selectedSignInCountry = country
            binding.textSignInDialCode.text = country.dialCode
        }
        setupCountryDropdown(
            view = binding.autoSignupCountry,
            defaultCountry = selectedSignupCountry,
            adapter = adapter
        ) { country ->
            selectedSignupCountry = country
            binding.textSignupDialCode.text = country.dialCode
        }
    }

    private fun setupCountryDropdown(
        view: AutoCompleteTextView,
        defaultCountry: CountryOption,
        adapter: ArrayAdapter<CountryOption>,
        onSelected: (CountryOption) -> Unit
    ) {
        view.setAdapter(adapter)
        view.setText(defaultCountry.toString(), false)
        onSelected(defaultCountry)
        view.setOnClickListener { view.showDropDown() }
        view.setOnItemClickListener { _, _, position, _ ->
            onSelected(adapter.getItem(position) ?: defaultCountry)
        }
    }

    private fun prefillKnownOwnerIdentity() {
        val savedEmail = prefsManager.email
        if (savedEmail.isNotBlank()) {
            binding.edtEmailInput.setText(savedEmail)
            binding.edtSignupEmail.setText(savedEmail)
        }

        val savedPhone = prefsManager.ownerPhone
        if (savedPhone.isNotBlank()) {
            val matchingCountry = countries.firstOrNull { savedPhone.startsWith(it.dialCode) } ?: countries.first()
            selectedSignInCountry = matchingCountry
            selectedSignupCountry = matchingCountry
            binding.autoSignInCountry.setText(matchingCountry.toString(), false)
            binding.autoSignupCountry.setText(matchingCountry.toString(), false)
            binding.textSignInDialCode.text = matchingCountry.dialCode
            binding.textSignupDialCode.text = matchingCountry.dialCode
            binding.edtPhoneInput.setText(savedPhone.removePrefix(matchingCountry.dialCode))
            binding.edtSignupMobile.setText(savedPhone.removePrefix(matchingCountry.dialCode))
        }
    }

    private fun updateSignInMode(method: SignInMethod) {
        signInMethod = method
        val usePhone = method == SignInMethod.PHONE
        binding.layoutPhoneSignIn.visibility = if (usePhone) View.VISIBLE else View.GONE
        binding.edtServer.visibility = if (usePhone) View.GONE else View.VISIBLE

        binding.btnSignInPhone.alpha = if (usePhone) 1f else 0.55f
        binding.btnSignInEmail.alpha = if (usePhone) 0.55f else 1f
        binding.buttonSignIn.text = if (usePhone) "Find My Accounts" else "Find My Accounts by Email"
    }

    private fun lookupOwnerAccounts() {
        val ownerEmail = if (signInMethod == SignInMethod.EMAIL) {
            binding.edtEmailInput.text?.toString()?.trim().orEmpty()
        } else {
            ""
        }
        val ownerPhone = if (signInMethod == SignInMethod.PHONE) {
            buildPhoneNumber(selectedSignInCountry, binding.edtPhoneInput.text?.toString())
        } else {
            ""
        }

        if (signInMethod == SignInMethod.PHONE && ownerPhone.isBlank()) {
            toast("Enter the owner's mobile number")
            return
        }
        if (signInMethod == SignInMethod.EMAIL) {
            if (ownerEmail.isBlank()) {
                toast("Enter the owner's email")
                return
            }
            if (!android.util.Patterns.EMAIL_ADDRESS.matcher(ownerEmail).matches()) {
                toast("Email format looks invalid")
                return
            }
        }

        setLookupLoading(true)
        lifecycleScope.launch {
            val result = ownerAccountCloudService.listOwnerAccounts(
                ownerPhone = ownerPhone,
                ownerEmail = ownerEmail
            )
            setLookupLoading(false)

            result.onFailure { error ->
                toast(error.message ?: "Could not load accounts")
            }

            result.onSuccess { accounts ->
                if (accounts.isEmpty()) {
                    prefillSignupFromLookup(ownerPhone, ownerEmail)
                    showSignupStatus("No existing accounts found. Create a sandbox below and we will build one for you.")
                    return@onSuccess
                }

                saveOwnerIdentity(ownerPhone, ownerEmail)
                syncRemoteAccountsToRegistry(accounts)
                openAccountPicker(hasLocalAccount = accounts.any { localAccountRegistry.getAccount(it.accountId) != null })
            }
        }
    }

    private fun prefillSignupFromLookup(ownerPhone: String, ownerEmail: String) {
        if (ownerEmail.isNotBlank()) {
            binding.edtSignupEmail.setText(ownerEmail)
        }
        if (ownerPhone.isNotBlank()) {
            val country = countries.firstOrNull { ownerPhone.startsWith(it.dialCode) } ?: selectedSignupCountry
            selectedSignupCountry = country
            binding.autoSignupCountry.setText(country.toString(), false)
            binding.textSignupDialCode.text = country.dialCode
            binding.edtSignupMobile.setText(ownerPhone.removePrefix(country.dialCode))
        }
    }

    private fun createSandboxFromSignup() {
        val ownerName = binding.edtSignupName.text?.toString()?.trim().orEmpty()
        val ownerEmail = binding.edtSignupEmail.text?.toString()?.trim().orEmpty()
        val ownerPhone = buildPhoneNumber(selectedSignupCountry, binding.edtSignupMobile.text?.toString())
        val companyName = binding.edtCompanyName.text?.toString()?.trim().orEmpty()
        val tradingName = binding.edtTradingName.text?.toString()?.trim().orEmpty()
        val whatSelling = binding.edtWhatSelling.text?.toString()?.trim().orEmpty()
        val countryName = selectedSignupCountry.name
        val businessName = tradingName.ifBlank { companyName }

        if (ownerName.isBlank()) {
            toast("Name is required")
            return
        }
        if (ownerEmail.isBlank()) {
            toast("Email is required")
            return
        }
        if (!android.util.Patterns.EMAIL_ADDRESS.matcher(ownerEmail).matches()) {
            toast("Email format looks invalid")
            return
        }
        if (ownerPhone.isBlank()) {
            toast("Mobile number is required")
            return
        }
        if (companyName.isBlank()) {
            toast("Company name is required")
            return
        }
        if (tradingName.isBlank()) {
            toast("Trading name is required")
            return
        }
        if (whatSelling.isBlank()) {
            toast("Tell us what you are selling")
            return
        }

        val inferredBusinessType = inferBusinessType(whatSelling)
        val searchName = tradingName.ifBlank { companyName }
        val pendingAccountId = "demo_${System.currentTimeMillis()}"

        setSignupLoading(true, "Looking for $searchName online...")
        lifecycleScope.launch {
            val searchResult = withContext(Dispatchers.IO) {
                websiteSetupService.findBusinessWebsites(
                    businessName = searchName,
                    location = countryName,
                    businessType = whatSelling
                )
            }

            val urls = searchResult.getOrElse { emptyList() }
                .map { it.url.trim() }
                .filter { it.isNotBlank() }
                .distinct()

            saveOwnerIdentity(ownerPhone, ownerEmail)

            val sandboxMessage = if (urls.isNotEmpty()) {
                withContext(Dispatchers.IO) {
                    AiImportService.queueStart(
                        prefs = prefsManager,
                        urls = urls,
                        businessName = businessName,
                        businessLocation = countryName,
                        businessType = inferredBusinessType,
                        accountId = pendingAccountId,
                        ownerEmail = ownerEmail,
                        ownerPhone = ownerPhone,
                        accountType = "demo"
                    )
                    demoDataSeeder.activateDemoAccount()
                }
                "We found ${urls.size} source${if (urls.size > 1) "s" else ""}. Your sandbox is opening while AI builds the business in the background."
            } else {
                withContext(Dispatchers.IO) {
                    prefsManager.setStringSync(AiImportService.PREF_PENDING_START, "")
                    demoDataSeeder.activateDemoAccount()
                }
                "We opened the sandbox right away. We could not find enough public sources yet, so you can retry the AI import from inside Posterita."
            }

            setSignupLoading(false)
            showSignupStatus(sandboxMessage)
            toast(sandboxMessage)
            restartApp()
        }
    }

    private fun saveOwnerIdentity(ownerPhone: String, ownerEmail: String) {
        prefsManager.setEmailSync(ownerEmail)
        prefsManager.setOwnerPhoneSync(ownerPhone)
    }

    private fun syncRemoteAccountsToRegistry(accounts: List<OwnerAccountSnapshot>) {
        accounts.forEach { account ->
            localAccountRegistry.addAccount(
                id = account.accountId,
                name = account.businessName.ifBlank { "Untitled Account" },
                storeName = account.businessName.ifBlank { "Untitled Account" },
                ownerEmail = account.ownerEmail,
                ownerPhone = account.ownerPhone,
                type = account.type,
                status = account.status
            )
        }
    }

    private fun openAccountPicker(hasLocalAccount: Boolean) {
        if (hasLocalAccount) {
            val preferred = localAccountRegistry.getAllAccounts().firstOrNull()
            if (preferred != null) {
                prefsManager.setAccountIdSync(preferred.id)
                prefsManager.setStoreNameSync(preferred.storeName)
            }
        } else {
            prefsManager.setAccountIdSync("")
            prefsManager.setStoreNameSync("")
        }

        val intent = Intent(this, SelectUserLoginActivity::class.java).apply {
            putExtra(SelectUserLoginActivity.EXTRA_SHOW_ACCOUNT_PICKER, true)
        }
        startActivity(intent)
        finish()
    }

    private fun openDemoSandbox() {
        lifecycleScope.launch {
            setSignupLoading(true, "Opening demo sandbox...")
            withContext(Dispatchers.IO) {
                demoDataSeeder.activateDemoAccount()
            }
            setSignupLoading(false)
            restartApp()
        }
    }

    private fun buildPhoneNumber(country: CountryOption, raw: String?): String {
        val digits = raw.orEmpty().filter { it.isDigit() }
        return if (digits.isBlank()) "" else "${country.dialCode}$digits"
    }

    private fun inferBusinessType(whatSelling: String): String {
        val normalized = whatSelling.lowercase()
        val restaurantKeywords = listOf("food", "restaurant", "cafe", "coffee", "bar", "kitchen", "menu", "bakery", "pizza")
        return if (restaurantKeywords.any { normalized.contains(it) }) "restaurant" else "retail"
    }

    private fun setLookupLoading(loading: Boolean) {
        binding.buttonSignIn.isEnabled = !loading
        binding.buttonSignIn.text = if (loading) "Checking..." else if (signInMethod == SignInMethod.PHONE) "Find My Accounts" else "Find My Accounts by Email"
    }

    private fun setSignupLoading(loading: Boolean, status: String = "") {
        binding.buttonCreateSandbox.isEnabled = !loading
        binding.buttonCreateSandbox.text = if (loading) "Building..." else "Build My Test Account"
        if (loading || status.isNotBlank()) {
            binding.textSignupStatus.visibility = View.VISIBLE
            binding.textSignupStatus.text = status
        } else {
            binding.textSignupStatus.visibility = View.GONE
        }
    }

    private fun showSignupStatus(message: String) {
        binding.textSignupStatus.visibility = View.VISIBLE
        binding.textSignupStatus.text = message
    }

    private fun restartApp() {
        val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        startActivity(intent)
        finish()
        Runtime.getRuntime().exit(0)
    }

    private fun toast(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_LONG).show()
    }
}
