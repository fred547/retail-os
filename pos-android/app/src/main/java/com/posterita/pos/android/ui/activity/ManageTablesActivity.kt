package com.posterita.pos.android.ui.activity

import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.text.InputType
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.google.android.material.textfield.TextInputEditText
import com.google.android.material.textfield.TextInputLayout
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.RestaurantTable
import com.posterita.pos.android.databinding.ActivityManageListBinding
import com.posterita.pos.android.util.AppErrorLogger
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class ManageTablesActivity : BaseDrawerActivity() {

    private lateinit var binding: ActivityManageListBinding
    @Inject lateinit var db: AppDatabase

    private var tables = mutableListOf<RestaurantTable>()

    override fun getDrawerHighlightId(): Int = R.id.nav_settings

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentViewWithDrawer(R.layout.activity_manage_list)
        binding = ActivityManageListBinding.bind(drawerLayout.getChildAt(0))

        // Top bar
        binding.tvTitle.text = "Tables"
        binding.buttonBack.setOnClickListener { finish() }

        // Hide web console banner — tables are managed locally
        binding.layoutWebBanner.visibility = View.GONE

        setupDrawerNavigation()

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.fabAdd.visibility = View.VISIBLE
        binding.fabAdd.setOnClickListener { showTableDialog(null) }

        loadData()
    }

    private fun loadData() {
        binding.progressLoading.visibility = View.VISIBLE
        lifecycleScope.launch {
            try {
                tables = withContext(Dispatchers.IO) {
                    db.restaurantTableDao().getTablesByStore(prefsManager.storeId).toMutableList()
                }
                binding.progressLoading.visibility = View.GONE
                val isEmpty = tables.isEmpty()
                binding.layoutEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE
                binding.tvEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE
                if (isEmpty) {
                    binding.tvEmpty.text = "No tables yet"
                }
                binding.recyclerView.adapter = TableAdapter()
            } catch (e: Exception) {
                binding.progressLoading.visibility = View.GONE
                AppErrorLogger.log(this@ManageTablesActivity, "ManageTablesActivity", "Failed to load tables", e)
            }
        }
    }

    private fun showTableDialog(table: RestaurantTable?) {
        val isEdit = table != null

        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(64, 32, 64, 16)
        }

        val tilName = TextInputLayout(this).apply {
            hint = "Table Name"
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        val etName = TextInputEditText(this)
        tilName.addView(etName)
        container.addView(tilName)

        val tilSeats = TextInputLayout(this).apply {
            hint = "Number of Seats"
            layoutParams = LinearLayout.LayoutParams(
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
            .create()

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val name = etName.text?.toString()?.trim() ?: ""
                val seats = etSeats.text?.toString()?.toIntOrNull() ?: 4

                if (name.isEmpty()) {
                    tilName.error = "Table name is required"
                    return@setOnClickListener
                }

                lifecycleScope.launch {
                    try {
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
                        Toast.makeText(
                            this@ManageTablesActivity,
                            if (isEdit) "Table updated" else "Table added",
                            Toast.LENGTH_SHORT
                        ).show()
                    } catch (e: Exception) {
                        AppErrorLogger.log(
                            this@ManageTablesActivity,
                            "ManageTablesActivity",
                            "Failed to ${if (isEdit) "update" else "add"} table",
                            e
                        )
                    }
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
                    try {
                        withContext(Dispatchers.IO) { db.restaurantTableDao().deleteTable(table) }
                        loadData()
                        Toast.makeText(this@ManageTablesActivity, "Table deleted", Toast.LENGTH_SHORT).show()
                    } catch (e: Exception) {
                        AppErrorLogger.log(
                            this@ManageTablesActivity,
                            "ManageTablesActivity",
                            "Failed to delete table",
                            e
                        )
                    }
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    inner class TableAdapter : RecyclerView.Adapter<TableAdapter.VH>() {
        inner class VH(itemView: View) : RecyclerView.ViewHolder(itemView) {
            val card: MaterialCardView = itemView.findViewById(R.id.cardItem)
            val iconBg: View = itemView.findViewById(R.id.iconBg)
            val iconInitial: TextView = itemView.findViewById(R.id.iconInitial)
            val tvName: TextView = itemView.findViewById(R.id.tvItemName)
            val tvSubtitle: TextView = itemView.findViewById(R.id.tvItemSubtitle)
            val tvBadge: TextView = itemView.findViewById(R.id.tvBadge)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_manage_card, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val t = tables[position]

            // Icon initial — first letter of table name
            holder.iconInitial.text = t.table_name.firstOrNull()?.uppercase() ?: "T"

            // Icon color — green if occupied, gray if free
            val iconColor = if (t.is_occupied) {
                getColor(R.color.posterita_secondary)
            } else {
                getColor(R.color.posterita_muted)
            }
            val bg = holder.iconBg.background
            if (bg is GradientDrawable) bg.setColor(iconColor)

            // Table name
            holder.tvName.text = t.table_name

            // Subtitle — seat count
            holder.tvSubtitle.text = "${t.seats} seats"

            // Status badge
            holder.tvBadge.visibility = View.VISIBLE
            if (t.is_occupied) {
                holder.tvBadge.text = "Occupied"
                holder.tvBadge.setTextColor(getColor(R.color.posterita_secondary))
                holder.tvBadge.setBackgroundResource(R.drawable.bg_rounded_square)
                val badgeBg = holder.tvBadge.background
                if (badgeBg is GradientDrawable) {
                    badgeBg.setColor(getColor(R.color.posterita_secondary_light))
                    badgeBg.cornerRadius = 12f * resources.displayMetrics.density
                }
            } else {
                holder.tvBadge.text = "Free"
                holder.tvBadge.setTextColor(getColor(R.color.posterita_muted))
                holder.tvBadge.setBackgroundResource(R.drawable.bg_rounded_square)
                val badgeBg = holder.tvBadge.background
                if (badgeBg is GradientDrawable) {
                    badgeBg.setColor(getColor(R.color.posterita_bg))
                    badgeBg.cornerRadius = 12f * resources.displayMetrics.density
                }
            }

            // Tap to edit
            holder.card.setOnClickListener { showTableDialog(t) }

            // Long-press to delete
            holder.card.setOnLongClickListener {
                deleteTable(t)
                true
            }
        }

        override fun getItemCount() = tables.size
    }
}
