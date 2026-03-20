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

        // Data from web (read-only)
        binding.storesOption.setOnClickListener {
            startActivity(Intent(this, ManageStoreActivity::class.java))
        }
        binding.terminalsOption.setOnClickListener {
            startActivity(Intent(this, ManageTerminalActivity::class.java))
        }
        binding.usersOption?.setOnClickListener {
            startActivity(Intent(this, ManageUsersActivity::class.java))
        }
        binding.taxesOption?.setOnClickListener {
            startActivity(Intent(this, ManageTaxActivity::class.java))
        }
        binding.categoriesOption?.setOnClickListener {
            startActivity(Intent(this, ManageCategoriesActivity::class.java))
        }
        binding.productsOption?.setOnClickListener {
            startActivity(Intent(this, ManageProductsActivity::class.java))
        }

        // System
        binding.about.setOnClickListener {
            startActivity(Intent(this, AboutActivity::class.java))
        }
    }
}
