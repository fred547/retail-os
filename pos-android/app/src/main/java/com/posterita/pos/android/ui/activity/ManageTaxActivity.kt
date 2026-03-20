package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
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

        binding.tvTitle.text = "Taxes"
        binding.buttonBack.setOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.fabAdd.visibility = View.GONE

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
            holder.card.setOnClickListener {
                val fields = arrayListOf(
                    "## GENERAL|",
                    "Name|${t.name ?: ""}",
                    "Rate|${t.rate}%",
                    "Tax Code|${t.taxcode ?: ""}",
                    "---|",
                    "## STATUS|",
                    "Active|${if (t.isactive == "Y") "Yes" else "No"}",
                    "Tax ID|${t.tax_id}"
                )
                val intent = Intent(this@ManageTaxActivity, DetailViewActivity::class.java)
                intent.putExtra(DetailViewActivity.EXTRA_TITLE, t.name ?: "Tax Details")
                intent.putStringArrayListExtra(DetailViewActivity.EXTRA_FIELDS, fields)
                startActivity(intent)
            }
        }
        override fun getItemCount() = taxes.size
    }
}
