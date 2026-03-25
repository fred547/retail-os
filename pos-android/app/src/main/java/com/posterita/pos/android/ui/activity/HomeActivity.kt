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
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.card.MaterialCardView
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.databinding.ActivityHomeBinding
import com.posterita.pos.android.util.AppErrorLogger
import com.posterita.pos.android.util.DemoDataSeeder
import com.posterita.pos.android.util.SessionManager
import com.posterita.pos.android.util.ConnectivityMonitor
import com.posterita.pos.android.util.SharedPreferencesManager
import com.posterita.pos.android.util.NumberUtils
import com.posterita.pos.android.util.SessionTimeoutManager
import dagger.hilt.android.AndroidEntryPoint
import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import com.posterita.pos.android.data.local.entity.Store
import com.posterita.pos.android.data.local.entity.Terminal
import com.posterita.pos.android.util.LocalAccountRegistry
import java.util.Calendar
import javax.inject.Inject

private sealed class PickerItem {
    data class BrandSwitch(val account: com.posterita.pos.android.util.AccountEntry) : PickerItem()
    data class StoreTerminal(val store: Store, val terminal: Terminal?) : PickerItem()
}

@AndroidEntryPoint
class HomeActivity : BaseActivity() {

    private lateinit var binding: ActivityHomeBinding

    @Inject
    lateinit var prefsManager: SharedPreferencesManager

    @Inject
    lateinit var sessionManager: SessionManager

    @Inject
    lateinit var db: AppDatabase

    @Inject
    lateinit var connectivityMonitor: ConnectivityMonitor

    @Inject
    lateinit var accountRegistry: LocalAccountRegistry

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

        // Check idle timeout
        SessionTimeoutManager.checkAndLock(this)

        // Always ensure session has a user (handles brand switching, demo accounts, etc.)
        if (sessionManager.user == null) {
            lifecycleScope.launch {
                withContext(Dispatchers.IO) {
                    try {
                        val user = db.userDao().getAllUsers().firstOrNull()
                        if (user != null) {
                            sessionManager.user = user
                        }
                        // Also load account/store/terminal if missing
                        if (sessionManager.account == null) {
                            sessionManager.account = db.accountDao().getAccountById(prefsManager.accountId)
                        }
                        if (sessionManager.store == null) {
                            val store = db.storeDao().getAllStores().firstOrNull()
                            if (store != null) {
                                sessionManager.store = store
                                prefsManager.setStoreIdSync(store.storeId)
                                prefsManager.setStoreNameSync(store.name ?: "")
                            }
                        }
                        if (sessionManager.terminal == null) {
                            val terminal = db.terminalDao().getAllTerminals().firstOrNull()
                            if (terminal != null) {
                                sessionManager.terminal = terminal
                                prefsManager.setTerminalIdSync(terminal.terminalId)
                                prefsManager.setTerminalNameSync(terminal.name ?: "")
                                prefsManager.terminalType = terminal.terminal_type
                            }
                        }
                    } catch (e: Exception) {
                        AppErrorLogger.warn(this@HomeActivity, "HomeActivity", "Failed to load session data", e)
                    }
                    Unit
                }
                // Refresh UI after session is loaded
                setupGreeting()
                setupContextBar()
                setupAppGrid()
            }
        }

        setupGreeting()
        setupContextBar()
        setupAppGrid()
        loadTodaySummary()
        setupBottomNav()
        setupConnectivityDot()

