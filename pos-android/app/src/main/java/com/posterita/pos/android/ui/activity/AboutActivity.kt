package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.provider.Settings
import android.widget.TextView
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ActivityAboutBinding
import com.posterita.pos.android.util.SessionManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class AboutActivity : BaseDrawerActivity() {

    private lateinit var binding: ActivityAboutBinding
    @Inject lateinit var sessionManager: SessionManager

    override fun getDrawerHighlightId(): Int = R.id.nav_about

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentViewWithDrawer(R.layout.activity_about)
        binding = ActivityAboutBinding.bind(drawerLayout.getChildAt(0))

        binding.buttonBack.setImageResource(R.drawable.ic_drawer)
        binding.buttonBack.setOnClickListener { openDrawer() }

        setupDrawerNavigation()
        setupConnectivityDot()
        displayInfo()
    }

    private fun displayInfo() {
        // Current session
        val account = sessionManager.account
        findViewById<TextView>(R.id.tv_brand_value)?.text = account?.businessname ?: "N/A"
        findViewById<TextView>(R.id.tv_store_value)?.text = prefsManager.storeName.ifBlank { "N/A" }
        findViewById<TextView>(R.id.tv_terminal_value)?.text = prefsManager.terminalName.ifBlank { "N/A" }
        val user = sessionManager.user
        val userName = listOfNotNull(user?.firstname, user?.lastname)
            .joinToString(" ").ifBlank { user?.username ?: "N/A" }
        findViewById<TextView>(R.id.tv_user_value)?.text = userName
        findViewById<TextView>(R.id.tv_currency_value)?.text = account?.currency ?: "N/A"

        // Version info
        try {
            val packageInfo = packageManager.getPackageInfo(packageName, 0)
            binding.textViewVersionNameValue.text = packageInfo.versionName ?: "N/A"
            @Suppress("DEPRECATION")
            binding.textViewVersionCodeValue.text = if (android.os.Build.VERSION.SDK_INT >= 28) {
                packageInfo.longVersionCode.toString()
            } else {
                packageInfo.versionCode.toString()
            }
        } catch (e: Exception) {
            binding.textViewVersionNameValue.text = "N/A"
            binding.textViewVersionCodeValue.text = "N/A"
        }

        // Device ID
        val deviceId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: "N/A"
        binding.textViewDeviceIdValue.text = deviceId

        // Support — website from account if available
        val website = account?.website
        if (!website.isNullOrBlank()) {
            binding.textViewWebsiteValue.text = website
        }
    }
}
