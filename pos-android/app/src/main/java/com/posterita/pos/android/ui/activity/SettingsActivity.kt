package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.TextView
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ActivitySettingsBinding
import com.posterita.pos.android.util.SessionManager
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class SettingsActivity : BaseDrawerActivity() {

    private lateinit var binding: ActivitySettingsBinding
    @Inject lateinit var sessionManager: SessionManager

    override fun getDrawerHighlightId(): Int = R.id.nav_settings

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentViewWithDrawer(R.layout.activity_settings)
        binding = ActivitySettingsBinding.bind(drawerLayout.getChildAt(0))

        binding.buttonBack.setOnClickListener { finish() }

        setupDrawerNavigation()

        // Web Console — all data managed via embedded web console
        binding.storesOption.setOnClickListener { openWebConsole("/stores", "Stores") }
        binding.terminalsOption.setOnClickListener { openWebConsole("/terminals", "Terminals") }
        binding.productsOption.setOnClickListener { openWebConsole("/products", "Products") }
        binding.categoriesOption.setOnClickListener { openWebConsole("/categories", "Categories") }
        binding.usersOption.setOnClickListener { openWebConsole("/users", "Users") }
        binding.taxesOption.setOnClickListener { openWebConsole("/settings", "Taxes") }

        // Device — local config only
        binding.printersOption.setOnClickListener {
            startActivity(Intent(this, PrintersActivity::class.java))
        }

        // Brands — owner only
        val isOwner = sessionManager.user?.isOwner == true
        if (isOwner) {
            findViewById<TextView>(R.id.tv_account_header)?.visibility = View.VISIBLE
            binding.brandsOption.visibility = View.VISIBLE
            binding.brandsOption.setOnClickListener {
                startActivity(Intent(this, ManageBrandsActivity::class.java))
            }
        }

        // System
        binding.about.setOnClickListener {
            startActivity(Intent(this, AboutActivity::class.java))
        }
    }

    private fun openWebConsole(path: String, title: String) {
        val intent = Intent(this, WebConsoleActivity::class.java)
        intent.putExtra(WebConsoleActivity.EXTRA_PATH, path)
        intent.putExtra(WebConsoleActivity.EXTRA_TITLE, title)
        startActivity(intent)
    }
}
