package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.text.InputType
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.databinding.ActivitySelectUserLoginBinding
import com.posterita.pos.android.data.local.entity.User
import com.posterita.pos.android.data.remote.CloudSyncApi
import com.posterita.pos.android.service.AiImportService
import com.posterita.pos.android.service.CloudSyncService
import com.posterita.pos.android.ui.viewmodel.UserSelectionViewModel
import com.posterita.pos.android.util.AccountEntry
import com.posterita.pos.android.util.DemoDataSeeder
import com.posterita.pos.android.util.LocalAccountRegistry
import com.posterita.pos.android.util.OwnerAccountCloudService
import com.posterita.pos.android.util.OwnerAccountSnapshot
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Inject

@AndroidEntryPoint
class SelectUserLoginActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_SHOW_ACCOUNT_PICKER = "extra_show_account_picker"
        private const val MENU_LOGOUT = 1001
    }

    private lateinit var binding: ActivitySelectUserLoginBinding

    private val userSelectionViewModel: UserSelectionViewModel by viewModels()

    @Inject
    lateinit var sessionManager: SessionManager

    @Inject
    lateinit var prefsManager: SharedPreferencesManager

    @Inject
    lateinit var accountRegistry: LocalAccountRegistry

    @Inject
    lateinit var db: AppDatabase

    @Inject
    lateinit var demoSeeder: DemoDataSeeder

    @Inject
    lateinit var ownerAccountCloudService: OwnerAccountCloudService

    private var selectedUser: User? = null
    private var userList: List<User> = emptyList()
    private var canUseBiometric = false
    private var pinString = ""
    private val PIN_LENGTH = 6

    private lateinit var biometricPrompt: BiometricPrompt
    private lateinit var promptInfo: BiometricPrompt.PromptInfo

    private data class AccountListItem(
        val entry: AccountEntry,
        val installedLocally: Boolean
    )

    private data class OwnerIdentity(
        val phone: String,
        val email: String
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySelectUserLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setSupportActionBar(binding.toolbar)
        supportActionBar?.setDisplayShowTitleEnabled(false)

        checkBiometricAvailability()
        setupBiometricPrompt()
        setupUserGrid()
        setupPinNumpad()
        setupBiometricButton()
        setupChangeUser()
        observeViewModel()
        syncRegistryImportState()
        setupAccountSwitching()

        val shouldShowAccountPicker =
            intent.getBooleanExtra(EXTRA_SHOW_ACCOUNT_PICKER, false) || prefsManager.accountId.isBlank()

        if (prefsManager.accountId == DemoDataSeeder.DEMO_ACCOUNT_ID && demoSeeder.isResetDue()) {
            binding.toolbarTitle.text = "Refreshing Demo..."
            lifecycleScope.launch {
                withContext(Dispatchers.IO) {
                    demoSeeder.seedDemoData()
                }
                restartApp()
            }
            return
        }

        // Demo account: auto-login, skip PIN entry
        if (prefsManager.accountId == DemoDataSeeder.DEMO_ACCOUNT_ID && !shouldShowAccountPicker) {
            lifecycleScope.launch {
                val demoUser = withContext(Dispatchers.IO) { db.userDao().getAllUsers().firstOrNull() }
                if (demoUser != null) {
                    sessionManager.user = demoUser
                    navigateToTill()
                    return@launch
                }
            }
        }

        if (shouldShowAccountPicker) {
            binding.toolbarTitle.text = "Choose Account"
            binding.root.post { showSwitchAccountDialog() }
        }

        if (prefsManager.accountId.isNotBlank()) {
            userSelectionViewModel.loadUsers()
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

    private fun setupAccountSwitching() {
        val currentStoreName = prefsManager.storeName.ifEmpty { "My Store" }

        // Add account info bar programmatically above the user select phase
        val accountBar = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
            setPadding(32, 16, 32, 16)
            setBackgroundColor(0xFFF5F5F5.toInt())
        }

        val storeLabel = TextView(this).apply {
            text = currentStoreName
            textSize = 14f
            setTextColor(0xFF333333.toInt())
            layoutParams = android.widget.LinearLayout.LayoutParams(0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }
        accountBar.addView(storeLabel)

        if (prefsManager.accountSwitchingEnabled) {
            val manageBtn = TextView(this).apply {
                text = "Manage Accounts"
                textSize = 13f
                setTextColor(0xFF1976D2.toInt())
                setPadding(16, 8, 16, 8)
                setOnClickListener { showSwitchAccountDialog() }
            }
            accountBar.addView(manageBtn)
        }

        // Insert the account bar between the AppBarLayout and the user select phase
        val rootLayout = binding.root as androidx.constraintlayout.widget.ConstraintLayout
        accountBar.id = View.generateViewId()
        val barParams = androidx.constraintlayout.widget.ConstraintLayout.LayoutParams(
            androidx.constraintlayout.widget.ConstraintLayout.LayoutParams.MATCH_PARENT,
            androidx.constraintlayout.widget.ConstraintLayout.LayoutParams.WRAP_CONTENT
        )
        barParams.topToBottom = R.id.appBarLayout
        barParams.startToStart = androidx.constraintlayout.widget.ConstraintLayout.LayoutParams.PARENT_ID
        barParams.endToEnd = androidx.constraintlayout.widget.ConstraintLayout.LayoutParams.PARENT_ID
        rootLayout.addView(accountBar, barParams)

        // Re-constrain the user select phase and pin phase to be below the account bar
        val userSelectParams = binding.layoutPhaseUserSelect.layoutParams as androidx.constraintlayout.widget.ConstraintLayout.LayoutParams
        userSelectParams.topToBottom = accountBar.id
        binding.layoutPhaseUserSelect.layoutParams = userSelectParams

        val pinParams = binding.layoutPhasePin.layoutParams as androidx.constraintlayout.widget.ConstraintLayout.LayoutParams
        pinParams.topToBottom = accountBar.id
        binding.layoutPhasePin.layoutParams = pinParams
    }

    private fun showSwitchAccountDialog() {
        syncRegistryImportState()

        val container = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(24, 8, 24, 0)
        }
        val scrollView = android.widget.ScrollView(this).apply {
            addView(container)
        }

        val loadingText = TextView(this).apply {
            text = "Loading your accounts..."
            setPadding(0, 24, 0, 24)
        }
        container.addView(loadingText)

        val dialog = AlertDialog.Builder(this)
            .setTitle("Your Accounts")
            .setView(scrollView)
            .setPositiveButton("Add Account") { _, _ ->
                startActivity(Intent(this, SetupWizardActivity::class.java))
            }
            .setNegativeButton("Cancel", null)
            .show()

        lifecycleScope.launch {
            val merged = loadManagedAccounts()
            container.removeAllViews()

            if (merged.isEmpty()) {
                container.addView(TextView(this@SelectUserLoginActivity).apply {
                    text = "No accounts yet. Create one to start testing Posterita."
                    setPadding(0, 24, 0, 24)
                })
            } else {
                merged.forEach { item ->
                    container.addView(buildAccountRow(item, dialog))
                }
            }
        }
    }

    private suspend fun loadManagedAccounts(): List<AccountListItem> {
        val localAccounts = accountRegistry.getAllAccounts()
        val ownerIdentity = resolveOwnerIdentity(localAccounts)
        val remoteAccounts = ownerIdentity?.let {
            ownerAccountCloudService
                .listOwnerAccounts(ownerPhone = it.phone, ownerEmail = it.email)
                .getOrElse { emptyList() }
        }.orEmpty()

        val byId = linkedMapOf<String, AccountListItem>()

        localAccounts.forEach { account ->
            byId[account.id] = AccountListItem(account, installedLocally = true)
        }

        remoteAccounts.forEach { remote ->
            val existing = byId[remote.accountId]
            val mergedEntry = mergeAccount(existing?.entry, remote)

            if (existing?.installedLocally == true) {
                accountRegistry.addAccount(
                    id = mergedEntry.id,
                    name = mergedEntry.name,
                    storeName = mergedEntry.storeName,
                    ownerEmail = mergedEntry.ownerEmail,
                    ownerPhone = mergedEntry.ownerPhone,
                    type = mergedEntry.type,
                    status = mergedEntry.status
                )
            }

            byId[remote.accountId] = AccountListItem(
                entry = mergedEntry,
                installedLocally = existing?.installedLocally ?: false
            )
        }

        return byId.values.sortedWith(
            compareByDescending<AccountListItem> { it.installedLocally }
                .thenByDescending { it.entry.lastOpenedAt }
                .thenByDescending { it.entry.createdAt }
        )
    }

    private fun resolveOwnerIdentity(localAccounts: List<AccountEntry>): OwnerIdentity? {
        val phone = prefsManager.ownerPhone.ifBlank {
            localAccounts.firstOrNull { it.ownerPhone.isNotBlank() }?.ownerPhone.orEmpty()
        }
        val email = prefsManager.email.ifBlank {
            localAccounts.firstOrNull { it.ownerEmail.isNotBlank() }?.ownerEmail.orEmpty()
        }
        return if (phone.isBlank() && email.isBlank()) null else OwnerIdentity(phone = phone, email = email)
    }

    private fun mergeAccount(local: AccountEntry?, remote: OwnerAccountSnapshot): AccountEntry {
        return AccountEntry(
            id = remote.accountId,
            name = remote.businessName.ifBlank { local?.name ?: "Untitled Account" },
            storeName = remote.businessName.ifBlank { local?.storeName ?: "Untitled Account" },
            createdAt = local?.createdAt ?: remote.createdAt,
            ownerEmail = remote.ownerEmail.ifBlank { local?.ownerEmail.orEmpty() },
            ownerPhone = remote.ownerPhone.ifBlank { local?.ownerPhone.orEmpty() },
            type = remote.type.ifBlank { local?.type ?: "trial" },
            status = remote.status.ifBlank { local?.status ?: "draft" },
            lastOpenedAt = local?.lastOpenedAt ?: remote.createdAt
        )
    }

    private fun buildAccountRow(item: AccountListItem, dialog: AlertDialog): View {
        val account = item.entry
        val currentAccountId = prefsManager.accountId

        val card = com.google.android.material.card.MaterialCardView(this).apply {
            radius = 24f
            useCompatPadding = true
            strokeWidth = if (account.id == currentAccountId) 2 else 0
            strokeColor = if (account.id == currentAccountId) 0xFF1976D2.toInt() else 0
        }

        val content = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(24, 24, 24, 24)
        }

        val title = TextView(this).apply {
            text = account.storeName
            textSize = 16f
            setTypeface(typeface, android.graphics.Typeface.BOLD)
            setTextColor(0xFF111827.toInt())
        }
        content.addView(title)

        val subtitle = TextView(this).apply {
            text = buildAccountSubtitle(account, item.installedLocally)
            textSize = 13f
            setTextColor(0xFF6B7280.toInt())
            setPadding(0, 8, 0, 0)
        }
        content.addView(subtitle)

        val actions = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.HORIZONTAL
            setPadding(0, 16, 0, 0)
        }

        val openBtn = com.google.android.material.button.MaterialButton(
            this,
            null,
            com.google.android.material.R.attr.materialButtonOutlinedStyle
        ).apply {
            text = when {
                canResumeAccount(account) -> "Resume"
                !item.installedLocally -> "Add to device"
                account.id == currentAccountId -> "Current"
                else -> "Open"
            }
            isEnabled = account.id != currentAccountId || canResumeAccount(account)
            setOnClickListener {
                if (canResumeAccount(account)) {
                    AiImportService.resume(this@SelectUserLoginActivity, prefsManager)
                    Toast.makeText(this@SelectUserLoginActivity, "Resuming import for ${account.storeName}", Toast.LENGTH_SHORT).show()
                } else if (!item.installedLocally) {
                    dialog.dismiss()
                    importRemoteAccountToDevice(account)
                } else if (account.id != currentAccountId) {
                    switchToAccount(account)
                }
            }
        }
        actions.addView(openBtn)

        val editBtn = com.google.android.material.button.MaterialButton(
            this,
            null,
            com.google.android.material.R.attr.materialButtonOutlinedStyle
        ).apply {
            text = "Edit"
            setOnClickListener {
                dialog.dismiss()
                showEditAccountDialog(item)
            }
        }
        actions.addView(editBtn)

        val deleteBtn = com.google.android.material.button.MaterialButton(
            this,
            null,
            com.google.android.material.R.attr.materialButtonOutlinedStyle
        ).apply {
            text = "Delete"
            setTextColor(0xFFB00020.toInt())
            setOnClickListener {
                dialog.dismiss()
                confirmDeleteAccount(item)
            }
        }
        actions.addView(deleteBtn)

        content.addView(actions)
        card.addView(content)
        return card
    }

    private fun buildAccountSubtitle(account: AccountEntry, installedLocally: Boolean): String {
        val parts = mutableListOf(formatAccountType(account.type), formatAccountStatus(account.status))
        parts += if (installedLocally) "On this device" else "Cloud only"
        if (account.ownerPhone.isNotBlank()) {
            parts += account.ownerPhone
        }
        if (account.ownerEmail.isNotBlank()) {
            parts += account.ownerEmail
        }
        return parts.joinToString(" • ")
    }

    private fun canResumeAccount(account: AccountEntry): Boolean {
        val resumableAccountId = prefsManager.getString(AiImportService.PREF_RESUME_ACCOUNT_ID)
        return account.id == resumableAccountId &&
            account.status == "failed" &&
            AiImportService.hasResumableImport(prefsManager)
    }

    private fun switchToAccount(account: AccountEntry) {
        prefsManager.setAccountIdSync(account.id)
        prefsManager.setStoreNameSync(account.storeName)
        prefsManager.setEmailSync(account.ownerEmail)
        prefsManager.setOwnerPhoneSync(account.ownerPhone)
        accountRegistry.touchAccount(account.id)
        AppDatabase.resetInstance()
        restartApp()
    }

    private fun confirmDeleteAccount(item: AccountListItem) {
        val account = item.entry
        if (requiresProtectedDelete(account)) {
            showProtectedDeleteDialog(item)
            return
        }

        AlertDialog.Builder(this)
            .setTitle("Delete ${account.storeName}?")
            .setMessage(
                if (account.ownerEmail.isNotBlank() || account.ownerPhone.isNotBlank()) {
                    "This will archive the account in the cloud and remove it from this device."
                } else {
                    "This removes the local account and its data from this device."
                }
            )
            .setPositiveButton("Delete") { _, _ -> deleteLocalAccount(item) }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun deleteLocalAccount(
        item: AccountListItem,
        verificationPhone: String = "",
        ownerPin: String = ""
    ) {
        val account = item.entry
        lifecycleScope.launch {
            val hasCloudOwner = account.ownerEmail.isNotBlank() || account.ownerPhone.isNotBlank()
            if (requiresProtectedDelete(account)) {
                val localError = verifyProtectedDeleteLocally(
                    item = item,
                    verificationPhone = verificationPhone,
                    ownerPin = ownerPin
                )
                if (localError != null) {
                    Toast.makeText(this@SelectUserLoginActivity, localError, Toast.LENGTH_LONG).show()
                    return@launch
                }
            }

            if (hasCloudOwner && account.type != "demo") {
                val remoteDelete = ownerAccountCloudService.deleteAccount(
                    ownerPhone = account.ownerPhone,
                    ownerEmail = account.ownerEmail,
                    accountId = account.id,
                    verificationPhone = verificationPhone,
                    ownerPin = ownerPin
                )
                if (remoteDelete.isFailure) {
                    Toast.makeText(
                        this@SelectUserLoginActivity,
                        remoteDelete.exceptionOrNull()?.message ?: "Could not delete account in cloud",
                        Toast.LENGTH_LONG
                    ).show()
                    return@launch
                }
            }

            withContext(Dispatchers.IO) {
                if (item.installedLocally) {
                    applicationContext.deleteDatabase("POSTERITA_LITE_DB_${account.id}")
                    val dbPath = applicationContext.getDatabasePath("POSTERITA_LITE_DB_${account.id}").absolutePath
                    java.io.File("${dbPath}-wal").delete()
                    java.io.File("${dbPath}-shm").delete()
                    accountRegistry.removeAccount(account.id)
                }
                if (prefsManager.getString(AiImportService.PREF_RESUME_ACCOUNT_ID) == account.id) {
                    prefsManager.setString(AiImportService.PREF_RESUME_ACCOUNT_ID, "")
                    prefsManager.setString(AiImportService.PREF_IMPORT_TARGET_ACCOUNT_ID, "")
                }
            }

            if (item.installedLocally && account.id == prefsManager.accountId) {
                prefsManager.resetAccount()
                sessionManager.resetSession()
                val nextAccount = accountRegistry.getAllAccounts().firstOrNull()
                if (nextAccount != null) {
                    switchToAccount(nextAccount)
                } else {
                    startActivity(Intent(this@SelectUserLoginActivity, SetupWizardActivity::class.java))
                    finish()
                }
            } else {
                Toast.makeText(this@SelectUserLoginActivity, "${account.storeName} deleted", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private fun showEditAccountDialog(item: AccountListItem) {
        val account = item.entry

        val container = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(64, 32, 64, 16)
        }

        val nameLayout = TextInputLayout(this).apply { hint = "Business name" }
        val nameInput = TextInputEditText(this).apply { setText(account.storeName) }
        nameLayout.addView(nameInput)
        container.addView(nameLayout)

        val typeLayout = TextInputLayout(this).apply {
            hint = "Type (demo, trial, live)"
            setPadding(0, 16, 0, 0)
        }
        val typeInput = TextInputEditText(this).apply { setText(account.type) }
        typeLayout.addView(typeInput)
        container.addView(typeLayout)

        val statusLayout = TextInputLayout(this).apply {
            hint = "Status (testing, onboarding, active, failed)"
            setPadding(0, 16, 0, 0)
        }
        val statusInput = TextInputEditText(this).apply { setText(account.status) }
        statusLayout.addView(statusInput)
        container.addView(statusLayout)

        val dialog = AlertDialog.Builder(this)
            .setTitle("Edit Account")
            .setView(container)
            .setPositiveButton("Save", null)
            .setNegativeButton("Cancel", null)
            .create()

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val businessName = nameInput.text?.toString()?.trim().orEmpty()
                val type = normalizeAccountType(typeInput.text?.toString())
                val status = normalizeAccountStatus(statusInput.text?.toString())

                if (businessName.isBlank()) {
                    Toast.makeText(this, "Business name is required", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                if (type == null) {
                    Toast.makeText(this, "Type must be demo, trial, or live", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                if (status == null) {
                    Toast.makeText(this, "Status must be draft, in_progress, testing, onboarding, active, or failed", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                lifecycleScope.launch {
                    if ((account.ownerEmail.isNotBlank() || account.ownerPhone.isNotBlank()) &&
                        account.id != DemoDataSeeder.DEMO_ACCOUNT_ID
                    ) {
                        val remoteUpdate = ownerAccountCloudService.updateAccount(
                            ownerPhone = account.ownerPhone,
                            ownerEmail = account.ownerEmail,
                            accountId = account.id,
                            businessName = businessName,
                            type = type,
                            status = status
                        )
                        if (remoteUpdate.isFailure) {
                            Toast.makeText(
                                this@SelectUserLoginActivity,
                                remoteUpdate.exceptionOrNull()?.message ?: "Could not save account changes",
                                Toast.LENGTH_LONG
                            ).show()
                            return@launch
                        }
                    }

                    withContext(Dispatchers.IO) {
                        if (item.installedLocally) {
                            accountRegistry.addAccount(
                                id = account.id,
                                name = businessName,
                                storeName = businessName,
                                ownerEmail = account.ownerEmail,
                                ownerPhone = account.ownerPhone,
                                type = type,
                                status = status
                            )
                        }

                        if (item.installedLocally) {
                            val localDb = AppDatabase.getInstance(this@SelectUserLoginActivity, account.id)
                            val existingAccount = localDb.accountDao().getAccountById(account.id)
                            if (existingAccount != null) {
                                localDb.accountDao().insertAccounts(
                                    listOf(
                                        existingAccount.copy(
                                            businessname = businessName
                                        )
                                    )
                                )
                            }
                        }
                    }

                    if (prefsManager.accountId == account.id) {
                        prefsManager.setStoreNameSync(businessName)
                        prefsManager.setOwnerPhoneSync(account.ownerPhone)
                    }

                    dialog.dismiss()
                    Toast.makeText(this@SelectUserLoginActivity, "Account updated", Toast.LENGTH_SHORT).show()
                }
            }
        }

        dialog.show()
    }

    private fun importRemoteAccountToDevice(account: AccountEntry) {
        lifecycleScope.launch {
            val previousAccountId = prefsManager.accountId
            val previousStoreName = prefsManager.storeName
            val previousOwnerEmail = prefsManager.email
            val previousOwnerPhone = prefsManager.ownerPhone
            val imported = withContext(Dispatchers.IO) {
                try {
                    prefsManager.setAccountIdSync(account.id)
                    prefsManager.setStoreNameSync(account.storeName)
                    prefsManager.setTerminalIdSync(1)
                    prefsManager.setStoreIdSync(1)
                    prefsManager.setEmailSync(account.ownerEmail)
                    prefsManager.setOwnerPhoneSync(account.ownerPhone)
                    prefsManager.setStringSync("setup_completed", "true")
                    prefsManager.setStringSync("setup_mode", "standalone")

                    AppDatabase.resetInstance()
                    val localDb = AppDatabase.getInstance(this@SelectUserLoginActivity, account.id)
                    localDb.accountDao().insertAccounts(
                        listOf(
                            com.posterita.pos.android.data.local.entity.Account(
                                account_id = account.id,
                                businessname = account.storeName,
                                isactive = "Y"
                            )
                        )
                    )

                    accountRegistry.addAccount(
                        id = account.id,
                        name = account.storeName,
                        storeName = account.storeName,
                        ownerEmail = account.ownerEmail,
                        ownerPhone = account.ownerPhone,
                        type = account.type,
                        status = account.status
                    )

                    val cloudSyncService = CloudSyncService(localDb, prefsManager)
                    val syncResult = cloudSyncService.performSync(createCloudSyncApi())
                    syncResult.isSuccess
                } catch (e: Exception) {
                    false
                }
            }

            if (!imported) {
                prefsManager.setAccountIdSync(previousAccountId)
                prefsManager.setStoreNameSync(previousStoreName)
                prefsManager.setEmailSync(previousOwnerEmail)
                prefsManager.setOwnerPhoneSync(previousOwnerPhone)
                Toast.makeText(
                    this@SelectUserLoginActivity,
                    "Could not download account to this device yet",
                    Toast.LENGTH_LONG
                ).show()
                return@launch
            }

            accountRegistry.touchAccount(account.id)
            Toast.makeText(this@SelectUserLoginActivity, "${account.storeName} added to this device", Toast.LENGTH_SHORT).show()
            restartApp()
        }
    }

    private fun createCloudSyncApi(): CloudSyncApi {
        val cloudSyncUrl = prefsManager.cloudSyncUrl.trim().let {
            if (it.endsWith("/")) it else "$it/"
        }
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }
        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .build()

        return Retrofit.Builder()
            .baseUrl(cloudSyncUrl)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(CloudSyncApi::class.java)
    }

    private fun syncRegistryImportState() {
        val targetAccountId = prefsManager.getString(AiImportService.PREF_IMPORT_TARGET_ACCOUNT_ID)
        if (targetAccountId.isBlank()) return

        val storeName = prefsManager.getString(AiImportService.PREF_IMPORT_STORE_NAME)
        if (storeName.isNotBlank()) {
            accountRegistry.updateStoreName(targetAccountId, storeName)
        }

        when {
            prefsManager.getString(AiImportService.PREF_IMPORT_RUNNING) == "true" ->
                accountRegistry.updateStatus(targetAccountId, "in_progress")
            prefsManager.getString(AiImportService.PREF_IMPORT_ACCOUNT_ID) == targetAccountId ->
                accountRegistry.updateStatus(
                    targetAccountId,
                    defaultStatusForType(
                        accountRegistry.getAccount(targetAccountId)?.type
                            ?: prefsManager.getString(AiImportService.PREF_RESUME_ACCOUNT_TYPE, "trial")
                    )
                )
            prefsManager.getString(AiImportService.PREF_RESUME_ACCOUNT_ID) == targetAccountId &&
                AiImportService.hasResumableImport(prefsManager) ->
                accountRegistry.updateStatus(targetAccountId, "failed")
        }
    }

    private fun formatAccountType(value: String): String = when (value.lowercase()) {
        "demo" -> "Demo"
        "trial" -> "Trial"
        "live" -> "Live"
        else -> value.replaceFirstChar { it.uppercase() }
    }

    private fun formatAccountStatus(value: String): String = when (value.lowercase()) {
        "in_progress" -> "In progress"
        "testing" -> "Testing"
        "onboarding" -> "Onboarding"
        "active" -> "Active"
        "failed" -> "Failed"
        "draft" -> "Draft"
        "archived" -> "Archived"
        else -> value.replace('_', ' ').replaceFirstChar { it.uppercase() }
    }

    private fun defaultStatusForType(type: String): String = when (type.lowercase()) {
        "live" -> "onboarding"
        "trial", "demo" -> "testing"
        else -> "draft"
    }

    private fun normalizeAccountType(value: String?): String? {
        return value?.trim()?.lowercase()?.takeIf { it in setOf("demo", "trial", "live") }
    }

    private fun normalizeAccountStatus(value: String?): String? {
        return value?.trim()?.lowercase()?.takeIf {
            it in setOf("draft", "in_progress", "testing", "onboarding", "active", "failed")
        }
    }

    private fun requiresProtectedDelete(account: AccountEntry): Boolean {
        return account.status in setOf("onboarding", "active")
    }

    private fun showProtectedDeleteDialog(item: AccountListItem) {
        val account = item.entry
        val container = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(64, 32, 64, 16)
        }

        val phoneLayout = TextInputLayout(this).apply { hint = "Owner phone" }
        val phoneInput = TextInputEditText(this).apply {
            inputType = InputType.TYPE_CLASS_PHONE
            setText(account.ownerPhone.ifBlank { prefsManager.ownerPhone })
        }
        phoneLayout.addView(phoneInput)
        container.addView(phoneLayout)

        val pinLayout = TextInputLayout(this).apply {
            hint = "Owner PIN"
            setPadding(0, 16, 0, 0)
            endIconMode = TextInputLayout.END_ICON_PASSWORD_TOGGLE
        }
        val pinInput = TextInputEditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
        }
        pinLayout.addView(pinInput)
        container.addView(pinLayout)

        AlertDialog.Builder(this)
            .setTitle("Verify deletion")
            .setMessage("This account has moved past testing. Enter the owner phone and PIN to archive it.")
            .setView(container)
            .setPositiveButton("Delete", null)
            .setNegativeButton("Cancel", null)
            .create()
            .also { dialog ->
                dialog.setOnShowListener {
                    dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                        val verificationPhone = phoneInput.text?.toString()?.trim().orEmpty()
                        val ownerPin = pinInput.text?.toString()?.trim().orEmpty()

                        if (verificationPhone.isBlank()) {
                            Toast.makeText(this, "Owner phone is required", Toast.LENGTH_SHORT).show()
                            return@setOnClickListener
                        }
                        if (ownerPin.length < 4) {
                            Toast.makeText(this, "Owner PIN is required", Toast.LENGTH_SHORT).show()
                            return@setOnClickListener
                        }

                        dialog.dismiss()
                        deleteLocalAccount(
                            item = item,
                            verificationPhone = verificationPhone,
                            ownerPin = ownerPin
                        )
                    }
                }
            }
            .show()
    }

    private suspend fun verifyProtectedDeleteLocally(
        item: AccountListItem,
        verificationPhone: String,
        ownerPin: String
    ): String? {
        val account = item.entry
        val normalizedPhone = verificationPhone.trim().replace("\\s+".toRegex(), "")
        val expectedPhone = account.ownerPhone.ifBlank { prefsManager.ownerPhone }
        if (expectedPhone.isNotBlank() && normalizedPhone != expectedPhone) {
            return "Owner phone does not match this account"
        }
        if (!item.installedLocally) {
            return null
        }

        val localDb = AppDatabase.getInstance(this@SelectUserLoginActivity, account.id)
        val owner = localDb.userDao().getOwner()
        if (owner == null) {
            return "Owner record is missing on this device"
        }
        if (owner.pin != ownerPin) {
            return "Owner PIN is incorrect"
        }
        val ownerLocalPhone = owner.phone1.orEmpty().trim().replace("\\s+".toRegex(), "")
        if (ownerLocalPhone.isNotBlank() && ownerLocalPhone != normalizedPhone) {
            return "Owner phone does not match the device record"
        }
        return null
    }

    private fun checkBiometricAvailability() {
        val biometricManager = BiometricManager.from(this)
        canUseBiometric = when (biometricManager.canAuthenticate(
            BiometricManager.Authenticators.BIOMETRIC_STRONG or
            BiometricManager.Authenticators.BIOMETRIC_WEAK
        )) {
            BiometricManager.BIOMETRIC_SUCCESS -> true
            else -> false
        }
    }

    private fun setupBiometricPrompt() {
        val executor = ContextCompat.getMainExecutor(this)

        biometricPrompt = BiometricPrompt(this, executor,
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    super.onAuthenticationSucceeded(result)
                    userSelectionViewModel.onBiometricAuthSuccess()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    super.onAuthenticationError(errorCode, errString)
                    if (errorCode != BiometricPrompt.ERROR_USER_CANCELED &&
                        errorCode != BiometricPrompt.ERROR_NEGATIVE_BUTTON &&
                        errorCode != BiometricPrompt.ERROR_CANCELED
                    ) {
                        Toast.makeText(
                            this@SelectUserLoginActivity,
                            getString(R.string.biometric_auth_failed),
                            Toast.LENGTH_SHORT
                        ).show()
                    }
                }

                override fun onAuthenticationFailed() {
                    super.onAuthenticationFailed()
                }
            })

        promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(getString(R.string.biometric_prompt_title))
            .setSubtitle(getString(R.string.biometric_prompt_subtitle))
            .setNegativeButtonText(getString(R.string.biometric_prompt_negative))
            .build()
    }

    private fun setupUserGrid() {
        binding.recyclerViewUsers.layoutManager = GridLayoutManager(this, 3)
    }

    private fun setupChangeUser() {
        binding.textChangeUser.setOnClickListener {
            showPhaseUserSelect()
        }
    }

    private fun showPhaseUserSelect() {
        selectedUser = null
        pinString = ""
        updatePinBoxes()
        binding.layoutPhaseUserSelect.visibility = View.VISIBLE
        binding.layoutPhasePin.visibility = View.GONE
        binding.toolbarTitle.text = "Select User"
    }

    private fun showPhasePin(user: User) {
        selectedUser = user
        pinString = ""
        updatePinBoxes()

        val initial = (user.username ?: "?").first().uppercaseChar().toString()
        binding.textSelectedUserInitial.text = initial
        binding.textSelectedUserName.text = user.username ?: ""

        binding.layoutPhaseUserSelect.visibility = View.GONE
        binding.layoutPhasePin.visibility = View.VISIBLE
        binding.toolbarTitle.text = "Enter PIN"

        // Show demo PIN hint only for demo account
        val isDemoAccount = prefsManager.accountId == DemoDataSeeder.DEMO_ACCOUNT_ID
        binding.textDemoPinHint.visibility = if (isDemoAccount) View.VISIBLE else View.GONE

        // Show "Forgot PIN?" only for owner
        if (user.isOwner && !user.email.isNullOrBlank()) {
            binding.textForgotPin.visibility = View.VISIBLE
            binding.textForgotPin.setOnClickListener { showForgotPinDialog(user) }
        } else {
            binding.textForgotPin.visibility = View.GONE
        }

        // Show biometric if this user is enrolled
        updateBiometricButtonVisibility(user)

        // Auto-trigger biometric if this user is enrolled
        if (canUseBiometric && userSelectionViewModel.isBiometricEnrolled() &&
            userSelectionViewModel.getBiometricEnrolledUserId() == user.user_id) {
            showBiometricPrompt()
        }
    }

    private fun getPinBoxes(): List<TextView> {
        return listOf(
            findViewById(R.id.pin_box_1),
            findViewById(R.id.pin_box_2),
            findViewById(R.id.pin_box_3),
            findViewById(R.id.pin_box_4),
            findViewById(R.id.pin_box_5),
            findViewById(R.id.pin_box_6)
        )
    }

    private fun updatePinBoxes() {
        val boxes = getPinBoxes()
        for (i in boxes.indices) {
            boxes[i].text = if (i < pinString.length) "\u2022" else ""
            boxes[i].setBackgroundResource(
                if (i == pinString.length) R.drawable.chip_selected_bg
                else R.drawable.btn_outline_rounded
            )
        }
        // Keep hidden EditText in sync for compatibility
        binding.edtPsdInput.setText(pinString)
    }

    private fun setupPinNumpad() {
        binding.edtPsdInput.showSoftInputOnFocus = false

        val appendDigit = fun(digit: String) {
            if (pinString.length >= PIN_LENGTH) return
            pinString += digit
            updatePinBoxes()

            // Auto-login when all 6 digits entered
            if (pinString.length == PIN_LENGTH) {
                attemptLogin()
            }
        }

        binding.pinBtn1?.setOnClickListener { appendDigit("1") }
        binding.pinBtn2?.setOnClickListener { appendDigit("2") }
        binding.pinBtn3?.setOnClickListener { appendDigit("3") }
        binding.pinBtn4?.setOnClickListener { appendDigit("4") }
        binding.pinBtn5?.setOnClickListener { appendDigit("5") }
        binding.pinBtn6?.setOnClickListener { appendDigit("6") }
        binding.pinBtn7?.setOnClickListener { appendDigit("7") }
        binding.pinBtn8?.setOnClickListener { appendDigit("8") }
        binding.pinBtn9?.setOnClickListener { appendDigit("9") }
        binding.pinBtn0?.setOnClickListener { appendDigit("0") }

        binding.pinBtnClear?.setOnClickListener {
            pinString = ""
            updatePinBoxes()
        }

        binding.pinBtnBackspace?.setOnClickListener {
            if (pinString.isNotEmpty()) {
                pinString = pinString.dropLast(1)
                updatePinBoxes()
            }
        }

        updatePinBoxes()
    }

    private fun attemptLogin() {
        val user = selectedUser ?: return
        userSelectionViewModel.validatePin(user, pinString)
    }

    private fun setupBiometricButton() {
        binding.btnBiometric.setOnClickListener {
            showBiometricPrompt()
        }
    }

    private fun showBiometricPrompt() {
        biometricPrompt.authenticate(promptInfo)
    }

    private fun updateBiometricButtonVisibility(user: User? = selectedUser) {
        if (canUseBiometric && userSelectionViewModel.isBiometricEnrolled() &&
            user != null && userSelectionViewModel.getBiometricEnrolledUserId() == user.user_id) {
            binding.btnBiometric.visibility = View.VISIBLE
        } else {
            binding.btnBiometric.visibility = View.GONE
        }
    }

    private fun observeViewModel() {
        userSelectionViewModel.users.observe(this) { users ->
            userList = users
            binding.recyclerViewUsers.adapter = UserGridAdapter(users) { user ->
                showPhasePin(user)
            }

            // If biometric is enrolled, auto-navigate to PIN phase for that user
            if (canUseBiometric && userSelectionViewModel.isBiometricEnrolled()) {
                val enrolledUserId = userSelectionViewModel.getBiometricEnrolledUserId()
                val enrolledUser = users.find { it.user_id == enrolledUserId }
                if (enrolledUser != null) {
                    showPhasePin(enrolledUser)
                }
            }
        }

        userSelectionViewModel.loginResult.observe(this) { result ->
            result.fold(
                onSuccess = { user ->
                    sessionManager.user = user
                    if (canUseBiometric && !userSelectionViewModel.isBiometricEnrolled()) {
                        userSelectionViewModel.checkShouldPromptBiometricEnrollment(user, canUseBiometric)
                    } else {
                        navigateToTill()
                    }
                },
                onFailure = { error ->
                    Toast.makeText(
                        this,
                        error.message ?: "Incorrect PIN",
                        Toast.LENGTH_SHORT
                    ).show()
                    pinString = ""
                    updatePinBoxes()
                }
            )
        }

        userSelectionViewModel.biometricLoginResult.observe(this) { result ->
            result.fold(
                onSuccess = { user ->
                    sessionManager.user = user
                    navigateToTill()
                },
                onFailure = { error ->
                    Toast.makeText(
                        this,
                        error.message ?: getString(R.string.biometric_auth_failed),
                        Toast.LENGTH_SHORT
                    ).show()
                    updateBiometricButtonVisibility()
                }
            )
        }

        userSelectionViewModel.promptBiometricEnrollment.observe(this) { user ->
            showBiometricEnrollmentDialog(user)
        }
    }

    private fun showBiometricEnrollmentDialog(user: User) {
        AlertDialog.Builder(this)
            .setTitle(getString(R.string.biometric_enroll_title))
            .setMessage(getString(R.string.biometric_enroll_message))
            .setPositiveButton("Yes") { _, _ ->
                userSelectionViewModel.enrollBiometric(user)
                navigateToTill()
            }
            .setNegativeButton("No") { _, _ ->
                navigateToTill()
            }
            .setCancelable(false)
            .show()
    }

    private fun showForgotPinDialog(user: User) {
        val container = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(64, 32, 64, 16)
        }

        val tvPrompt = TextView(this).apply {
            text = "Enter your registered email address to verify your identity and reset your PIN."
            textSize = 14f
            setPadding(0, 0, 0, 16)
        }
        container.addView(tvPrompt)

        val tilEmail = TextInputLayout(this).apply {
            hint = "Email address"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }
        val etEmail = TextInputEditText(this).apply {
            inputType = InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
        }
        tilEmail.addView(etEmail)
        container.addView(tilEmail)

        val dialog = AlertDialog.Builder(this)
            .setTitle("Reset PIN")
            .setView(container)
            .setPositiveButton("Verify", null)
            .setNegativeButton("Cancel", null)
            .create()

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val email = etEmail.text?.toString()?.trim() ?: ""
                if (email.isEmpty()) {
                    Toast.makeText(this, "Please enter your email", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                if (!email.equals(user.email, ignoreCase = true)) {
                    Toast.makeText(this, "Email does not match the owner account", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                dialog.dismiss()
                showResetPinDialog(user)
            }
        }
        dialog.show()
    }

    private fun showResetPinDialog(user: User) {
        val container = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(64, 32, 64, 16)
        }

        val tilNewPin = TextInputLayout(this).apply {
            hint = "New PIN (6 digits)"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }
        val etNewPin = TextInputEditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
            maxLines = 1
        }
        tilNewPin.addView(etNewPin)
        container.addView(tilNewPin)

        val tilConfirmPin = TextInputLayout(this).apply {
            hint = "Confirm New PIN"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = 16 }
        }
        val etConfirmPin = TextInputEditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
            maxLines = 1
        }
        tilConfirmPin.addView(etConfirmPin)
        container.addView(tilConfirmPin)

        val dialog = AlertDialog.Builder(this)
            .setTitle("Set New PIN")
            .setView(container)
            .setPositiveButton("Save", null)
            .setNegativeButton("Cancel", null)
            .create()

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val newPin = etNewPin.text?.toString()?.trim() ?: ""
                val confirmPin = etConfirmPin.text?.toString()?.trim() ?: ""

                if (newPin.length < 6) {
                    Toast.makeText(this, "PIN must be 6 digits", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                if (newPin != confirmPin) {
                    Toast.makeText(this, "PINs do not match", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                lifecycleScope.launch {
                    withContext(Dispatchers.IO) {
                        val updated = user.copy(pin = newPin, password = newPin)
                        db.userDao().updateUser(updated)
                    }
                    dialog.dismiss()
                    // Update the selected user reference
                    selectedUser = user.copy(pin = newPin, password = newPin)
                    Toast.makeText(this@SelectUserLoginActivity, "PIN reset successfully", Toast.LENGTH_SHORT).show()
                    pinString = ""
                    updatePinBoxes()
                }
            }
        }
        dialog.show()
    }

    private fun navigateToTill() {
        accountRegistry.touchAccount(prefsManager.accountId)
        // Navigate to the retailOS Home screen (super app grid)
        val intent = Intent(this, HomeActivity::class.java)
        startActivity(intent)
        finish()
    }

    override fun onBackPressed() {
        // If on PIN phase, go back to user selection
        if (binding.layoutPhasePin.visibility == View.VISIBLE) {
            showPhaseUserSelect()
        } else {
            super.onBackPressed()
        }
    }

    override fun onCreateOptionsMenu(menu: android.view.Menu?): Boolean {
        menu?.add(0, MENU_LOGOUT, 0, "Log Out")
        return true
    }

    override fun onOptionsItemSelected(item: android.view.MenuItem): Boolean {
        return when (item.itemId) {
            MENU_LOGOUT -> {
                prefsManager.clearBiometricEnrollment()
                prefsManager.resetAccount()
                sessionManager.resetSession()
                val intent = Intent(this, SignInActivity::class.java)
                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(intent)
                finish()
                true
            }
            else -> super.onOptionsItemSelected(item)
        }
    }

    // ======= USER GRID ADAPTER =======
    private class UserGridAdapter(
        private val users: List<User>,
        private val onClick: (User) -> Unit
    ) : RecyclerView.Adapter<UserGridAdapter.ViewHolder>() {

        class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val textInitial: TextView = view.findViewById(R.id.text_user_initial)
            val textName: TextView = view.findViewById(R.id.text_user_name)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_user, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val user = users[position]
            val name = user.username ?: "?"
            holder.textInitial.text = name.first().uppercaseChar().toString()
            holder.textName.text = name
            holder.itemView.setOnClickListener { onClick(user) }
        }

        override fun getItemCount() = users.size
    }
}
