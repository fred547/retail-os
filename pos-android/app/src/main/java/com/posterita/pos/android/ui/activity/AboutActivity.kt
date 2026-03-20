package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.provider.Settings
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

        // Top bar: hamburger menu to open drawer
        binding.buttonBack.setImageResource(R.drawable.ic_drawer)
        binding.buttonBack.setOnClickListener { openDrawer() }

        setupDrawerNavigation()
        setupConnectivityDot()
        displayInfo()
    }

    private fun displayInfo() {
        // Version info
        try {
            val packageInfo = packageManager.getPackageInfo(packageName, 0)
            binding.textViewVersionNameValue.text = packageInfo.versionName ?: "N/A"
            binding.textViewVersionCodeValue.text = packageInfo.longVersionCode.toString()
        } catch (e: Exception) {
            binding.textViewVersionNameValue.text = "N/A"
            binding.textViewVersionCodeValue.text = "N/A"
        }

        // Device ID
        val deviceId = Settings.Secure.getString(contentResolver, Settings.Secure.ANDROID_ID) ?: "N/A"
        binding.textViewDeviceIdValue.text = deviceId

        // Support info — website from account if available
        val account = sessionManager.account
        val website = account?.website
        if (!website.isNullOrBlank()) {
            binding.textViewWebsiteValue.text = website
        }
    }
}
