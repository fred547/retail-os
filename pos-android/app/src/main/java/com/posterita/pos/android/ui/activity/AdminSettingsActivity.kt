package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.text.InputType
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.databinding.ActivityAdminSettingsBinding
import com.posterita.pos.android.util.LocalAccountRegistry
import com.posterita.pos.android.util.SessionManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

/**
 * Admin Settings hub — allows full local configuration of the POS system
 * without needing the web backoffice.
 */
@AndroidEntryPoint
class AdminSettingsActivity : BaseDrawerActivity() {

    private lateinit var binding: ActivityAdminSettingsBinding

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var sessionManager: SessionManager
    override fun getDrawerHighlightId(): Int = R.id.nav_admin_settings

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentViewWithDrawer(R.layout.activity_admin_settings)
        binding = ActivityAdminSettingsBinding.bind(drawerLayout.getChildAt(0))

        // Replace toolbar navigation icon with drawer open
        binding.toolbar.setNavigationIcon(R.drawable.ic_drawer)
        binding.toolbar.setNavigationOnClickListener { openDrawer() }
        expandToolbarNavigationTouchTarget(binding.toolbar, extraPaddingDp = 20)

        setupDrawerNavigation()

        // Show restaurant section only in restaurant mode
        if (prefsManager.isRestaurant) {
            binding.tvRestaurantSection.visibility = View.VISIBLE
            binding.cardTables.visibility = View.VISIBLE
        }

        binding.cardStoreConfig.setOnClickListener {
            startActivity(Intent(this, ManageStoreActivity::class.java))
        }
        binding.cardTerminalConfig.setOnClickListener {
            startActivity(Intent(this, ManageTerminalActivity::class.java))
        }
        binding.cardProducts.setOnClickListener {
            startActivity(Intent(this, ManageProductsActivity::class.java))
        }
        binding.cardCategories.setOnClickListener {
            startActivity(Intent(this, ManageCategoriesActivity::class.java))
        }
        binding.cardBulkImport.setOnClickListener {
            startActivity(Intent(this, BulkProductImportActivity::class.java))
        }
        binding.cardTax.setOnClickListener {
            startActivity(Intent(this, ManageTaxActivity::class.java))
        }
        binding.cardUsers.setOnClickListener {
            startActivity(Intent(this, ManageUsersActivity::class.java))
        }
        binding.cardTables.setOnClickListener {
            startActivity(Intent(this, ManageTablesActivity::class.java))
        }

        // Price review (staff-set prices)
        setupPriceReview()

        // Checkout — Require Customer toggle
        binding.switchRequireCustomer.isChecked = prefsManager.requireCustomerBeforeCheckout
        binding.switchRequireCustomer.setOnCheckedChangeListener { _, isChecked ->
            prefsManager.requireCustomerBeforeCheckout = isChecked
        }

        // Security — Account Switching toggle
        binding.switchAccountSwitching.isChecked = prefsManager.accountSwitchingEnabled
        binding.switchAccountSwitching.setOnCheckedChangeListener { _, isChecked ->
            prefsManager.accountSwitchingEnabled = isChecked
        }

