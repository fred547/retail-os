package com.posterita.pos.android.ui.activity

import android.content.Intent
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

    private val editTerminalLauncher = registerForActivityResult(
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
        binding.tvTitle.text = "Terminals"
        binding.buttonBack.setOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.fabAdd.setOnClickListener { launchEditTerminal(null) }

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

    private fun launchEditTerminal(terminal: Terminal?) {
        val intent = Intent(this, EditTerminalActivity::class.java)
        if (terminal != null) {
            intent.putExtra(EditTerminalActivity.EXTRA_TERMINAL_ID, terminal.terminalId)
            intent.putExtra(EditTerminalActivity.EXTRA_STORE_ID, terminal.store_id)
        }
        editTerminalLauncher.launch(intent)
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
            holder.card.setOnClickListener { launchEditTerminal(t) }
        }

        override fun getItemCount() = terminals.size
    }
}
