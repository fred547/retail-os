package com.posterita.pos.android.ui.activity

import android.app.Activity
import android.content.Intent
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.databinding.ActivityHomeBinding
import com.posterita.pos.android.util.DemoDataSeeder
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import java.util.Calendar
import javax.inject.Inject

@AndroidEntryPoint
class HomeActivity : AppCompatActivity() {

    private lateinit var binding: ActivityHomeBinding

    @Inject
    lateinit var prefsManager: SharedPreferencesManager

    @Inject
    lateinit var sessionManager: SessionManager

    @Inject
    lateinit var db: AppDatabase

    data class AppTile(
        val id: String,
        val label: String,
        val iconRes: Int,
        val color: Int,
        val enabled: Boolean,
        val activityClass: Class<out Activity>?
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // For demo accounts, auto-load the session so POS/Till work without login
        if (sessionManager.user == null && DemoDataSeeder.isDemoAccount(prefsManager.accountId)) {
            runBlocking {
                withContext(Dispatchers.IO) {
                    val user = db.userDao().getAllUsers().firstOrNull()
                    if (user != null) sessionManager.user = user
                }
            }
        }

        setupGreeting()
        setupAppGrid()
    }

    private fun setupGreeting() {
        val user = sessionManager.user
        val displayName = user?.firstname?.ifBlank { null }
            ?: prefsManager.storeName.ifEmpty { "there" }
        val greeting = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
            in 0..11 -> "Good morning"
            in 12..17 -> "Good afternoon"
            else -> "Good evening"
        }
        binding.textGreeting.text = "$greeting, $displayName"
    }

    private fun setupAppGrid() {
        // Tiles match the Manus prototype ROLE_SCREENS for owner
        val tiles = listOf(
            AppTile("pos", "Point of Sale", R.drawable.pos, 0xFF1976D2.toInt(), true, TillActivity::class.java),
            AppTile("inventory", "Inventory", R.drawable.ic_search, 0xFFF57F17.toInt(), false, null),
            AppTile("loyalty", "Loyalty", R.drawable.ic_check_circle, 0xFF5E35B1.toInt(), false, null),
            AppTile("catalogue", "Catalogue", R.drawable.ic_edit, 0xFFF57F17.toInt(), false, null),
            AppTile("staff", "Staff", R.drawable.ic_selectuser_blue, 0xFF2E7D32.toInt(), false, null),
            AppTile("shifts", "Shifts", R.drawable.till, 0xFF1976D2.toInt(), false, null),
            AppTile("chat", "AI Assistant", R.drawable.ic_splash, 0xFF1976D2.toInt(), false, null),
            AppTile("whatsapp", "WhatsApp", R.drawable.ic_splash, 0xFF2E7D32.toInt(), false, null),
            AppTile("settings", "Settings", R.drawable.settings, 0xFF6C6F76.toInt(), true, SettingsActivity::class.java)
        )

        binding.recyclerAppGrid.layoutManager = GridLayoutManager(this, 3)
        binding.recyclerAppGrid.adapter = AppTileAdapter(tiles) { tile ->
            if (tile.enabled && tile.activityClass != null) {
                startActivity(Intent(this, tile.activityClass))
            } else {
                Toast.makeText(this, "Coming soon", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private class AppTileAdapter(
        private val tiles: List<AppTile>,
        private val onClick: (AppTile) -> Unit
    ) : RecyclerView.Adapter<AppTileAdapter.ViewHolder>() {

        class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val card: MaterialCardView = view as MaterialCardView
            val imgIcon: ImageView = view.findViewById(R.id.imgTileIcon)
            val textLabel: TextView = view.findViewById(R.id.textTileLabel)
            val textComingSoon: TextView = view.findViewById(R.id.textTileComingSoon)
        }

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val view = LayoutInflater.from(parent.context)
                .inflate(R.layout.item_app_tile, parent, false)
            return ViewHolder(view)
        }

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val tile = tiles[position]

            // Set up the colored rounded-square background (design system: 12dp radius)
            val density = holder.itemView.context.resources.displayMetrics.density
            val cornerPx = (12 * density).toInt().toFloat()
            val iconBg = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = cornerPx
                setColor(tile.color)
            }
            holder.imgIcon.background = iconBg
            holder.imgIcon.setImageResource(tile.iconRes)
            holder.imgIcon.setColorFilter(0xFFFFFFFF.toInt())
            holder.imgIcon.setPadding(12, 12, 12, 12)

            holder.textLabel.text = tile.label

            if (!tile.enabled) {
                holder.textComingSoon.visibility = View.VISIBLE
                holder.card.alpha = 0.5f
            } else {
                holder.textComingSoon.visibility = View.GONE
                holder.card.alpha = 1.0f
            }

            holder.card.setOnClickListener { onClick(tile) }
        }

        override fun getItemCount() = tiles.size
    }
}