        // Delete Account — only visible to owner
        setupDeleteAccount()
    }

    private fun setupDeleteAccount() {
        val currentUser = sessionManager.user ?: return
        if (currentUser.isOwner) {
            binding.cardDeleteAccount.visibility = View.VISIBLE
            binding.cardDeleteAccount.setOnClickListener { showDeleteAccountDialog() }
        }
    }

    private fun showDeleteAccountDialog() {
        AlertDialog.Builder(this)
            .setTitle("Delete Account")
            .setMessage("This will permanently delete this account and ALL its data (products, orders, users, settings).\n\nThis action CANNOT be undone.\n\nAre you sure you want to continue?")
            .setPositiveButton("Continue") { _, _ -> showPinVerificationForDelete() }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun showPinVerificationForDelete() {
        val container = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(64, 32, 64, 16)
        }

        val tvPrompt = android.widget.TextView(this).apply {
            text = "Enter your PIN to confirm account deletion"
            textSize = 14f
            setPadding(0, 0, 0, 16)
        }
        container.addView(tvPrompt)

        val tilPin = TextInputLayout(this).apply {
            hint = "Owner PIN"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        val etPin = TextInputEditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
            maxLines = 1
        }
        tilPin.addView(etPin)
        container.addView(tilPin)

        val dialog = AlertDialog.Builder(this)
            .setTitle("Verify PIN")
            .setView(container)
            .setPositiveButton("Delete Account", null)
            .setNegativeButton("Cancel", null)
            .create()

        dialog.setOnShowListener {
            val deleteBtn = dialog.getButton(AlertDialog.BUTTON_POSITIVE)
            deleteBtn.setTextColor(getColor(android.R.color.holo_red_dark))
            deleteBtn.setOnClickListener {
                val pin = etPin.text?.toString()?.trim() ?: ""
                val owner = sessionManager.user
                if (owner == null || !owner.isOwner) {
                    Toast.makeText(this, "Only the owner can delete this account", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                if (pin != owner.pin) {
                    Toast.makeText(this, "Incorrect PIN", Toast.LENGTH_SHORT).show()
                    etPin.text?.clear()
                    return@setOnClickListener
                }
                dialog.dismiss()
                performAccountDeletion()
            }
        }
        dialog.show()
    }

    private fun performAccountDeletion() {
        val accountId = prefsManager.accountId

        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                // Delete the database file
                val dbName = "POSTERITA_LITE_DB_$accountId"
                applicationContext.deleteDatabase(dbName)
                AppDatabase.resetInstance()

                // Remove from account registry
                accountRegistry.removeAccount(accountId)

                // Clear all preferences
                prefsManager.clearBiometricEnrollment()
                prefsManager.resetAccount()
                sessionManager.resetSession()
            }

            Toast.makeText(this@AdminSettingsActivity, "Account deleted", Toast.LENGTH_SHORT).show()

            // Check if there are remaining accounts to switch to
            val remaining = accountRegistry.getAllAccounts()
            if (remaining.isNotEmpty()) {
                // Switch to the first remaining account
                prefsManager.accountId = remaining.first().id
                prefsManager.storeName = remaining.first().storeName
                prefsManager.email = remaining.first().ownerEmail
            }

            // Restart the app
            val intent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
            }
            startActivity(intent)
            finish()
            Runtime.getRuntime().exit(0)
        }
    }

    private fun setupPriceReview() {
        lifecycleScope.launch {
            val count = withContext(Dispatchers.IO) {
                db.productDao().countProductsNeedingPriceReview()
            }
            if (count > 0) {
                binding.cardReviewPrices.visibility = View.VISIBLE
                binding.tvReviewPricesBadge.text = count.toString()
                binding.tvReviewPricesDesc.text =
                    "$count product${if (count > 1) "s" else ""} priced by staff — tap to review"
                binding.cardReviewPrices.setOnClickListener { showPriceReviewDialog() }
            }
        }
    }

    private fun showPriceReviewDialog() {
        lifecycleScope.launch {
            val products = withContext(Dispatchers.IO) {
                db.productDao().getProductsNeedingPriceReview()
            }
            if (products.isEmpty()) {
                Toast.makeText(this@AdminSettingsActivity, "No products to review", Toast.LENGTH_SHORT).show()
                binding.cardReviewPrices.visibility = View.GONE
                return@launch
            }

            val users = withContext(Dispatchers.IO) { db.userDao().getAllUsers() }
            val userMap = users.associateBy { it.user_id }

            // Build list items: "Product Name — $12.50 (set by John)"
            val items = products.map { p ->
                val setBy = userMap[p.price_set_by]
                val userName = setBy?.let { "${it.firstname ?: ""} ${it.lastname ?: ""}".trim() }
                    ?.ifBlank { setBy.username ?: "Staff" } ?: "Staff"
                "${p.name ?: "Unknown"} — ${com.posterita.pos.android.util.NumberUtils.formatPrice(p.sellingprice)} (set by $userName)"
            }.toTypedArray()

            val checkedItems = BooleanArray(products.size) { true } // All approved by default

            AlertDialog.Builder(this@AdminSettingsActivity)
                .setTitle("Review Staff-Set Prices")
                .setMultiChoiceItems(items, checkedItems) { _, which, isChecked ->
                    checkedItems[which] = isChecked
                }
                .setPositiveButton("Approve Selected") { _, _ ->
                    lifecycleScope.launch(Dispatchers.IO) {
                        for (i in products.indices) {
                            if (checkedItems[i]) {
                                // Owner approves — clear the review flag
                                db.productDao().clearPriceReviewFlag(products[i].product_id)
                            }
                        }
                        withContext(Dispatchers.Main) {
                            val approved = checkedItems.count { it }
                            Toast.makeText(
                                this@AdminSettingsActivity,
                                "$approved price${if (approved > 1) "s" else ""} approved",
                                Toast.LENGTH_SHORT
                            ).show()
                            setupPriceReview() // Refresh the card
                        }
                    }
                }
                .setNeutralButton("Approve All") { _, _ ->
                    lifecycleScope.launch(Dispatchers.IO) {
                        db.productDao().clearAllPriceReviewFlags()
                        withContext(Dispatchers.Main) {
                            Toast.makeText(
                                this@AdminSettingsActivity,
                                "All prices approved",
                                Toast.LENGTH_SHORT
                            ).show()
                            binding.cardReviewPrices.visibility = View.GONE
                        }
                    }
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

}
