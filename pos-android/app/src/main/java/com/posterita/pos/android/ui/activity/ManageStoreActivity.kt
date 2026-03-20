package com.posterita.pos.android.ui.activity

import android.os.Bundle
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
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityManageListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.toolbar.title = "Manage Stores"
        binding.toolbar.setNavigationOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.fabAdd.setOnClickListener { showStoreDialog(null) }

        loadData()
    }

    private fun loadData() {
        binding.progressLoading.visibility = View.VISIBLE
        lifecycleScope.launch {
            stores = withContext(Dispatchers.IO) {
                db.storeDao().getAllStores().toMutableList()
            }
            binding.progressLoading.visibility = View.GONE
            binding.tvEmpty.visibility = if (stores.isEmpty()) View.VISIBLE else View.GONE
            binding.recyclerView.adapter = StoreAdapter()
        }
    }

    private fun showStoreDialog(store: Store?) {
        val isEdit = store != null

        val container = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(64, 32, 64, 16)
        }

        fun addField(hint: String, value: String?): TextInputEditText {
            val til = TextInputLayout(this).apply {
                this.hint = hint
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

        val dialog = AlertDialog.Builder(this)
            .setTitle(if (isEdit) "Edit Store" else "Add Store")
            .setView(container)
            .setPositiveButton("Save", null)
            .setNegativeButton("Cancel", null)
            .apply {
                if (isEdit) {
                    setNeutralButton("Delete") { _, _ -> deleteStore(store!!) }
                }
            }
            .create()

        dialog.setOnShowListener {
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
        AlertDialog.Builder(this)
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
        inner class VH(val card: MaterialCardView) : RecyclerView.ViewHolder(card) {
            val tvName = TextView(card.context).apply { textSize = 16f; setPadding(16, 4, 16, 0) }
            val tvDetails = TextView(card.context).apply { textSize = 13f; setPadding(16, 0, 16, 8); setTextColor(getColor(android.R.color.darker_gray)) }
            val layout = android.widget.LinearLayout(card.context).apply {
                orientation = android.widget.LinearLayout.VERTICAL
                setPadding(32, 24, 32, 24)
                addView(tvName)
                addView(tvDetails)
            }
            init {
                card.addView(layout)
                card.radius = 24f; card.useCompatPadding = true
                card.setOnClickListener { showStoreDialog(stores[adapterPosition]) }
            }
        }
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = VH(
            MaterialCardView(parent.context).apply {
                layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            }
        )
        override fun onBindViewHolder(holder: VH, position: Int) {
            val s = stores[position]
            val isActive = s.storeId == prefsManager.storeId
            holder.tvName.text = buildString {
                append(s.name ?: "Unnamed Store")
                if (isActive) append(" (Active)")
            }
            holder.tvDetails.text = listOfNotNull(s.address, s.city, s.country)
                .filter { it.isNotBlank() }.joinToString(", ").ifEmpty { "No address" }
        }
        override fun getItemCount() = stores.size
    }
}
