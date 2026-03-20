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
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.textfield.TextInputEditText
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.Store
import com.posterita.pos.android.data.local.entity.Terminal
import com.posterita.pos.android.databinding.ActivityManageListBinding
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class ManageTerminalActivity : AppCompatActivity() {

    private lateinit var binding: ActivityManageListBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager

    private var terminals = mutableListOf<Terminal>()
    private var storeNames = mutableMapOf<Int, String>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityManageListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Top bar setup
        binding.tvTitle.text = "Terminals"
        binding.buttonBack.setOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.fabAdd.setOnClickListener { showTerminalDialog(null) }

        loadData()
    }

    private fun loadData() {
        binding.progressLoading.visibility = View.VISIBLE
        lifecycleScope.launch {
            val result = withContext(Dispatchers.IO) {
                val allTerminals = db.terminalDao().getAllTerminals().toMutableList()
                val names = mutableMapOf<Int, String>()
                val stores = db.storeDao().getAllStores()
                for (store in stores) {
                    names[store.storeId] = store.name ?: "Unknown Store"
                }
                Pair(allTerminals, names)
            }
            terminals = result.first
            storeNames = result.second
            allStores = storeNames.map { (id, name) ->
                Store(storeId = id, name = name)
            }
            binding.progressLoading.visibility = View.GONE
            val isEmpty = terminals.isEmpty()
            binding.layoutEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE
            binding.tvEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE
            binding.recyclerView.adapter = TerminalAdapter()
        }
    }

    private var allStores = listOf<Store>()

    private fun showTerminalDialog(terminal: Terminal?) {
        val isEdit = terminal != null

        val dialogView = LayoutInflater.from(this).inflate(R.layout.dialog_edit_terminal, null)
        val dialog = android.app.Dialog(this)
        dialog.requestWindowFeature(android.view.Window.FEATURE_NO_TITLE)
        dialog.setContentView(dialogView)
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)
        dialog.window?.setLayout(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        )

        val tvTitle = dialogView.findViewById<TextView>(R.id.tvDialogTitle)
        val etName = dialogView.findViewById<TextInputEditText>(R.id.etTerminalName)
        val etPrefix = dialogView.findViewById<TextInputEditText>(R.id.etTerminalPrefix)
        val etFloat = dialogView.findViewById<TextInputEditText>(R.id.etTerminalFloat)
        val tilStore = dialogView.findViewById<com.google.android.material.textfield.TextInputLayout>(R.id.tilTerminalStore)
        val actvStore = dialogView.findViewById<android.widget.AutoCompleteTextView>(R.id.actvTerminalStore)
        val btnDelete = dialogView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnDeleteTerminal)
        val btnCancel = dialogView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnCancelTerminal)
        val btnSave = dialogView.findViewById<com.google.android.material.button.MaterialButton>(R.id.btnSaveTerminal)

        tvTitle.text = if (isEdit) "Edit Terminal" else "Add Terminal"

        // Store selector — show only if multiple stores
        var selectedStoreId = terminal?.store_id ?: prefsManager.storeId
        if (allStores.size > 1) {
            tilStore.visibility = View.VISIBLE
            val storeAdapter = android.widget.ArrayAdapter(
                this,
                android.R.layout.simple_dropdown_item_1line,
                allStores.map { it.name ?: "Store ${it.storeId}" }
            )
            actvStore.setAdapter(storeAdapter)
            val currentIndex = allStores.indexOfFirst { it.storeId == selectedStoreId }
            if (currentIndex >= 0) {
                actvStore.setText(allStores[currentIndex].name ?: "Store ${allStores[currentIndex].storeId}", false)
            }
            actvStore.setOnItemClickListener { _, _, position, _ ->
                selectedStoreId = allStores[position].storeId
            }
        }

        // Pre-fill fields if editing
        if (isEdit) {
            etName.setText(terminal!!.name ?: "")
            etPrefix.setText(terminal.prefix ?: "")
            if (terminal.floatamt > 0) {
                etFloat.setText("%.2f".format(terminal.floatamt))
            }
            btnDelete.visibility = View.VISIBLE
        }

        btnDelete.setOnClickListener {
            dialog.dismiss()
            deleteTerminal(terminal!!)
        }

        btnCancel.setOnClickListener { dialog.dismiss() }

        btnSave.setOnClickListener {
            val name = etName.text?.toString()?.trim() ?: ""
            val prefix = etPrefix.text?.toString()?.trim() ?: ""
            val floatAmt = etFloat.text?.toString()?.trim()?.toDoubleOrNull() ?: 0.0

            if (name.isEmpty()) {
                Toast.makeText(this, "Terminal name is required", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            lifecycleScope.launch {
                withContext(Dispatchers.IO) {
                    if (isEdit) {
                        val updated = terminal!!.copy(
                            name = name,
                            prefix = prefix,
                            floatamt = floatAmt,
                            store_id = selectedStoreId
                        )
                        db.terminalDao().updateTerminal(updated)
                        if (terminal.terminalId == prefsManager.terminalId) {
                            prefsManager.setTerminalNameSync(name)
                        }
                        Unit
                    } else {
                        val maxId = db.terminalDao().getMaxTerminalId() ?: 0
                        val newTerminal = Terminal(
                            terminalId = maxId + 1,
                            name = name,
                            prefix = prefix,
                            floatamt = floatAmt,
                            store_id = selectedStoreId,
                            isactive = "Y"
                        )
                        db.terminalDao().insertTerminal(newTerminal)
                    }
                }
                dialog.dismiss()
                loadData()
                Toast.makeText(this@ManageTerminalActivity,
                    if (isEdit) "Terminal updated" else "Terminal added", Toast.LENGTH_SHORT).show()
            }
        }

        dialog.show()
    }

    private fun deleteTerminal(terminal: Terminal) {
        if (terminal.terminalId == prefsManager.terminalId) {
            Toast.makeText(this, "Cannot delete the active terminal", Toast.LENGTH_SHORT).show()
            return
        }
        MaterialAlertDialogBuilder(this)
            .setTitle("Delete Terminal")
            .setMessage("Are you sure you want to delete '${terminal.name}'?")
            .setPositiveButton("Delete") { _, _ ->
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) { db.terminalDao().deleteTerminal(terminal) }
                    loadData()
                    Toast.makeText(this@ManageTerminalActivity, "Terminal deleted", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    inner class TerminalAdapter : RecyclerView.Adapter<TerminalAdapter.VH>() {
        inner class VH(itemView: View) : RecyclerView.ViewHolder(itemView) {
            val card: MaterialCardView = itemView.findViewById(R.id.cardTerminal)
            val tvName: TextView = itemView.findViewById(R.id.tvTerminalName)
            val tvStore: TextView = itemView.findViewById(R.id.tvTerminalStore)
            val tvPrefix: TextView = itemView.findViewById(R.id.tvTerminalPrefix)
            val tvFloat: TextView = itemView.findViewById(R.id.tvTerminalFloat)
            val tvActiveBadge: TextView = itemView.findViewById(R.id.tvActiveBadge)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_terminal, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val t = terminals[position]
            val isActive = t.terminalId == prefsManager.terminalId

            holder.tvName.text = t.name ?: "Unnamed Terminal"

            // Active badge
            holder.tvActiveBadge.visibility = if (isActive) View.VISIBLE else View.GONE

            // Highlight active terminal card
            if (isActive) {
                holder.card.strokeColor = getColor(R.color.posterita_primary)
                holder.card.strokeWidth = 2
            } else {
                holder.card.strokeColor = getColor(R.color.posterita_line)
                holder.card.strokeWidth = 0
            }

            // Store name
            val storeName = storeNames[t.store_id]
            holder.tvStore.text = if (!storeName.isNullOrBlank()) "Store: $storeName" else "No store assigned"

            // Prefix
            holder.tvPrefix.text = if (!t.prefix.isNullOrBlank()) "Prefix: ${t.prefix}" else "No prefix"

            // Float amount
            holder.tvFloat.text = "Float: %.2f".format(t.floatamt)

            // Click to edit
            holder.card.setOnClickListener { showTerminalDialog(t) }
        }

        override fun getItemCount() = terminals.size
    }
}
