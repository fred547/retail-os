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
            binding.recyclerView.adapter = UserAdapter()
        }
    }

    inner class UserAdapter : RecyclerView.Adapter<UserAdapter.VH>() {
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
            val u = users[position]
            holder.tvName.text = "${u.firstname ?: ""} ${u.lastname ?: ""} (${u.username ?: ""})"
            holder.tvDetails.text = u.displayRole
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
                intent.putExtra(DetailViewActivity.EXTRA_TITLE, "${u.firstname ?: ""} ${u.lastname ?: ""}".trim().ifEmpty { "User Details" })
                intent.putStringArrayListExtra(DetailViewActivity.EXTRA_FIELDS, fields)
                startActivity(intent)
            }
        }
        override fun getItemCount() = users.size
    }
}
