package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ActivitySettingsBinding
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class SettingsActivity : BaseDrawerActivity() {

    private lateinit var binding: ActivitySettingsBinding

    override fun getDrawerHighlightId(): Int = R.id.nav_settings

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentViewWithDrawer(R.layout.activity_settings)
        binding = ActivitySettingsBinding.bind(drawerLayout.getChildAt(0))

        binding.buttonBack.setOnClickListener { finish() }

        setupDrawerNavigation()

        // Data — opens web console embedded in app
        binding.storesOption.setOnClickListener { openWebConsole("/stores", "Stores") }
        binding.terminalsOption.setOnClickListener { openWebConsole("/terminals", "Terminals") }
        binding.usersOption?.setOnClickListener { openWebConsole("/users", "Users") }
        binding.taxesOption?.setOnClickListener { openWebConsole("/settings", "Taxes") }
        binding.categoriesOption?.setOnClickListener { openWebConsole("/categories", "Categories") }
        binding.productsOption?.setOnClickListener { openWebConsole("/products", "Products") }

        // System
        binding.about.setOnClickListener {
            startActivity(Intent(this, AboutActivity::class.java))
        }
    }

    private fun openWebConsole(path: String, title: String) {
        // Local read-only views for now
        // TODO: Switch to WebView once OTT auth is deployed to Vercel
        val activityClass = when (path) {
            "/stores" -> ManageStoreActivity::class.java
            "/terminals" -> ManageTerminalActivity::class.java
            "/users" -> ManageUsersActivity::class.java
            "/settings" -> ManageTaxActivity::class.java
            "/categories" -> ManageCategoriesActivity::class.java
            "/products" -> ManageProductsActivity::class.java
            else -> null
        }
        if (activityClass != null) {
            startActivity(Intent(this, activityClass))
        }
    }
}
