package com.posterita.pos.android.ui.activity

import android.os.Bundle
import android.text.InputType
import android.view.View
import android.view.ViewGroup
import android.widget.ArrayAdapter
import android.widget.Spinner
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
import com.posterita.pos.android.data.local.entity.User
import com.posterita.pos.android.databinding.ActivityManageListBinding
import com.posterita.pos.android.util.DemoDataSeeder
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

        binding.toolbar.title = "Manage Users"
        binding.toolbar.setNavigationOnClickListener { finish() }

        binding.recyclerView.layoutManager = LinearLayoutManager(this)
        binding.fabAdd.setOnClickListener { showUserDialog(null) }

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

    private fun showUserDialog(user: User?) {
        val isEdit = user != null
        val isOwnerUser = user?.isOwner == true

        // Block editing the demo owner
        if (isEdit && isOwnerUser && DemoDataSeeder.isDemoAccount(prefsManager.accountId)) {
            Toast.makeText(this, "Can't edit the demo owner. Sign up to create your own account.", Toast.LENGTH_LONG).show()
            return
        }

        val container = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            setPadding(64, 32, 64, 16)
        }

        val tilFirstname = TextInputLayout(this).apply {
            hint = "First Name"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }
        val etFirstname = TextInputEditText(this)
        tilFirstname.addView(etFirstname)
        container.addView(tilFirstname)

        val tilLastname = TextInputLayout(this).apply {
            hint = "Last Name"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = 16 }
        }
        val etLastname = TextInputEditText(this)
        tilLastname.addView(etLastname)
        container.addView(tilLastname)

        val tilUsername = TextInputLayout(this).apply {
            hint = "Username"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = 16 }
        }
        val etUsername = TextInputEditText(this)
        tilUsername.addView(etUsername)
        container.addView(tilUsername)

        val tilPin = TextInputLayout(this).apply {
            hint = "PIN"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = 16 }
        }
        val etPin = TextInputEditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
        }
        tilPin.addView(etPin)
        container.addView(tilPin)

        // Email field (shown for owner, optional for others)
        val tilEmail = TextInputLayout(this).apply {
            hint = if (isOwnerUser) "Email * (for PIN recovery)" else "Email"
            layoutParams = android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { topMargin = 16 }
        }
        val etEmail = TextInputEditText(this).apply {
            inputType = InputType.TYPE_TEXT_VARIATION_EMAIL_ADDRESS
        }
        tilEmail.addView(etEmail)
        container.addView(tilEmail)

        // Role selector — owner role is not selectable
        val roleLabel = TextView(this).apply {
            text = "Role"
            textSize = 13f
            setPadding(0, 24, 0, 8)
        }
        container.addView(roleLabel)

        val roleSpinner = Spinner(this).apply {
            layoutParams = android.widget.LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }

        if (isOwnerUser) {
            // Owner can't change their role
            roleSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, listOf("Owner"))
            roleSpinner.isEnabled = false
        } else {
            val roles = listOf("Admin", "Staff")
            roleSpinner.adapter = ArrayAdapter(this, android.R.layout.simple_spinner_dropdown_item, roles)
        }
        container.addView(roleSpinner)

        if (isEdit) {
            etFirstname.setText(user!!.firstname)
            etLastname.setText(user.lastname)
            etUsername.setText(user.username)
            etPin.setText(user.pin ?: "")
            etEmail.setText(user.email ?: "")
            if (!isOwnerUser) {
                val roleIndex = if (user.role == User.ROLE_ADMIN || user.isadmin == "Y") 0 else 1
                roleSpinner.setSelection(roleIndex)
            }
        }

        val dialog = AlertDialog.Builder(this)
            .setTitle(if (isEdit) "Edit User" else "Add User")
            .setView(container)
            .setPositiveButton("Save", null)
            .setNegativeButton("Cancel", null)
            .apply {
                if (isEdit && !isOwnerUser) {
                    setNeutralButton("Delete") { _, _ -> deleteUser(user!!) }
                }
            }
            .create()

        dialog.setOnShowListener {
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener {
                val firstname = etFirstname.text?.toString()?.trim() ?: ""
                val lastname = etLastname.text?.toString()?.trim() ?: ""
                val username = etUsername.text?.toString()?.trim() ?: ""
                val pin = etPin.text?.toString()?.trim() ?: ""
                val email = etEmail.text?.toString()?.trim() ?: ""

                val selectedRole: String
                val isAdmin: String
                if (isOwnerUser) {
                    selectedRole = User.ROLE_OWNER
                    isAdmin = "Y"
                } else {
                    val rolePos = roleSpinner.selectedItemPosition
                    selectedRole = if (rolePos == 0) User.ROLE_ADMIN else User.ROLE_STAFF
                    isAdmin = if (rolePos == 0) "Y" else "N"
                }

                if (firstname.isEmpty()) {
                    Toast.makeText(this, "First name is required", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                if (username.isEmpty()) {
                    Toast.makeText(this, "Username is required", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }
                if (isOwnerUser && (email.isEmpty() || !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches())) {
                    Toast.makeText(this, "Valid email is required for owner", Toast.LENGTH_SHORT).show()
                    return@setOnClickListener
                }

                lifecycleScope.launch {
                    withContext(Dispatchers.IO) {
                        if (isEdit) {
                            val updated = user!!.copy(
                                firstname = firstname,
                                lastname = lastname,
                                username = username,
                                pin = pin,
                                isadmin = isAdmin,
                                role = selectedRole,
                                email = email.ifEmpty { null }
                            )
                            db.userDao().updateUser(updated)
                        } else {
                            val maxId = db.userDao().getMaxUserId() ?: 0
                            val newUser = User(
                                user_id = maxId + 1,
                                firstname = firstname,
                                lastname = lastname,
                                username = username,
                                pin = pin,
                                isadmin = isAdmin,
                                isactive = "Y",
                                issalesrep = "Y",
                                role = selectedRole,
                                email = email.ifEmpty { null }
                            )
                            db.userDao().insertUser(newUser)
                        }
                    }
                    dialog.dismiss()
                    loadData()
                    Toast.makeText(this@ManageUsersActivity,
                        if (isEdit) "User updated" else "User added", Toast.LENGTH_SHORT).show()
                }
            }
        }
        dialog.show()
    }

    private fun deleteUser(user: User) {
        if (user.isOwner) {
            Toast.makeText(this, "Cannot delete the owner account", Toast.LENGTH_SHORT).show()
            return
        }
        AlertDialog.Builder(this)
            .setTitle("Delete User")
            .setMessage("Are you sure you want to delete '${user.firstname} ${user.lastname}'?")
            .setPositiveButton("Delete") { _, _ ->
                lifecycleScope.launch {
                    withContext(Dispatchers.IO) { db.userDao().deleteUser(user) }
                    loadData()
                    Toast.makeText(this@ManageUsersActivity, "User deleted", Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
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
                card.setOnClickListener { showUserDialog(users[adapterPosition]) }
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
        }
        override fun getItemCount() = users.size
    }
}
