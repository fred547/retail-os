package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.View
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ActivitySettingsBinding
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class SettingsActivity : BaseDrawerActivity() {

    private lateinit var binding: ActivitySettingsBinding

    override fun getDrawerHighlightId(): Int = R.id.nav_settings

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentViewWithDrawer(R.layout.activity_settings)
        binding = ActivitySettingsBinding.bind(drawerLayout.getChildAt(0))

        // Set up toolbar with hamburger menu
        binding.toolbar.setNavigationIcon(R.drawable.ic_drawer)
        binding.toolbar.setNavigationOnClickListener { openDrawer() }

        setupDrawerNavigation()

        binding.posCustomization.setOnClickListener {
            startActivity(Intent(this, PosCustomizationActivity::class.java))
        }

        binding.printersOption.setOnClickListener {
            startActivity(Intent(this, PrintersActivity::class.java))
        }

        binding.about.setOnClickListener {
            startActivity(Intent(this, AboutActivity::class.java))
        }

        binding.debugger.setOnClickListener {
            // Navigate to debugger activity if available
        }

        binding.nfc.setOnClickListener {
            startActivity(Intent(this, NfcActivity::class.java))
        }

        setupLoyaltySettings()
    }

    private fun setupLoyaltySettings() {
        // Initialize loyalty toggle
        binding.switchLoyaltyEnabled.isChecked = prefsManager.loyaltyEnabled
        binding.switchLoyaltyEnabled.setOnCheckedChangeListener { _, isChecked ->
            prefsManager.loyaltyEnabled = isChecked
            updateLoyaltyFieldsVisibility(isChecked)
        }

        // Initialize loyalty API URL
        binding.editLoyaltyApiUrl.setText(prefsManager.loyaltyApiBaseUrl)
        binding.editLoyaltyApiUrl.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) {
                val url = binding.editLoyaltyApiUrl.text?.toString()?.trim()
                if (!url.isNullOrEmpty()) {
                    prefsManager.loyaltyApiBaseUrl = url
                }
            }
        }

        // Initialize loyalty account key
        binding.editLoyaltyAccountKey.setText(prefsManager.loyaltyAccountKey)
        binding.editLoyaltyAccountKey.setOnFocusChangeListener { _, hasFocus ->
            if (!hasFocus) {
                val key = binding.editLoyaltyAccountKey.text?.toString()?.trim() ?: ""
                prefsManager.loyaltyAccountKey = key
            }
        }

        updateLoyaltyFieldsVisibility(prefsManager.loyaltyEnabled)
    }

    private fun updateLoyaltyFieldsVisibility(enabled: Boolean) {
        val visibility = if (enabled) View.VISIBLE else View.GONE
        binding.layoutLoyaltyApiUrl.visibility = visibility
        binding.layoutLoyaltyAccountKey.visibility = visibility
    }
}
