package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.posterita.pos.android.R
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
            binding.layoutEmpty.visibility = if (taxes.isEmpty()) View.VISIBLE else View.GONE
            binding.recyclerView.adapter = TaxAdapter()
        }
    }

    inner class TaxAdapter : RecyclerView.Adapter<TaxAdapter.VH>() {
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
            val t = taxes[position]

            holder.tvName.text = t.name ?: "Tax"
            holder.tvSubtitle.text = "Rate: ${t.rate}% · Code: ${t.taxcode ?: "N/A"}"
            holder.iconInitial.text = "%"

            // Tax icon color
            val bg = holder.iconBg.background
            if (bg is GradientDrawable) bg.setColor(getColor(R.color.posterita_warning))
            holder.iconInitial.setTextColor(getColor(R.color.white))

            // Active badge
            if (t.isactive == "Y") {
                holder.tvBadge.text = "ACTIVE"
                holder.tvBadge.setTextColor(getColor(R.color.posterita_secondary))
                holder.tvBadge.visibility = View.VISIBLE
            } else {
                holder.tvBadge.text = "INACTIVE"
                holder.tvBadge.setTextColor(getColor(R.color.posterita_muted))
                holder.tvBadge.visibility = View.VISIBLE
            }

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
                intent.putExtra(DetailViewActivity.EXTRA_SUBTITLE, "Rate: ${t.rate}%")
                intent.putExtra(DetailViewActivity.EXTRA_COLOR, getColor(R.color.posterita_warning))
                intent.putStringArrayListExtra(DetailViewActivity.EXTRA_FIELDS, fields)
                startActivity(intent)
            }
        }

        override fun getItemCount() = taxes.size
    }
}
