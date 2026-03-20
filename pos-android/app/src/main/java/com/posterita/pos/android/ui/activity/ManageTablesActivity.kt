package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.text.InputType
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
import com.posterita.pos.android.data.local.entity.RestaurantTable
import com.posterita.pos.android.databinding.ActivityManageListBinding
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class ManageTablesActivity : AppCompatActivity() {

    private lateinit var binding: ActivityManageListBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager

    private var tables = mutableListOf<RestaurantTable>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityManageListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.toolbar.title = "Manage Tables"
        binding.toolbar.setNavigationOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.fabAdd.setOnClickListener { showTableDialog(null) }

        loadData()
    }

    private fun loadData() {
        binding.progressLoading.visibility = View.VISIBLE
        lifecycleScope.launch {
            tables = withContext(Dispatchers.IO) {
                db.restaurantTableDao().getTablesByStore(prefsManager.storeId).toMutableList()
            }
            binding.progressLoading.visibility = View.GONE
            binding.tvEmpty.visibility = if (tables.isEmpty()) View.VISIBLE else View.GONE
            binding.recyclerView.adapter = TableAdapter()
        }
    }

    private fun showTableDialog(table: RestaurantTable?) {
        val isEdit = table != null

        val container = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(64, 32, 64, 16)
        }

        val tilName = TextInputLayout(this).apply {
            hint = "Table Name"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        val etName = TextInputEditText(this)
        tilName.addView(etName)
        container.addView(tilName)

        val tilSeats = TextInputLayout(this).apply {
            hint = "Number of Seats"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = 16 }
        }
        val etSeats = TextInputEditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER
        }
        tilSeats.addView(etSeats)
        container.addView(tilSeats)

        if (isEdit) {
            etName.setText(table!!.table_name)
            etSeats.setText(table.seats.toString())
        }

        val dialog = AlertDialog.Builder(this)
            .setTitle(if (isEdit) "Edit Table" else "Add Table")
            .setView(container)
            .setPositiveButton("Save", null)
            .setNegativeButton("Cancel", null)
            .apply {
                if (isEdit) {
                    setNeutralButton("Delete") { _, _ -> deleteTable(table!!) }
                }
            }
            .create()

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val name = etName.text?.toString()?.trim() ?: ""
                val seats = etSeats.text?.toString()?.toIntOrNull() ?: 4

                if (name.isEmpty()) {
                    Toast.makeText(this, "Table name is required", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                lifecycleScope.launch {
                    withContext(Dispatchers.IO) {
                        if (isEdit) {
                            val updated = table!!.copy(
                                table_name = name,
                                seats = seats,
                                updated = System.currentTimeMillis()
                            )
                            db.restaurantTableDao().updateTable(updated)
                        } else {
                            val newTable = RestaurantTable(
                                table_name = name,
                                seats = seats,
                                store_id = prefsManager.storeId,
                                terminal_id = prefsManager.terminalId,
                                created = System.currentTimeMillis(),
                                updated = System.currentTimeMillis()
                            )
                            db.restaurantTableDao().insertTable(newTable)
                        }
                    }
                    dialog.dismiss()
                    loadData()
                    Toast.makeText(this@ManageTablesActivity,
                        if (isEdit) "Table updated" else "Table added", Toast.LENGTH_SHORT).show()
                }
            }
        }
        dialog.show()
    }

    private fun deleteTable(table: RestaurantTable) {
        AlertDialog.Builder(this)
            .setTitle("Delete Table")
            .setMessage("Are you sure you want to delete '${table.table_name}'?")
            .setPositiveButton("Delete") { _, _ ->
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) { db.restaurantTableDao().deleteTable(table) }
                    loadData()
                    Toast.makeText(this@ManageTablesActivity, "Table deleted", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    inner class TableAdapter : RecyclerView.Adapter<TableAdapter.VH>() {
        inner class VH(val card: MaterialCardView) : RecyclerView.ViewHolder(card) {
            val tvName: TextView = TextView(card.context).apply { textSize = 16f; setPadding(16, 4, 16, 0) }
            val tvDetails: TextView = TextView(card.context).apply { textSize = 13f; setPadding(16, 0, 16, 8); setTextColor(getColor(android.R.color.darker_gray)) }
            val layout = android.widget.LinearLayout(card.context).apply {
                orientation = android.widget.LinearLayout.VERTICAL
                setPadding(32, 24, 32, 24)
                addView(tvName)
                addView(tvDetails)
            }
            init {
                card.addView(layout)
                card.radius = 24f; card.useCompatPadding = true
                card.setOnClickListener { showTableDialog(tables[adapterPosition]) }
            }
        }
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = VH(
            MaterialCardView(parent.context).apply {
                layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            }
        )
        override fun onBindViewHolder(holder: VH, position: Int) {
            val t = tables[position]
            holder.tvName.text = t.table_name
            holder.tvDetails.text = "Seats: ${t.seats}"
        }
        override fun getItemCount() = tables.size
    }
}
