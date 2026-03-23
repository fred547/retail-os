package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.card.MaterialCardView
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Store
import com.posterita.pos.android.data.local.entity.Terminal
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class EditStoreActivity : AppCompatActivity() {

    companion object {
        const val EXTRA_STORE_ID = "store_id"
    }

    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var sessionManager: SessionManager
    @Inject lateinit var connectivityMonitor: com.posterita.pos.android.util.ConnectivityMonitor

    private var storeId = 0
    private var store: Store? = null
    private var terminals = listOf<Terminal>()

    private val isEditMode get() = storeId > 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_edit_store)
        com.posterita.pos.android.util.setupConnectivityDot(this, connectivityMonitor)
        supportActionBar?.hide()

        // Admin/owner check
        val currentUser = sessionManager.user
        if (currentUser == null || !currentUser.isAdminOrOwner) {
            Toast.makeText(this, "Only admins and owners can edit stores", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        storeId = intent.getIntExtra(EXTRA_STORE_ID, 0)

        // Top bar
        val tvTitle = findViewById<TextView>(R.id.tv_title)
        tvTitle.text = if (isEditMode) "Edit Store" else "Add Store"
        findViewById<ImageView>(R.id.button_back).setOnClickListener { finish() }

        // Load data
        loadData()

        // Bottom buttons
        findViewById<MaterialButton>(R.id.btn_save).setOnClickListener { saveStore() }
        findViewById<MaterialButton>(R.id.btn_delete).setOnClickListener { confirmDelete() }
    }

    private fun loadData() {
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                val s = if (isEditMode) db.storeDao().getStoreById(storeId) else null
                val t = if (isEditMode) db.terminalDao().getTerminalsForStore(storeId) else emptyList()
                Pair(s, t)
            }

            store = result.first
            terminals = result.second

            if (store != null) {
                val s = store!!
                findViewById<TextInputEditText>(R.id.et_store_name).setText(s.name ?: "")
                findViewById<TextInputEditText>(R.id.et_address).setText(s.address ?: "")
                findViewById<TextInputEditText>(R.id.et_city).setText(s.city ?: "")
                findViewById<TextInputEditText>(R.id.et_state).setText(s.state ?: "")
                findViewById<TextInputEditText>(R.id.et_zip).setText(s.zip ?: "")
                findViewById<TextInputEditText>(R.id.et_country).setText(s.country ?: "")

                // Show delete button for edit mode (but not for active store)
                val btnDelete = findViewById<MaterialButton>(R.id.btn_delete)
                if (storeId != prefsManager.storeId) {
                    btnDelete.visibility = View.VISIBLE
                }
            }

            // Show terminals section if editing
            if (isEditMode) {
                setupTerminalsSection()
            }
        }
    }

    private fun setupTerminalsSection() {
        val cardTerminals = findViewById<MaterialCardView>(R.id.card_terminals)
        val layoutList = findViewById<LinearLayout>(R.id.layout_terminals_list)
        val tvNoTerminals = findViewById<TextView>(R.id.tv_no_terminals)

        cardTerminals.visibility = View.VISIBLE

        if (terminals.isEmpty()) {
            tvNoTerminals.visibility = View.VISIBLE
            return
        }

        for (t in terminals) {
            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = android.view.Gravity.CENTER_VERTICAL
                setPadding(0, 8, 0, 8)
            }

            val isActive = t.terminalId == prefsManager.terminalId

            val tvName = TextView(this).apply {
                text = t.name ?: "Terminal ${t.terminalId}"
                textSize = 15f
                setTextColor(getColor(R.color.posterita_ink))
                layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            }

            row.addView(tvName)

            if (isActive) {
                val tvBadge = TextView(this).apply {
                    text = "ACTIVE"
                    textSize = 11f
                    setTextColor(getColor(R.color.posterita_secondary))
                    setTypeface(typeface, android.graphics.Typeface.BOLD)
                }
                row.addView(tvBadge)
            }

            layoutList.addView(row)

            // Divider between terminals
            if (t != terminals.last()) {
                val divider = View(this).apply {
                    layoutParams = LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT, 1
                    )
                    setBackgroundColor(getColor(R.color.posterita_line))
                }
                layoutList.addView(divider)
            }
        }
    }

    private fun saveStore() {
        val name = findViewById<TextInputEditText>(R.id.et_store_name).text?.toString()?.trim() ?: ""
        if (name.isEmpty()) {
            findViewById<TextInputLayout>(R.id.til_store_name).error = "Store name is required"
            return
        }
        findViewById<TextInputLayout>(R.id.til_store_name).error = null

        val address = findViewById<TextInputEditText>(R.id.et_address).text?.toString()?.trim()
        val city = findViewById<TextInputEditText>(R.id.et_city).text?.toString()?.trim()
        val state = findViewById<TextInputEditText>(R.id.et_state).text?.toString()?.trim()
        val zip = findViewById<TextInputEditText>(R.id.et_zip).text?.toString()?.trim()
        val country = findViewById<TextInputEditText>(R.id.et_country).text?.toString()?.trim()

        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                if (isEditMode && store != null) {
                    val updated = store!!.copy(
                        name = name, address = address, city = city,
                        state = state, zip = zip, country = country
                    )
                    db.storeDao().updateStore(updated)
                    if (store!!.storeId == prefsManager.storeId) {
                        prefsManager.setStoreNameSync(name)
                    }
                    Unit
                } else {
                    val maxId = db.storeDao().getMaxStoreId() ?: 0
                    val newStore = Store(
                        storeId = maxId + 1,
                        name = name, address = address, city = city,
                        state = state, zip = zip, country = country,
                        isactive = "Y",
                        account_id = prefsManager.accountId
                    )
                    db.storeDao().insertStore(newStore)
                }
            }

            Toast.makeText(
                this@EditStoreActivity,
                if (isEditMode) "Store updated" else "Store added",
                Toast.LENGTH_SHORT
            ).show()
            setResult(RESULT_OK)
            finish()
        }
    }

    private fun confirmDelete() {
        if (store == null) return
        if (store!!.storeId == prefsManager.storeId) {
            Toast.makeText(this, "Cannot delete the active store", Toast.LENGTH_SHORT).show()
            return
        }
        MaterialAlertDialogBuilder(this)
            .setTitle("Delete Store")
            .setMessage("Are you sure you want to delete '${store!!.name}'? All terminals in this store will also be removed.")
            .setPositiveButton("Delete") { _, _ ->
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) { db.storeDao().deleteStore(store!!) }
                    Toast.makeText(this@EditStoreActivity, "Store deleted", Toast.LENGTH_SHORT).show()
                    setResult(RESULT_OK)
                    finish()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
}
