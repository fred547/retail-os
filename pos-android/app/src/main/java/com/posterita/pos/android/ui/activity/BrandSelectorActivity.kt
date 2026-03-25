package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.databinding.ActivityBrandSelectorBinding
import com.posterita.pos.android.util.LocalAccountRegistry
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

/**
 * Brand selection screen — shown when owner has multiple brands
 * and hasn't selected one yet (or wants to switch).
 */
@AndroidEntryPoint
class BrandSelectorActivity : BaseActivity() {

    private lateinit var binding: ActivityBrandSelectorBinding

    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var accountRegistry: LocalAccountRegistry

    data class BrandItem(
        val id: String,
        val name: String,
        val storeName: String,
        val type: String, // "live", "demo", "trial"
        val status: String
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityBrandSelectorBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val user = sessionManager.user
        binding.textGreeting.text = if (user != null) {
            "Hi ${user.firstname ?: "there"}, select a brand"
        } else {
            "Select a brand"
        }

        val brands = loadBrands()

        binding.recyclerBrands.layoutManager = LinearLayoutManager(this)
        binding.recyclerBrands.adapter = BrandAdapter(brands) { brand ->
            selectBrand(brand)
        }
    }

    private fun loadBrands(): List<BrandItem> {
        val brands = mutableListOf<BrandItem>()

        // Load from account registry
        val accounts = accountRegistry.getAllAccounts()
        for (entry in accounts) {
            brands.add(BrandItem(
                id = entry.id,
                name = entry.name,
                storeName = entry.storeName,
                type = entry.type,
                status = entry.status
            ))
        }

        // If no brands in registry, add current account
        if (brands.isEmpty() && prefsManager.accountId.isNotEmpty()) {
            brands.add(BrandItem(
                id = prefsManager.accountId,
                name = prefsManager.storeName.ifEmpty { "My Store" },
                storeName = prefsManager.storeName.ifEmpty { "My Store" },
                type = "live",
                status = "active"
            ))
        }

        return brands
    }

    private fun selectBrand(brand: BrandItem) {
        // Switch to the selected brand's database
        val currentId = prefsManager.accountId
        if (currentId != brand.id) {
            // Clear session state from previous brand
            sessionManager.resetSession()
            // Switch account
            prefsManager.setAccountIdSync(brand.id)
            prefsManager.setStoreNameSync(brand.storeName)
            AppDatabase.resetInstance()
        }

        // Save as last selected brand
        prefsManager.setStringSync("last_brand_id", brand.id)

        // Load user from new DB, then navigate
        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                try {
                    val db = AppDatabase.getInstance(this@BrandSelectorActivity, brand.id)
                    val user = db.userDao().getAllUsers().firstOrNull()
                    if (user != null) {
                        sessionManager.user = user
                    }
                } catch (e: Exception) {
                    Log.w("BrandSelector", "Failed to load user for brand ${brand.id}", e)
                }
                Unit
            }

            // Go to Home
            val intent = Intent(this@BrandSelectorActivity, HomeActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        }
    }

    @Suppress("MissingSuperCall")
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        // Must select a brand — can't go back
        moveTaskToBack(true)
    }

    // ---- Adapter ----

    private class BrandAdapter(
        private val brands: List<BrandItem>,
        private val onClick: (BrandItem) -> Unit
    ) : RecyclerView.Adapter<BrandAdapter.VH>() {

        class VH(view: View) : RecyclerView.ViewHolder(view) {
            val card: MaterialCardView = view as MaterialCardView
            val name: TextView = view.findViewById(R.id.text_brand_name)
            val type: TextView = view.findViewById(R.id.text_brand_type)
            val badge: TextView = view.findViewById(R.id.badge_type)
            val iconBg: View = view.findViewById(R.id.icon_bg)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_brand_selector, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val brand = brands[position]
            val ctx = holder.itemView.context

            holder.name.text = brand.name
            holder.type.text = brand.storeName

            // Badge color by type
            when (brand.type) {
                "demo" -> {
                    holder.badge.text = "DEMO"
                    holder.badge.setTextColor(ctx.getColor(R.color.posterita_warning))
                    holder.badge.setBackgroundColor(ctx.getColor(R.color.posterita_warning_light))
                    val bg = holder.iconBg.background
                    if (bg is GradientDrawable) bg.setColor(ctx.getColor(R.color.posterita_warning_light))
                }
                "live" -> {
                    holder.badge.text = "LIVE"
                    holder.badge.setTextColor(ctx.getColor(R.color.posterita_secondary))
                    holder.badge.setBackgroundColor(ctx.getColor(R.color.posterita_secondary_light))
                    val bg = holder.iconBg.background
                    if (bg is GradientDrawable) bg.setColor(ctx.getColor(R.color.posterita_primary_light))
                }
                else -> {
                    holder.badge.text = brand.type.uppercase()
                    holder.badge.setTextColor(ctx.getColor(R.color.posterita_muted))
                    holder.badge.setBackgroundColor(ctx.getColor(R.color.posterita_bg))
                    val bg = holder.iconBg.background
                    if (bg is GradientDrawable) bg.setColor(ctx.getColor(R.color.posterita_bg))
                }
            }

            holder.card.setOnClickListener { onClick(brand) }
        }

        override fun getItemCount() = brands.size
    }
}
