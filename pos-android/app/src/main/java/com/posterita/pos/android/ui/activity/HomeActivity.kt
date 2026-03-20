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
import com.posterita.pos.android.util.ConnectivityMonitor
import com.posterita.pos.android.util.SharedPreferencesManager
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionTimeoutManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
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

    @Inject
    lateinit var connectivityMonitor: ConnectivityMonitor

    enum class TileVisibility { ALL, SUPERVISOR_PLUS, ADMIN_OWNER, OWNER_ONLY }

    data class AppTile(
        val id: String,
        val label: String,
        val iconRes: Int,
        val color: Int,
        val enabled: Boolean,
        val activityClass: Class<out Activity>?,
        val visibility: TileVisibility = TileVisibility.ALL
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

        // Check idle timeout
        SessionTimeoutManager.checkAndLock(this)

        setupGreeting()
        setupAppGrid()
        loadTodaySummary()
        setupBottomNav()
        setupConnectivityDot()
    }

    override fun onResume() {
        super.onResume()
        loadTodaySummary()
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

        // Show store name + role under greeting (matches prototype)
        val storeName = prefsManager.storeName.ifEmpty { null }
        val roleName = user?.displayRole
        val subtitle = listOfNotNull(
            storeName?.let { "$it store" },
            roleName
        ).joinToString(" · ")
        binding.textBranding.text = subtitle.ifEmpty { "retailOS" }

        // Show terminal info
        val terminalName = prefsManager.terminalName.ifEmpty { null }
        if (terminalName != null) {
            binding.textTerminalInfo?.text = "Terminal: $terminalName"
            binding.textTerminalInfo?.visibility = View.VISIBLE
        }
    }

    private fun setupBottomNav() {
        // Home — already here, no-op
        binding.navHome?.setOnClickListener { /* already on home */ }

        // POS — launch till/product
        binding.navPOS?.setOnClickListener {
            startActivity(Intent(this, TillActivity::class.java))
        }

        // Orders
        binding.navOrders?.setOnClickListener {
            startActivity(Intent(this, OrdersActivity::class.java))
        }

        // More — show popup with Settings + Logout
        binding.navMore?.setOnClickListener { view ->
            val popup = android.widget.PopupMenu(this, view)
            popup.menu.add(0, 1, 0, "Settings")
            popup.menu.add(0, 2, 1, "About")
            popup.menu.add(0, 3, 2, "Log Out")
            popup.setOnMenuItemClickListener { item ->
                when (item.itemId) {
                    1 -> {
                        startActivity(Intent(this, SettingsActivity::class.java))
                        true
                    }
                    2 -> {
                        startActivity(Intent(this, AboutActivity::class.java))
                        true
                    }
                    3 -> {
                        androidx.appcompat.app.AlertDialog.Builder(this)
                            .setTitle("Log Out")
                            .setMessage("Are you sure you want to log out?")
                            .setPositiveButton("Log Out") { _, _ ->
                                sessionManager.resetSession()
                                val intent = Intent(this, SelectUserLoginActivity::class.java)
                                intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                                startActivity(intent)
                                finish()
                            }
                            .setNegativeButton("Cancel", null)
                            .show()
                        true
                    }
                    else -> false
                }
            }
            popup.show()
        }
    }

    private fun loadTodaySummary() {
        lifecycleScope.launch(Dispatchers.IO) {
            // Get today's start timestamp (midnight)
            val cal = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, 0)
                set(Calendar.MINUTE, 0)
                set(Calendar.SECOND, 0)
                set(Calendar.MILLISECOND, 0)
            }
            val todayStart = cal.timeInMillis

            // Query today's orders
            val allOrders = db.orderDao().getAllOrders()
            val todayOrders = allOrders.filter { order ->
                val orderTime = order.dateOrdered?.time ?: 0L
                orderTime >= todayStart
            }

            val orderCount = todayOrders.size
            val revenue = todayOrders.sumOf { it.grandTotal }
            val customerCount = todayOrders.filter { it.customerId > 0 }.map { it.customerId }.distinct().size

            val currency = sessionManager.account?.currency ?: "Rs"

            withContext(Dispatchers.Main) {
                binding.textOrderCount?.text = orderCount.toString()
                binding.textRevenue?.text = "$currency ${NumberUtils.formatPrice(revenue)}"
                binding.textLoyaltySignups?.text = customerCount.toString()
            }
        }
    }

    private fun setupConnectivityDot() {
        val dot = findViewById<View>(R.id.connectivity_dot) ?: return
        connectivityMonitor.isConnected.observe(this) { connected ->
            val color = if (connected) {
                resources.getColor(R.color.posterita_secondary, theme)
            } else {
                resources.getColor(R.color.posterita_error, theme)
            }
            val bg = dot.background
            if (bg is GradientDrawable) {
                bg.setColor(color)
            } else {
                val oval = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(color)
                    setSize(
                        (8 * resources.displayMetrics.density).toInt(),
                        (8 * resources.displayMetrics.density).toInt()
                    )
                }
                dot.background = oval
            }
        }
        dot.setOnClickListener {
            startActivity(Intent(this, DatabaseSynchonizerActivity::class.java))
        }
    }

    private fun setupAppGrid() {
        // Capability-driven tiles — filtered by user role
        val allTiles = listOf(
            AppTile("pos", "Point of Sale", R.drawable.pos, 0xFF1976D2.toInt(), true, TillActivity::class.java, TileVisibility.ALL),
            AppTile("orders", "Orders", R.drawable.ic_check_circle, 0xFF5E35B1.toInt(), true, OrdersActivity::class.java, TileVisibility.ALL),
            AppTile("tills", "Tills", R.drawable.till, 0xFF00838F.toInt(), true, TillHistoryActivity::class.java, TileVisibility.SUPERVISOR_PLUS),
            AppTile("inventory", "Inventory", R.drawable.ic_search, 0xFFF57F17.toInt(), false, null, TileVisibility.SUPERVISOR_PLUS),
            AppTile("settings", "Settings", R.drawable.settings, 0xFF6C6F76.toInt(), true, SettingsActivity::class.java, TileVisibility.ALL),
            AppTile("customers", "Customers", R.drawable.ic_selectuser_blue, 0xFF2E7D32.toInt(), true, SearchCustomerActivity::class.java, TileVisibility.SUPERVISOR_PLUS),
            AppTile("staff", "Staff", R.drawable.ic_selectuser_blue, 0xFF2E7D32.toInt(), false, null, TileVisibility.ADMIN_OWNER),
            AppTile("reports", "Reports", R.drawable.ic_edit, 0xFFF57F17.toInt(), false, null, TileVisibility.ADMIN_OWNER),
            AppTile("brands", "Brands", R.drawable.ic_splash, 0xFF007AFF.toInt(), true, ManageBrandsActivity::class.java, TileVisibility.OWNER_ONLY)
        )

        val user = sessionManager.user
        val tiles = if (user == null) {
            // Demo / no user — show all enabled tiles
            allTiles.filter { it.enabled }
        } else {
            allTiles.filter { tile ->
                when (tile.visibility) {
                    TileVisibility.ALL -> true
                    TileVisibility.SUPERVISOR_PLUS -> user.isSupervisor
                    TileVisibility.ADMIN_OWNER -> user.isAdminOrOwner
                    TileVisibility.OWNER_ONLY -> user.isOwner
                }
            }
        }

        binding.recyclerAppGrid.layoutManager = GridLayoutManager(this, 2)
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
