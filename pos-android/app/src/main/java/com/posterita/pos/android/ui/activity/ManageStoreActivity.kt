package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Store
import com.posterita.pos.android.databinding.ActivityManageListBinding
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class ManageStoreActivity : AppCompatActivity() {

    private lateinit var binding: ActivityManageListBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager

    private var stores = mutableListOf<Store>()
    private var terminalCounts = mutableMapOf<Int, Int>()

    private val editStoreLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == RESULT_OK) {
            loadData()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityManageListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Top bar setup
        binding.tvTitle.text = "Stores"
        binding.buttonBack.setOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.fabAdd.visibility = View.GONE // Read-only — managed via web console

        loadData()
    }

    private fun loadData() {
        binding.progressLoading.visibility = View.VISIBLE
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                val allStores = db.storeDao().getAllStores().toMutableList()
                val counts = mutableMapOf<Int, Int>()
                for (s in allStores) {
                    counts[s.storeId] = db.terminalDao().getTerminalCountForStore(s.storeId)
                }
                Pair(allStores, counts)
            }
            stores = result.first
            terminalCounts = result.second
            binding.progressLoading.visibility = View.GONE
            val isEmpty = stores.isEmpty()
            binding.layoutEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE
            binding.tvEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE
            binding.recyclerView.adapter = StoreAdapter()
        }
    }

    private fun launchEditStore(store: Store?) {
        val intent = Intent(this, EditStoreActivity::class.java)
        if (store != null) {
            intent.putExtra(EditStoreActivity.EXTRA_STORE_ID, store.storeId)
        }
        editStoreLauncher.launch(intent)
    }

    inner class StoreAdapter : RecyclerView.Adapter<StoreAdapter.VH>() {
        inner class VH(itemView: View) : RecyclerView.ViewHolder(itemView) {
            val card: MaterialCardView = itemView.findViewById(R.id.cardStore)
            val iconBg: View = itemView.findViewById(R.id.iconBg)
            val tvName: TextView = itemView.findViewById(R.id.tvStoreName)
            val tvAddress: TextView = itemView.findViewById(R.id.tvStoreAddress)
            val tvCityCountry: TextView = itemView.findViewById(R.id.tvStoreCityCountry)
            val tvCurrency: TextView = itemView.findViewById(R.id.tvStoreCurrency)
            val tvTerminalCount: TextView = itemView.findViewById(R.id.tvTerminalCount)
            val tvActiveBadge: TextView = itemView.findViewById(R.id.tvActiveBadge)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_store, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val s = stores[position]
            val isActive = s.storeId == prefsManager.storeId

            holder.tvName.text = s.name ?: "Unnamed Store"

            // Icon color
            val iconColor = if (isActive) getColor(R.color.posterita_primary) else getColor(R.color.posterita_muted)
            val bg = holder.iconBg.background
            if (bg is GradientDrawable) bg.setColor(iconColor)

            // Active badge
            holder.tvActiveBadge.visibility = if (isActive) View.VISIBLE else View.GONE

            // Highlight active store card
            if (isActive) {
                holder.card.strokeColor = getColor(R.color.posterita_primary)
                holder.card.strokeWidth = 2
            } else {
                holder.card.strokeColor = getColor(R.color.posterita_line)
                holder.card.strokeWidth = (resources.displayMetrics.density).toInt()
            }

            // Address
            val address = s.address?.takeIf { it.isNotBlank() }
            holder.tvAddress.text = address ?: "No address"
            holder.tvAddress.visibility = View.VISIBLE

            // City, Country
            val cityCountry = listOfNotNull(s.city, s.country)
                .filter { it.isNotBlank() }.joinToString(", ")
            holder.tvCityCountry.text = cityCountry
            holder.tvCityCountry.visibility = if (cityCountry.isNotEmpty()) View.VISIBLE else View.GONE

            // Currency (from brand/account level, read-only)
            val brandCurrency = sessionManager.account?.currency
            holder.tvCurrency.text = if (!brandCurrency.isNullOrBlank()) "Currency: $brandCurrency" else ""

            // Terminal count
            val count = terminalCounts[s.storeId] ?: 0
            holder.tvTerminalCount.text = "$count terminal${if (count != 1) "s" else ""}"

            // Tap to edit store
            holder.card.setOnClickListener {
                launchEditStore(s)
            }
        }

        override fun getItemCount() = stores.size
    }
}