        // Pre-fetch common WebView pages so they load instantly when tapped
        val base = "https://web.posterita.com"
        for (path in listOf("/products", "/stores", "/terminals", "/categories", "/users")) {
            com.posterita.pos.android.util.WebViewWarmUp.prefetchUrl("$base$path")
        }
    }

    override fun onResume() {
        super.onResume()
        loadTodaySummary()
    }

    private fun setupGreeting() {
        val user = sessionManager.user
        val displayName = user?.firstname?.ifBlank { null }
            ?: sessionManager.account?.businessname?.ifBlank { null }
            ?: prefsManager.storeName.ifEmpty { "there" }
        val greeting = when (Calendar.getInstance().get(Calendar.HOUR_OF_DAY)) {
            in 0..11 -> "Good morning"
            in 12..17 -> "Good afternoon"
            else -> "Good evening"
        }
        binding.textGreeting.text = "$greeting, $displayName"
    }

    private fun setupContextBar() {
        // Read from session (loaded from Room DB) — not prefs which get contaminated by multi-brand sync
        val brandName = sessionManager.account?.businessname
            ?: accountRegistry.getAccount(prefsManager.accountId)?.name
            ?: prefsManager.accountId
        val storeName = sessionManager.store?.name
            ?: prefsManager.storeName.ifEmpty { "Store" }
        val terminalName = sessionManager.terminal?.name
            ?: prefsManager.terminalName.ifEmpty { "POS 1" }

        binding.textContextBrand.text = brandName
        binding.textContextStore.text = storeName
        binding.textContextTerminal.text = terminalName

        // Show owner email + role for context
        val ownerEmail = prefsManager.email
        val userRole = sessionManager.user?.displayRole
        if (ownerEmail.isNotBlank()) {
            binding.textOwnerEmail.text = if (userRole != null) "$ownerEmail · $userRole" else ownerEmail
            binding.textOwnerEmail.visibility = android.view.View.VISIBLE
        }

        binding.layoutContextSwitcher.setOnClickListener { showContextPicker() }
    }

    private fun showContextPicker() {
        lifecycleScope.launch {
            // Load brands (other accounts) from the registry
            val allBrands = accountRegistry.getAllAccounts()
            val currentAccountId = prefsManager.accountId

            val stores = withContext(Dispatchers.IO) {
                try { db.storeDao().getAllStores().filter { it.isactive == "Y" } }
                catch (e: Exception) { AppErrorLogger.warn(this@HomeActivity, "HomeActivity", "Failed to load stores", e); emptyList() }
            }
            val terminals = withContext(Dispatchers.IO) {
                try { db.terminalDao().getAllTerminals().filter { it.isactive == "Y" } }
                catch (e: Exception) { AppErrorLogger.warn(this@HomeActivity, "HomeActivity", "Failed to load terminals", e); emptyList() }
            }

            // Build picker items: brands first, then stores/terminals
            val items = mutableListOf<String>()
            // Track what each item represents
            val pickerItems = mutableListOf<PickerItem>()

            // Add other brands at the top
            val otherBrands = allBrands.filter { it.id != currentAccountId }
            if (otherBrands.isNotEmpty()) {
                for (brand in otherBrands) {
                    val label = "⟳ ${brand.name}" + if (brand.type == "demo") " (Demo)" else ""
                    items.add(label)
                    pickerItems.add(PickerItem.BrandSwitch(brand))
                }
            }

            // Add current brand's stores/terminals
            for (store in stores) {
                val storeTerminals = terminals.filter { it.store_id == store.storeId }
                if (storeTerminals.isEmpty()) {
                    items.add(store.name ?: "Store ${store.storeId}")
                    pickerItems.add(PickerItem.StoreTerminal(store, null))
                } else {
                    for (terminal in storeTerminals) {
                        items.add("${store.name ?: "Store"} › ${terminal.name ?: "Terminal"}")
                        pickerItems.add(PickerItem.StoreTerminal(store, terminal))
                    }
                }
            }

            if (items.isEmpty()) {
                Toast.makeText(this@HomeActivity, "No stores found", Toast.LENGTH_SHORT).show()
                return@launch
            }

            // Find currently selected index (skip brand items)
            val currentStoreId = prefsManager.storeId
            val currentTerminalId = prefsManager.terminalId
            val currentIndex = pickerItems.indexOfFirst { item ->
                item is PickerItem.StoreTerminal &&
                    item.store.storeId == currentStoreId &&
                    (item.terminal?.terminalId ?: 0) == currentTerminalId
            }.coerceAtLeast(0)

            val currentBrandName = sessionManager.account?.businessname ?: prefsManager.storeName
            androidx.appcompat.app.AlertDialog.Builder(this@HomeActivity)
                .setTitle("Switch — $currentBrandName")
                .setSingleChoiceItems(items.toTypedArray(), currentIndex) { dialog, which ->
                    when (val picked = pickerItems[which]) {
                        is PickerItem.BrandSwitch -> {
                            dialog.dismiss()
                            switchBrand(picked.account)
                        }
                        is PickerItem.StoreTerminal -> {
                            switchContext(picked.store, picked.terminal)
                            dialog.dismiss()
                        }
                    }
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun switchBrand(brand: com.posterita.pos.android.util.AccountEntry) {
        // Reuse the ManageBrandsActivity switchToBrand logic
        sessionManager.resetSession()
        prefsManager.setAccountIdSync(brand.id)
        prefsManager.setStoreNameSync(brand.name)
        AppDatabase.resetInstance()
        prefsManager.setStringSync("last_brand_id", brand.id)
        accountRegistry.touchAccount(brand.id)

        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                try {
                    val newDb = AppDatabase.getInstance(this@HomeActivity, brand.id)
                    val user = newDb.userDao().getAllUsers().firstOrNull()
                    if (user != null) sessionManager.user = user
                    val acct = newDb.accountDao().getAccountById(brand.id)
                    if (acct != null) sessionManager.account = acct
                    val store = newDb.storeDao().getAllStores().firstOrNull()
                    if (store != null) {
                        sessionManager.store = store
                        prefsManager.setStoreIdSync(store.storeId)
                        prefsManager.setStoreNameSync(store.name ?: brand.name)
                    }
                    val terminal = if (store != null) {
                        newDb.terminalDao().getTerminalsForStore(store.storeId).firstOrNull()
                    } else null
                    if (terminal != null) {
                        sessionManager.terminal = terminal
                        prefsManager.setTerminalIdSync(terminal.terminalId)
                        prefsManager.setTerminalNameSync(terminal.name ?: "Terminal")
                        prefsManager.terminalType = terminal.terminal_type
                    }
                } catch (e: Exception) {
                    AppErrorLogger.warn(this@HomeActivity, "HomeActivity", "Failed to switch brand", e)
                }
                Unit
            }

            // Restart HomeActivity to reload everything
            val intent = Intent(this@HomeActivity, HomeActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        }
    }

    private fun switchContext(store: Store, terminal: Terminal?) {
        prefsManager.setStoreIdSync(store.storeId)
        prefsManager.setStoreNameSync(store.name ?: "")

        if (terminal != null) {
            prefsManager.setTerminalIdSync(terminal.terminalId)
            prefsManager.setTerminalNameSync(terminal.name ?: "")
            prefsManager.terminalType = terminal.terminal_type
            sessionManager.terminal = terminal
        }

        sessionManager.store = store

        // Refresh UI
        binding.textContextStore.text = store.name ?: "Store"
        binding.textContextTerminal.text = terminal?.name ?: "—"

        Toast.makeText(this, "Switched to ${store.name}${terminal?.let { " › ${it.name}" } ?: ""}", Toast.LENGTH_SHORT).show()

        // Reload today's summary for new context
        loadTodaySummary()
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
                                // Lock the session — user must re-enter PIN
                                // Don't clear session — remember who they are
                                SessionTimeoutManager.lock()
                                val intent = Intent(this, LockScreenActivity::class.java)
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

            val currency = sessionManager.account?.currency ?: ""

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
        // Dashboard shows only top-level app launchers.
        // Orders, Tills, Customers live inside POS drawer — not on dashboard.
        val tiles = listOf(
            AppTile("pos", "POS", R.drawable.pos, 0xFF1976D2.toInt(), true, TillActivity::class.java, TileVisibility.ALL),
            AppTile("warehouse", "Warehouse", R.drawable.ic_search, 0xFFF57F17.toInt(), true, InventoryCountActivity::class.java, TileVisibility.SUPERVISOR_PLUS),
            AppTile("admin", "Admin", R.drawable.settings, 0xFF6C6F76.toInt(), true, SettingsActivity::class.java, TileVisibility.ALL),
            AppTile("sync", "Synchronizer", R.drawable.ic_check_circle, 0xFF00838F.toInt(), true, DatabaseSynchonizerActivity::class.java, TileVisibility.ALL),
        )

        val user = sessionManager.user
        val filteredTiles = if (user == null) {
            tiles
        } else {
            tiles.filter { tile ->
                when (tile.visibility) {
                    TileVisibility.ALL -> true
                    TileVisibility.SUPERVISOR_PLUS -> user.isSupervisor
                    TileVisibility.ADMIN_OWNER -> user.isAdminOrOwner
                    TileVisibility.OWNER_ONLY -> user.isOwner
                }
            }
        }

        binding.recyclerAppGrid.layoutManager = GridLayoutManager(this, 2)
        binding.recyclerAppGrid.adapter = AppGridAdapter(filteredTiles.map { it as Any }) { tile ->
            if (tile.enabled && tile.activityClass != null) {
                startActivity(Intent(this, tile.activityClass))
            } else {
                Toast.makeText(this, "Coming soon", Toast.LENGTH_SHORT).show()
            }
        }
    }

    private class AppGridAdapter(
        private val items: List<Any>,
        private val onClick: (AppTile) -> Unit
    ) : RecyclerView.Adapter<AppGridAdapter.ViewHolder>() {

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
            val tile = items[position] as AppTile
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

        override fun getItemCount() = items.size
    }
}
