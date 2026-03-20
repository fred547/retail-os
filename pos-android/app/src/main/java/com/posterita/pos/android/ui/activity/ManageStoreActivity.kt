package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Store
import com.posterita.pos.android.databinding.ActivityManageListBinding
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

    private var stores = mutableListOf<Store>()
    private var terminalCounts = mutableMapOf<Int, Int>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityManageListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Top bar setup
        binding.tvTitle.text = "Stores"
        binding.buttonBack.setOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.fabAdd.setOnClickListener { showStoreDialog(null) }

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

    private fun showStoreDialog(store: Store?) {
        val isEdit = store != null

        // Build dialog content with MaterialCardView wrapping the fields
        val scrollView = android.widget.ScrollView(this)
        val container = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(48, 24, 48, 16)
        }
        scrollView.addView(container)

        fun addField(hint: String, value: String?): TextInputEditText {
            val til = TextInputLayout(
                this,
                null,
                com.google.android.material.R.attr.textInputOutlinedStyle
            ).apply {
                this.hint = hint
                boxBackgroundMode = TextInputLayout.BOX_BACKGROUND_OUTLINE
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply { topMargin = 16 }
            }
            val et = TextInputEditText(this)
            et.setText(value ?: "")
            til.addView(et)
            container.addView(til)
            return et
        }

        val etName = addField("Store Name *", store?.name)
        val etAddress = addField("Address", store?.address)
        val etCity = addField("City", store?.city)
        val etState = addField("State", store?.state)
        val etZip = addField("ZIP / Postal Code", store?.zip)
        val etCountry = addField("Country", store?.country)

        val dialog = MaterialAlertDialogBuilder(this)
            .setTitle(if (isEdit) "Edit Store" else "Add Store")
            .setView(scrollView)
            .setPositiveButton("Save", null)
            .setNegativeButton("Cancel", null)
            .apply {
                if (isEdit) {
                    setNeutralButton("Delete") { _, _ -> deleteStore(store!!) }
                }
            }
            .create()

        dialog.setOnShowListener {
            // Style the positive button
            dialog.getButton(AlertDialog.BUTTON_POSITIVE)?.setTextColor(getColor(R.color.posterita_primary))
            dialog.getButton(AlertDialog.BUTTON_NEGATIVE)?.setTextColor(getColor(R.color.posterita_muted))
            dialog.getButton(AlertDialog.BUTTON_NEUTRAL)?.setTextColor(getColor(R.color.posterita_error))

            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val name = etName.text?.toString()?.trim() ?: ""
                if (name.isEmpty()) {
                    Toast.makeText(this, "Store name is required", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                val address = etAddress.text?.toString()?.trim()
                val city = etCity.text?.toString()?.trim()
                val state = etState.text?.toString()?.trim()
                val zip = etZip.text?.toString()?.trim()
                val country = etCountry.text?.toString()?.trim()

                lifecycleScope.launch {
                    withContext(Dispatchers.IO) {
                        if (isEdit) {
                            val updated = store!!.copy(
                                name = name, address = address, city = city,
                                state = state, zip = zip, country = country
                            )
                            db.storeDao().updateStore(updated)
                            if (store.storeId == prefsManager.storeId) {
                                prefsManager.setStoreNameSync(name)
                            }
                            Unit
                        } else {
                            val maxId = db.storeDao().getMaxStoreId() ?: 0
                            val newStore = Store(
                                storeId = maxId + 1,
                                name = name, address = address, city = city,
                                state = state, zip = zip, country = country,
                                isactive = "Y"
                            )
                            db.storeDao().insertStore(newStore)
                        }
                    }
                    dialog.dismiss()
                    loadData()
                    Toast.makeText(this@ManageStoreActivity,
                        if (isEdit) "Store updated" else "Store added", Toast.LENGTH_SHORT).show()
                }
            }
        }
        dialog.show()
    }

    private fun deleteStore(store: Store) {
        if (store.storeId == prefsManager.storeId) {
            Toast.makeText(this, "Cannot delete the active store", Toast.LENGTH_SHORT).show()
            return
        }
        MaterialAlertDialogBuilder(this)
            .setTitle("Delete Store")
            .setMessage("Are you sure you want to delete '${store.name}'?")
            .setPositiveButton("Delete") { _, _ ->
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) { db.storeDao().deleteStore(store) }
                    loadData()
                    Toast.makeText(this@ManageStoreActivity, "Store deleted", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    inner class StoreAdapter : RecyclerView.Adapter<StoreAdapter.VH>() {
        inner class VH(itemView: View) : RecyclerView.ViewHolder(itemView) {
            val card: MaterialCardView = itemView.findViewById(R.id.cardStore)
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

            // Active badge
            holder.tvActiveBadge.visibility = if (isActive) View.VISIBLE else View.GONE

            // Highlight active store card
            if (isActive) {
                holder.card.strokeColor = getColor(R.color.posterita_primary)
                holder.card.strokeWidth = 2
            } else {
                holder.card.strokeColor = getColor(R.color.posterita_line)
                holder.card.strokeWidth = 0
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

            // Currency
            holder.tvCurrency.text = if (!s.currency.isNullOrBlank()) "Currency: ${s.currency}" else ""

            // Terminal count
            val count = terminalCounts[s.storeId] ?: 0
            holder.tvTerminalCount.text = "$count terminal${if (count != 1) "s" else ""}"

            // Click to edit
            holder.card.setOnClickListener { showStoreDialog(s) }
        }

        override fun getItemCount() = stores.size
    }
}
