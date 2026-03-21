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
import com.posterita.pos.android.data.local.entity.User
import com.posterita.pos.android.databinding.ActivityManageListBinding
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import javax.inject.Inject

@AndroidEntryPoint
class ManageUsersActivity : AppCompatActivity() {

    private lateinit var binding: ActivityManageListBinding
    @Inject lateinit var db: AppDatabase
    @Inject lateinit var prefsManager: SharedPreferencesManager

    private var users = mutableListOf<User>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityManageListBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.tvTitle.text = "Users"
        binding.buttonBack.setOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.fabAdd.visibility = View.GONE

        loadData()
    }

    private fun loadData() {
        binding.progressLoading.visibility = View.VISIBLE
        lifecycleScope.launch {
            users = withContext(Dispatchers.IO) {
                db.userDao().getAllUsers().toMutableList()
            }
            binding.progressLoading.visibility = View.GONE
            binding.tvEmpty.visibility = if (users.isEmpty()) View.VISIBLE else View.GONE
            binding.layoutEmpty.visibility = if (users.isEmpty()) View.VISIBLE else View.GONE
            binding.recyclerView.adapter = UserAdapter()
        }
    }

    inner class UserAdapter : RecyclerView.Adapter<UserAdapter.VH>() {
        inner class VH(itemView: View) : RecyclerView.ViewHolder(itemView) {
            val card: MaterialCardView = itemView.findViewById(R.id.cardItem)
            val iconBg: View = itemView.findViewById(R.id.iconBg)
            val iconInitial: TextView = itemView.findViewById(R.id.iconInitial)
            val tvName: TextView = itemView.findViewById(R.id.tvItemName)
            val tvSubtitle: TextView = itemView.findViewById(R.id.tvItemSubtitle)
            val tvMeta: TextView = itemView.findViewById(R.id.tvItemMeta)
            val tvBadge: TextView = itemView.findViewById(R.id.tvBadge)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_manage_card, parent, false)
            return VH(view)
        }

        override fun onBindViewHolder(holder: VH, position: Int) {
            val u = users[position]
            val name = "${u.firstname ?: ""} ${u.lastname ?: ""}".trim().ifEmpty { u.username ?: "User" }
            val initial = name.firstOrNull()?.uppercase() ?: "U"

            holder.tvName.text = name
            holder.tvSubtitle.text = u.displayRole
            holder.iconInitial.text = initial

            // Username as meta
            if (!u.username.isNullOrBlank()) {
                holder.tvMeta.text = "@${u.username}"
                holder.tvMeta.visibility = View.VISIBLE
            } else {
                holder.tvMeta.visibility = View.GONE
            }

            // Color by role
            val color = when {
                u.isOwner -> getColor(R.color.posterita_primary)
                u.isAdminOrOwner -> getColor(R.color.posterita_purple)
                u.isSupervisor -> getColor(R.color.posterita_warning)
                else -> getColor(R.color.posterita_secondary)
            }
            val bg = holder.iconBg.background
            if (bg is GradientDrawable) bg.setColor(color)
            holder.iconInitial.setTextColor(getColor(R.color.white))

            // Active badge
            if (u.isactive == "Y") {
                holder.tvBadge.text = "ACTIVE"
                holder.tvBadge.setTextColor(getColor(R.color.posterita_secondary))
                holder.tvBadge.visibility = View.VISIBLE
            } else {
                holder.tvBadge.visibility = View.GONE
            }

            holder.card.setOnClickListener {
                val fields = arrayListOf(
                    "## IDENTITY|",
                    "First Name|${u.firstname ?: ""}",
                    "Last Name|${u.lastname ?: ""}",
                    "Username|${u.username ?: ""}",
                    "Email|${u.email ?: ""}",
                    "---|",
                    "## CONTACT|",
                    "Phone 1|${u.phone1 ?: ""}",
                    "Phone 2|${u.phone2 ?: ""}",
                    "Address|${u.address1 ?: ""}",
                    "Address 2|${u.address2 ?: ""}",
                    "City|${u.city ?: ""}",
                    "State|${u.state ?: ""}",
                    "Zip|${u.zip ?: ""}",
                    "Country|${u.country ?: ""}",
                    "---|",
                    "## ROLE & PERMISSIONS|",
                    "Role|${u.displayRole}",
                    "Admin|${if (u.isadmin == "Y") "Yes" else "No"}",
                    "Sales Rep|${if (u.issalesrep == "Y") "Yes" else "No"}",
                    "Discount Limit|${u.discountlimit}%",
                    "---|",
                    "## STATUS|",
                    "Active|${if (u.isactive == "Y") "Yes" else "No"}",
                    "User ID|${u.user_id}"
                )
                val intent = Intent(this@ManageUsersActivity, DetailViewActivity::class.java)
                intent.putExtra(DetailViewActivity.EXTRA_TITLE, name.ifEmpty { "User Details" })
                intent.putExtra(DetailViewActivity.EXTRA_SUBTITLE, u.displayRole)
                intent.putExtra(DetailViewActivity.EXTRA_COLOR, color)
                intent.putStringArrayListExtra(DetailViewActivity.EXTRA_FIELDS, fields)
                startActivity(intent)
            }
        }

        override fun getItemCount() = users.size
    }
}
