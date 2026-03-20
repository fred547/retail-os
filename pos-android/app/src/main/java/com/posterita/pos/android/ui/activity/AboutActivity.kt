package com.posterita.pos.android.ui.activity

import android.os.Bundle
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

        // Set up toolbar with hamburger menu
        binding.toolbar.setNavigationIcon(R.drawable.ic_drawer)
        binding.toolbar.setNavigationOnClickListener { openDrawer() }

        setupDrawerNavigation()
        displayInfo()
    }

    private fun displayInfo() {
        val account = sessionManager.account

        binding.textViewAccountNameValue.text = account?.businessname ?: ""
        binding.textViewCurrencyValue.text = account?.currency ?: ""
        binding.textViewStoreNameValue.text = prefsManager.storeName
        binding.textViewTerminalNameValue.text = prefsManager.terminalName

        try {
            val packageInfo = packageManager.getPackageInfo(packageName, 0)
            binding.textViewVersionCodeValue.text = packageInfo.longVersionCode.toString()
            binding.textViewVersionNameValue.text = packageInfo.versionName ?: ""
        } catch (e: Exception) {
            binding.textViewVersionCodeValue.text = "N/A"
            binding.textViewVersionNameValue.text = "N/A"
        }

        binding.textViewLastSyncDateValue.text = prefsManager.syncDate
    }
}
