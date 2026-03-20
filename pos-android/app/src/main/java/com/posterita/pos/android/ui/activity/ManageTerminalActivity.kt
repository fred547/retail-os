package com.posterita.pos.android.ui.activity

import android.content.Intent
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
            binding.progressLoading.visibility = View.GONE
            val isEmpty = terminals.isEmpty()
            binding.layoutEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE
            binding.tvEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE
            binding.recyclerView.adapter = TerminalAdapter()
        }
    }

    private fun showTerminalDialog(terminal: Terminal?) {
        val isEdit = terminal != null

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

        val etName = addField("Terminal Name *", terminal?.name)
        val etPrefix = addField("Receipt Prefix", terminal?.prefix)

        val dialog = MaterialAlertDialogBuilder(this)
            .setTitle(if (isEdit) "Edit Terminal" else "Add Terminal")
            .setView(scrollView)
            .setPositiveButton("Save", null)
            .setNegativeButton("Cancel", null)
            .apply {
                if (isEdit) {
                    setNeutralButton("Delete") { _, _ -> deleteTerminal(terminal!!) }
                }
            }
            .create()

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE)?.setTextColor(getColor(R.color.posterita_primary))
            dialog.getButton(AlertDialog.BUTTON_NEGATIVE)?.setTextColor(getColor(R.color.posterita_muted))
            dialog.getButton(AlertDialog.BUTTON_NEUTRAL)?.setTextColor(getColor(R.color.posterita_error))

            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val name = etName.text?.toString()?.trim() ?: ""
                val prefix = etPrefix.text?.toString()?.trim() ?: ""

                if (name.isEmpty()) {
                    Toast.makeText(this, "Terminal name is required", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                lifecycleScope.launch {
                    withContext(Dispatchers.IO) {
                        if (isEdit) {
                            val updated = terminal!!.copy(name = name, prefix = prefix)
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
                                store_id = prefsManager.storeId,
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
