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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityManageListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.toolbar.title = "Manage Terminals"
        binding.toolbar.setNavigationOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.fabAdd.setOnClickListener { showTerminalDialog(null) }

        loadData()
    }

    private fun loadData() {
        binding.progressLoading.visibility = View.VISIBLE
        lifecycleScope.launch {
            terminals = withContext(Dispatchers.IO) {
                db.terminalDao().getAllTerminals().toMutableList()
            }
            binding.progressLoading.visibility = View.GONE
            binding.tvEmpty.visibility = if (terminals.isEmpty()) View.VISIBLE else View.GONE
            binding.recyclerView.adapter = TerminalAdapter()
        }
    }

    private fun showTerminalDialog(terminal: Terminal?) {
        val isEdit = terminal != null

        val container = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(64, 32, 64, 16)
        }

        val tilName = TextInputLayout(this).apply {
            hint = "Terminal Name *"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        val etName = TextInputEditText(this)
        tilName.addView(etName)
        container.addView(tilName)

        val tilPrefix = TextInputLayout(this).apply {
            hint = "Receipt Prefix"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = 16 }
        }
        val etPrefix = TextInputEditText(this)
        tilPrefix.addView(etPrefix)
        container.addView(tilPrefix)

        if (isEdit) {
            etName.setText(terminal!!.name)
            etPrefix.setText(terminal.prefix ?: "")
        }

        val dialog = AlertDialog.Builder(this)
            .setTitle(if (isEdit) "Edit Terminal" else "Add Terminal")
            .setView(container)
            .setPositiveButton("Save", null)
            .setNegativeButton("Cancel", null)
            .apply {
                if (isEdit) {
                    setNeutralButton("Delete") { _, _ -> deleteTerminal(terminal!!) }
                }
            }
            .create()

        dialog.setOnShowListener {
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
        AlertDialog.Builder(this)
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
                card.setOnClickListener { showTerminalDialog(terminals[adapterPosition]) }
            }
        }
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = VH(
            MaterialCardView(parent.context).apply {
                layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            }
        )
        override fun onBindViewHolder(holder: VH, position: Int) {
            val t = terminals[position]
            val isActive = t.terminalId == prefsManager.terminalId
            holder.tvName.text = buildString {
                append(t.name ?: "Unnamed Terminal")
                if (isActive) append(" (Active)")
            }
            holder.tvDetails.text = buildString {
                if (!t.prefix.isNullOrBlank()) append("Prefix: ${t.prefix}")
                else append("No prefix")
            }
        }
        override fun getItemCount() = terminals.size
    }
}
