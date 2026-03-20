package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Account
import com.posterita.pos.android.databinding.ActivityManageListBinding
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class ManageBrandsActivity : AppCompatActivity() {

    private lateinit var binding: ActivityManageListBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager

    private var accounts = mutableListOf<Account>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityManageListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Top bar setup
        binding.tvTitle.text = "Brands"
        binding.buttonBack.setOnClickListener { finish() }

        // Hide the FAB — brands are not user-created for now
        binding.fabAdd.visibility = View.GONE

        binding.recyclerView.layoutManager = LinearLayoutManager(this)

        // Owner-only check
        val user = sessionManager.user
        if (user != null && !user.isOwner) {
            Toast.makeText(this, "Owner access required", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        loadData()
    }

    private fun loadData() {
        binding.progressLoading.visibility = View.VISIBLE
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                db.accountDao().getAllAccounts().toMutableList()
            }
            accounts = result
            binding.progressLoading.visibility = View.GONE
            val isEmpty = accounts.isEmpty()
            binding.layoutEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE
            binding.tvEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE
            if (isEmpty) {
                binding.tvEmpty.text = "No brand information available"
            }
            binding.recyclerView.adapter = BrandAdapter()
        }
    }

    inner class BrandAdapter : RecyclerView.Adapter<BrandAdapter.VH>() {
        inner class VH(itemView: View) : RecyclerView.ViewHolder(itemView) {
            val card: MaterialCardView = itemView.findViewById(R.id.cardBrand)
            val tvName: TextView = itemView.findViewById(R.id.tvBrandName)
            val tvAccountId: TextView = itemView.findViewById(R.id.tvBrandAccountId)
            val tvDetails: TextView = itemView.findViewById(R.id.tvBrandDetails)
            val tvCurrency: TextView = itemView.findViewById(R.id.tvBrandCurrency)
            val tvActiveBadge: TextView = itemView.findViewById(R.id.tvActiveBadge)
            val tvWebsite: TextView = itemView.findViewById(R.id.tvBrandWebsite)
            val btnSwitch: com.google.android.material.button.MaterialButton = itemView.findViewById(R.id.btnSwitchBrand)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_brand, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val account = accounts[position]
            val isActive = account.account_id == prefsManager.accountId

            // Business name or account ID
            holder.tvName.text = account.businessname?.takeIf { it.isNotBlank() }
                ?: "Brand ${account.account_id}"

            // Account ID
            holder.tvAccountId.text = "Account ID: ${account.account_id}"

            // Active badge
            holder.tvActiveBadge.visibility = if (isActive) View.VISIBLE else View.GONE

            // Highlight active brand card
            if (isActive) {
                holder.card.strokeColor = getColor(R.color.posterita_primary)
                holder.card.strokeWidth = 2
            } else {
                holder.card.strokeColor = getColor(R.color.posterita_line)
                holder.card.strokeWidth = 0
            }

            // Address details
            val addressParts = listOfNotNull(
                account.address1?.takeIf { it.isNotBlank() },
                account.city?.takeIf { it.isNotBlank() },
                account.state?.takeIf { it.isNotBlank() }
            ).joinToString(", ")
            holder.tvDetails.text = addressParts
            holder.tvDetails.visibility = if (addressParts.isNotEmpty()) View.VISIBLE else View.GONE

            // Currency
            holder.tvCurrency.text = if (!account.currency.isNullOrBlank()) "Currency: ${account.currency}" else ""
            holder.tvCurrency.visibility = if (!account.currency.isNullOrBlank()) View.VISIBLE else View.GONE

            // Website
            holder.tvWebsite.text = if (!account.website.isNullOrBlank()) account.website else ""
            holder.tvWebsite.visibility = if (!account.website.isNullOrBlank()) View.VISIBLE else View.GONE

            // Switch Brand button — placeholder for multi-brand support
            holder.btnSwitch.visibility = if (!isActive && accounts.size > 1) View.VISIBLE else View.GONE
            holder.btnSwitch.setOnClickListener {
                Toast.makeText(this@ManageBrandsActivity,
                    "Multi-brand switching coming soon", Toast.LENGTH_SHORT).show()
            }
        }

        override fun getItemCount() = accounts.size
    }
}
