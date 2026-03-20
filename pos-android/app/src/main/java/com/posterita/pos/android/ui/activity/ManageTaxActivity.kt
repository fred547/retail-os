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
import com.posterita.pos.android.data.local.entity.Tax
import com.posterita.pos.android.databinding.ActivityManageListBinding
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class ManageTaxActivity : AppCompatActivity() {

    private lateinit var binding: ActivityManageListBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager

    private var taxes = mutableListOf<Tax>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityManageListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.toolbar.title = "Manage Taxes"
        binding.toolbar.setNavigationOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.fabAdd.setOnClickListener { showTaxDialog(null) }

        loadData()
    }

    private fun loadData() {
        binding.progressLoading.visibility = View.VISIBLE
        lifecycleScope.launch {
            taxes = withContext(Dispatchers.IO) {
                db.taxDao().getAllTaxesSync().toMutableList()
            }
            binding.progressLoading.visibility = View.GONE
            binding.tvEmpty.visibility = if (taxes.isEmpty()) View.VISIBLE else View.GONE
            binding.recyclerView.adapter = TaxAdapter()
        }
    }

    private fun showTaxDialog(tax: Tax?) {
        val isEdit = tax != null

        val container = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(64, 32, 64, 16)
        }

        val tilName = TextInputLayout(this).apply {
            hint = "Tax Name"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        val etName = TextInputEditText(this)
        tilName.addView(etName)
        container.addView(tilName)

        val tilRate = TextInputLayout(this).apply {
            hint = "Rate (%)"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = 16 }
        }
        val etRate = TextInputEditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL
        }
        tilRate.addView(etRate)
        container.addView(tilRate)

        val tilCode = TextInputLayout(this).apply {
            hint = "Tax Code"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = 16 }
        }
        val etCode = TextInputEditText(this)
        tilCode.addView(etCode)
        container.addView(tilCode)

        if (isEdit) {
            etName.setText(tax!!.name)
            etRate.setText(tax.rate.toString())
            etCode.setText(tax.taxcode ?: "")
        }

        val dialog = AlertDialog.Builder(this)
            .setTitle(if (isEdit) "Edit Tax" else "Add Tax")
            .setView(container)
            .setPositiveButton("Save", null)
            .setNegativeButton("Cancel", null)
            .apply {
                if (isEdit) {
                    setNeutralButton("Delete") { _, _ -> deleteTax(tax!!) }
                }
            }
            .create()

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val name = etName.text?.toString()?.trim() ?: ""
                val rate = etRate.text?.toString()?.toDoubleOrNull() ?: 0.0
                val code = etCode.text?.toString()?.trim() ?: ""

                if (name.isEmpty()) {
                    Toast.makeText(this, "Tax name is required", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                lifecycleScope.launch {
                    withContext(Dispatchers.IO) {
                        if (isEdit) {
                            val updated = tax!!.copy(name = name, rate = rate, taxcode = code)
                            db.taxDao().updateTax(updated)
                        } else {
                            val maxId = db.taxDao().getMaxTaxId() ?: 0
                            val newTax = Tax(
                                tax_id = maxId + 1,
                                name = name,
                                rate = rate,
                                taxcode = code,
                                isactive = "Y"
                            )
                            db.taxDao().insertTax(newTax)
                        }
                    }
                    dialog.dismiss()
                    loadData()
                    Toast.makeText(this@ManageTaxActivity,
                        if (isEdit) "Tax updated" else "Tax added", Toast.LENGTH_SHORT).show()
                }
            }
        }
        dialog.show()
    }

    private fun deleteTax(tax: Tax) {
        AlertDialog.Builder(this)
            .setTitle("Delete Tax")
            .setMessage("Are you sure you want to delete '${tax.name}'?")
            .setPositiveButton("Delete") { _, _ ->
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) { db.taxDao().deleteTax(tax) }
                    loadData()
                    Toast.makeText(this@ManageTaxActivity, "Tax deleted", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    inner class TaxAdapter : RecyclerView.Adapter<TaxAdapter.VH>() {
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
                card.setOnClickListener { showTaxDialog(taxes[adapterPosition]) }
            }
        }
        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = VH(
            MaterialCardView(parent.context).apply {
                layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
            }
        )
        override fun onBindViewHolder(holder: VH, position: Int) {
            val t = taxes[position]
            holder.tvName.text = "${t.name} (${t.rate}%)"
            holder.tvDetails.text = "Code: ${t.taxcode ?: "N/A"}"
        }
        override fun getItemCount() = taxes.size
    }
}
