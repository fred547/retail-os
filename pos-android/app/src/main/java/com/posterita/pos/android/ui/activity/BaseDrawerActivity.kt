package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.core.view.GravityCompat
import androidx.drawerlayout.widget.DrawerLayout
import android.graphics.Typeface
import android.os.Handler
import android.os.Looper
import android.widget.ProgressBar
import androidx.lifecycle.lifecycleScope
import android.graphics.drawable.GradientDrawable
import com.posterita.pos.android.R
import com.posterita.pos.android.util.ConnectivityMonitor
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.service.AiImportService
import com.posterita.pos.android.service.SyncStatusManager
import com.posterita.pos.android.util.LocalAccountRegistry
import com.posterita.pos.android.util.SharedPreferencesManager
import com.posterita.pos.android.worker.CloudSyncWorker
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import javax.inject.Inject

/**
 * Base activity that provides the navigation drawer on every screen.
 *
 * Two usage modes:
 *
 * 1. **Programmatic wrapping** — call setContentViewWithDrawer(layoutResId) instead of setContentView().
 *    This wraps the activity's layout inside a DrawerLayout with the standard nav menu.
 *
 * 2. **Existing DrawerLayout** — call initExistingDrawer(drawerLayout) when the XML already
 *    contains a DrawerLayout. This adds the nav panel to the existing drawer.
 *
 * After either call, invoke setupDrawerNavigation() to wire up click handlers.
 *
 * Optionally override:
 * - getDrawerHighlightId() to highlight the current nav item
 * - showBackButton() to show a back arrow instead of hamburger
 */
abstract class BaseDrawerActivity : BaseActivity() {

    protected lateinit var drawerLayout: DrawerLayout
    private var navView: View? = null

    @Inject
    lateinit var prefsManager: SharedPreferencesManager

    @Inject
    lateinit var connectivityMonitor: ConnectivityMonitor

    /**
     * Override this in subclasses to highlight the current nav item.
     * Return the resource ID of the nav item (e.g., R.id.nav_orders).
     * Return 0 to keep the default POS highlight.
     */
    open fun getDrawerHighlightId(): Int = 0

    /**
     * Whether to show the back button. Default true for sub-screens.
     * ProductActivity overrides this to return false.
     */
    open fun showBackButton(): Boolean = true

    /**
     * Sets up the connectivity dot (ID: connectivity_dot) in the current layout.
     * Call this after setContentView/setContentViewWithDrawer.
     * The dot is green when online, red when offline.
     */
    protected fun setupConnectivityDot() {
        val dot = findViewById<View>(R.id.connectivity_dot) ?: return
        connectivityMonitor.isConnected.observe(this) { connected ->
            val color = if (connected) {
                resources.getColor(R.color.posterita_secondary, theme) // green
            } else {
                resources.getColor(R.color.posterita_error, theme) // red
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
    }

    /**
     * Call this instead of setContentView() to wrap your layout in the drawer.
     */
    protected fun setContentViewWithDrawer(layoutResId: Int) {
        // Create the DrawerLayout wrapper
        drawerLayout = DrawerLayout(this).apply {
            id = R.id.my_drawer_layout
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        // Inflate the activity's actual content
        val content = LayoutInflater.from(this).inflate(layoutResId, drawerLayout, false)
        drawerLayout.addView(content)

        // Inflate the nav drawer panel
        addNavDrawerPanel(drawerLayout)

        setContentView(drawerLayout)
    }

    /**
     * Use this when the activity's XML already contains a DrawerLayout.
     * Adds the nav drawer panel to the existing drawer.
     */
    protected fun initExistingDrawer(existingDrawerLayout: DrawerLayout) {
        drawerLayout = existingDrawerLayout

        // Check if the drawer already has a nav panel (e.g. from XML)
        // If not, add one programmatically
        val existingNavPanel = findNavPanel(drawerLayout)
        if (existingNavPanel != null) {
            navView = existingNavPanel
        } else {
            addNavDrawerPanel(drawerLayout)
        }
    }

    private fun findNavPanel(drawer: DrawerLayout): View? {
        for (i in 0 until drawer.childCount) {
            val child = drawer.getChildAt(i)
            val lp = child.layoutParams as? DrawerLayout.LayoutParams
            if (lp != null && lp.gravity == GravityCompat.START) {
                return child
            }
        }
        return null
    }

    private fun addNavDrawerPanel(drawer: DrawerLayout) {
        // Use 300dp or 80% of screen, whichever is smaller
        val density = resources.displayMetrics.density
        val drawerWidth = (300 * density).toInt()

        val navFrame = FrameLayout(this).apply {
            layoutParams = DrawerLayout.LayoutParams(
                drawerWidth.coerceAtMost(
                    (resources.displayMetrics.widthPixels * 0.8).toInt()
                ),
                ViewGroup.LayoutParams.MATCH_PARENT
            ).apply {
                gravity = GravityCompat.START
            }
            setBackgroundColor(resources.getColor(R.color.white, theme))
            fitsSystemWindows = true
        }
        LayoutInflater.from(this).inflate(R.layout.nav_drawer_content, navFrame, true)
        drawer.addView(navFrame)
        navView = navFrame
    }

    /**
     * Call this in onCreate after setContentViewWithDrawer()/initExistingDrawer()
     * and after injecting dependencies.
     * Wires up all nav drawer click handlers.
     */
    protected fun setupDrawerNavigation() {
        val nav = navView ?: return

        // Show AI import status banner if import is running or just completed
        setupAiImportBanner(nav)

        // Show/hide kitchen orders based on restaurant mode
        nav.findViewById<View>(R.id.nav_kitchen_orders)?.visibility =
            if (prefsManager.isRestaurant) View.VISIBLE else View.GONE

        // Highlight current screen
        val highlightId = getDrawerHighlightId()
        if (highlightId != 0) {
            // Reset the default POS highlight to non-highlighted style
            nav.findViewById<View>(R.id.nav_pos)?.setBackgroundResource(R.drawable.stroke_btn)
            // Also reset text/icon colors on POS item
            val posLayout = nav.findViewById<LinearLayout>(R.id.nav_pos)
            if (posLayout != null) {
                for (i in 0 until posLayout.childCount) {
                    when (val child = posLayout.getChildAt(i)) {
                        is TextView -> child.setTextColor(resources.getColor(R.color.black, theme))
                        is ImageView -> child.setColorFilter(resources.getColor(R.color.black, theme))
                    }
                }
            }

            // Highlight the current item
            nav.findViewById<View>(highlightId)?.setBackgroundResource(R.drawable.btn_rounded)
            val highlightLayout = nav.findViewById<LinearLayout>(highlightId)
            if (highlightLayout != null) {
                for (i in 0 until highlightLayout.childCount) {
                    when (val child = highlightLayout.getChildAt(i)) {
                        is TextView -> child.setTextColor(resources.getColor(R.color.white, theme))
                        is ImageView -> child.setColorFilter(resources.getColor(R.color.white, theme))
                    }
                }
            }
        }

        // Wire up click handlers
        fun navClick(id: Int, action: () -> Unit) {
            nav.findViewById<View>(id)?.setOnClickListener {
                drawerLayout.closeDrawer(GravityCompat.START)
                action()
            }
        }

        navClick(R.id.nav_home) {
            val intent = Intent(this, HomeActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            startActivity(intent)
            finish()
        }
        navClick(R.id.nav_pos) {
            val intent = Intent(this, ProductActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            startActivity(intent)
            if (this !is ProductActivity) finish()
        }
        navClick(R.id.nav_orders) {
            if (this !is OrdersActivity) {
                startActivity(Intent(this, OrdersActivity::class.java))
            }
        }
        navClick(R.id.nav_hold_orders) {
            if (this !is HoldOrderActivity) {
                startActivity(Intent(this, HoldOrderActivity::class.java))
            }
        }
        navClick(R.id.nav_kitchen_orders) {
            if (this !is KitchenOrdersActivity) {
                startActivity(Intent(this, KitchenOrdersActivity::class.java))
            }
        }
        navClick(R.id.nav_close_till) {
            val intent = Intent(this, ProductActivity::class.java)
            intent.putExtra("ACTION_CLOSE_TILL", true)
            intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            startActivity(intent)
        }
        navClick(R.id.nav_admin_settings) {
            if (this !is AdminSettingsActivity) {
                startActivity(Intent(this, AdminSettingsActivity::class.java))
            }
        }
        navClick(R.id.nav_settings) {
            if (this !is SettingsActivity) {
                startActivity(Intent(this, SettingsActivity::class.java))
            }
        }
        navClick(R.id.nav_cloud_sync) {
            // Trigger an immediate cloud sync
            CloudSyncWorker.syncNow(this)
            Toast.makeText(this, "Cloud sync started", Toast.LENGTH_SHORT).show()
        }
        navClick(R.id.nav_get_update) {
            Toast.makeText(this, "Syncing data...", Toast.LENGTH_SHORT).show()
        }

        // Set up live sync status observer
        setupSyncStatusObserver(nav)
        navClick(R.id.nav_about) {
            if (this !is AboutActivity) {
                startActivity(Intent(this, AboutActivity::class.java))
            }
        }
        navClick(R.id.nav_help) {
            if (this !is HelpActivity) {
                startActivity(Intent(this, HelpActivity::class.java))
            }
        }
        navClick(R.id.nav_logout) {
            val intent = Intent(this, SelectUserLoginActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            startActivity(intent)
            finish()
        }
    }

    /**
     * Helper: add a hamburger menu icon to any LinearLayout header.
     * Replaces the first child (back button) or inserts at position 0.
     */
    protected fun addMenuIconToHeader(header: LinearLayout) {
        val density = resources.displayMetrics.density
        val iconSize = (40 * density).toInt()
        val menuIcon = ImageView(this).apply {
            layoutParams = LinearLayout.LayoutParams(iconSize, iconSize).apply {
                marginEnd = 8
            }
            setPadding(8, 8, 8, 8)
            setImageResource(R.drawable.ic_drawer)
            setBackgroundResource(resolveSelectableItemBackground())
            contentDescription = "Open menu"
            setOnClickListener {
                drawerLayout.openDrawer(GravityCompat.START)
            }
        }
        header.addView(menuIcon, 0)
    }

    /**
     * Replace an existing back button ImageView with a hamburger menu icon.
     */
    protected fun replaceBackWithMenuIcon(backButton: ImageView) {
        backButton.setImageResource(R.drawable.ic_drawer)
        backButton.contentDescription = "Open menu"
        backButton.setOnClickListener {
            drawerLayout.openDrawer(GravityCompat.START)
        }
    }

    /**
     * Set up a view as the back button (finish activity on click).
     */
    protected fun setupBackButton(backButton: View) {
        backButton.setOnClickListener { finish() }
    }

    private fun resolveSelectableItemBackground(): Int {
        val a = obtainStyledAttributes(intArrayOf(android.R.attr.selectableItemBackgroundBorderless))
        val resId = a.getResourceId(0, 0)
        a.recycle()
        return resId
    }

    /**
     * Open the nav drawer programmatically.
     */
    protected fun openDrawer() {
        if (::drawerLayout.isInitialized) {
            drawerLayout.openDrawer(GravityCompat.START)
        }
    }

    @Inject lateinit var accountRegistry: LocalAccountRegistry

    /**
     * Observe SyncStatusManager and update the nav drawer sync UI in real time.
     */
    private fun setupSyncStatusObserver(nav: View) {
        val syncStatus = nav.findViewById<TextView>(R.id.nav_sync_status) ?: return
        val syncSpinner = nav.findViewById<ProgressBar>(R.id.nav_sync_spinner)
        val syncProgressContainer = nav.findViewById<View>(R.id.nav_sync_progress_container)
        val syncProgressText = nav.findViewById<TextView>(R.id.nav_sync_progress_text)
        val syncProgressBar = nav.findViewById<ProgressBar>(R.id.nav_sync_progress_bar)
        val syncLabel = nav.findViewById<TextView>(R.id.nav_sync_label)

        // Initialize with last sync time from prefs
        val lastSyncStr = prefsManager.getString("cloud_last_sync_at", "")
        if (lastSyncStr.isNotBlank() && lastSyncStr != "1970-01-01T00:00:00.000Z") {
            try {
                val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
                sdf.timeZone = java.util.TimeZone.getTimeZone("UTC")
                val date = sdf.parse(lastSyncStr)
                if (date != null) {
                    SyncStatusManager.setLastSyncTime(date.time)
                    syncStatus.text = formatLastSyncTime(date.time)
                }
            } catch (_: Exception) {}
        }

        lifecycleScope.launch {
            SyncStatusManager.status.collect { status ->
                when (status.state) {
                    SyncStatusManager.SyncState.IDLE -> {
                        syncSpinner?.visibility = View.GONE
                        syncProgressContainer?.visibility = View.GONE
                        syncLabel?.text = "Cloud Sync"
                        syncLabel?.setTextColor(resources.getColor(R.color.black, theme))
                        if (status.lastSyncTime > 0) {
                            syncStatus.text = formatLastSyncTime(status.lastSyncTime)
                            syncStatus.setTextColor(0xFF999999.toInt())
                        } else {
                            syncStatus.text = "Never synced \u2014 tap to sync"
                            syncStatus.setTextColor(0xFF999999.toInt())
                        }
                    }

                    SyncStatusManager.SyncState.ERROR -> {
                        syncSpinner?.visibility = View.GONE
                        syncProgressContainer?.visibility = View.VISIBLE
                        syncLabel?.text = "Cloud Sync"
                        syncStatus.text = "Sync failed \u2014 tap to retry"
                        syncStatus.setTextColor(0xFFE53935.toInt())
                        syncProgressText?.text = status.errorMessage ?: "Unknown error"
                        syncProgressText?.setTextColor(0xFFE53935.toInt())
                        syncProgressBar?.visibility = View.GONE
                    }

                    SyncStatusManager.SyncState.COMPLETE -> {
                        syncSpinner?.visibility = View.GONE
                        syncLabel?.text = "Cloud Sync"
                        syncLabel?.setTextColor(resources.getColor(R.color.black, theme))

                        val summary = status.summary
                        if (summary != null && (summary.totalPushed > 0 || summary.totalPulled > 0)) {
                            syncProgressContainer?.visibility = View.VISIBLE
                            syncProgressText?.text = summary.toDisplayString()
                            syncProgressText?.setTextColor(0xFF2E7D32.toInt())
                            syncProgressBar?.visibility = View.GONE
                        } else {
                            syncProgressContainer?.visibility = View.GONE
                        }

                        if (status.lastSyncTime > 0) {
                            syncStatus.text = formatLastSyncTime(status.lastSyncTime)
                            syncStatus.setTextColor(0xFF999999.toInt())
                        }

                        // Auto-dismiss the summary after 10 seconds
                        Handler(Looper.getMainLooper()).postDelayed({
                            if (SyncStatusManager.status.value.state == SyncStatusManager.SyncState.COMPLETE) {
                                SyncStatusManager.idle(status.lastSyncTime)
                            }
                        }, 10_000)
                    }

                    else -> {
                        // Syncing in progress
                        syncSpinner?.visibility = View.VISIBLE
                        syncLabel?.text = "Syncing..."
                        syncLabel?.setTextColor(0xFF1565C0.toInt())
                        syncStatus.text = status.message
                        syncStatus.setTextColor(0xFF1565C0.toInt())

                        if (status.progressDetail.isNotBlank()) {
                            syncProgressContainer?.visibility = View.VISIBLE
                            syncProgressText?.text = status.progressDetail
                            syncProgressText?.setTextColor(0xFF1565C0.toInt())
                            syncProgressBar?.visibility = View.VISIBLE
                            if (status.progressPercent >= 0) {
                                syncProgressBar?.isIndeterminate = false
                                syncProgressBar?.progress = status.progressPercent
                            } else {
                                syncProgressBar?.isIndeterminate = true
                            }
                        } else {
                            syncProgressContainer?.visibility = View.GONE
                        }
                    }
                }
            }
        }
    }

    /**
     * Formats a timestamp to a human-readable "last synced" string.
     * - Less than 1 min: "Just now"
     * - Less than 60 min: "5 min ago"
     * - Less than 24h: "2 hours ago"
     * - Otherwise: "Mar 16, 2:30 PM"
     */
    private fun formatLastSyncTime(timeMillis: Long): String {
        val now = System.currentTimeMillis()
        val diffMs = now - timeMillis
        val diffMin = diffMs / 60_000
        val diffHours = diffMs / 3_600_000

        return when {
            diffMin < 1 -> "Synced just now"
            diffMin < 60 -> "Synced ${diffMin}m ago"
            diffHours < 24 -> "Synced ${diffHours}h ago"
            else -> {
                val sdf = SimpleDateFormat("MMM d, h:mm a", Locale.getDefault())
                "Synced ${sdf.format(Date(timeMillis))}"
            }
        }
    }

    /**
     * Shows an AI import status banner at the top of the nav drawer.
     * - While importing: detailed live status (phase, product count, image progress)
     * - When done: "Store is ready! Tap to switch" with summary stats
     * - When interrupted: "Resume" button to restart the import
     */
    private fun setupAiImportBanner(nav: View) {
        val importRunning = prefsManager.getString(AiImportService.PREF_IMPORT_RUNNING) == "true"
        val completedAccountId = prefsManager.getString(AiImportService.PREF_IMPORT_ACCOUNT_ID)
        val importStoreName = prefsManager.getString(AiImportService.PREF_IMPORT_STORE_NAME)
        val canResume = AiImportService.hasResumableImport(prefsManager)

        if (!importRunning && completedAccountId.isBlank() && !canResume) return

        val density = resources.displayMetrics.density

        // Find the main LinearLayout inside the ScrollView
        val scrollView = nav.findViewById<android.widget.ScrollView>(android.R.id.content)
            ?: (nav as? ViewGroup)?.getChildAt(0) as? android.widget.ScrollView
            ?: (nav as? FrameLayout)?.getChildAt(0) as? android.widget.ScrollView
        val mainLayout = scrollView?.getChildAt(0) as? LinearLayout ?: return

        // Remove any existing banner (tagged)
        for (i in mainLayout.childCount - 1 downTo 0) {
            val child = mainLayout.getChildAt(i)
            if (child.tag == "ai_import_banner") {
                mainLayout.removeViewAt(i)
            }
        }

        val banner = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            tag = "ai_import_banner"
            setPadding((12 * density).toInt(), (10 * density).toInt(), (12 * density).toInt(), (10 * density).toInt())
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                bottomMargin = (8 * density).toInt()
            }
        }

        if (importRunning) {
            // ── In progress — show detailed status ──
            banner.setBackgroundColor(0xFFFFF3E0.toInt()) // light orange

            val row = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = android.view.Gravity.CENTER_VERTICAL
            }

            val spinner = ProgressBar(this, null, android.R.attr.progressBarStyleSmall).apply {
                layoutParams = LinearLayout.LayoutParams(
                    (20 * density).toInt(), (20 * density).toInt()
                ).apply { marginEnd = (8 * density).toInt() }
            }
            row.addView(spinner)

            val label = TextView(this).apply {
                text = "Creating ${importStoreName.ifBlank { "your store" }}..."
                textSize = 13f
                setTextColor(0xFFE65100.toInt())
                setTypeface(null, Typeface.BOLD)
            }
            row.addView(label)

            banner.addView(row)

            // Detailed status line (reads PREF_IMPORT_STATUS)
            val importStatus = prefsManager.getString(AiImportService.PREF_IMPORT_STATUS)
            val statusText = TextView(this).apply {
                text = importStatus.ifBlank { "Starting up..." }
                textSize = 12f
                setTextColor(0xFF795548.toInt())
                setPadding(0, (4 * density).toInt(), 0, 0)
            }
            banner.addView(statusText)

            // Stats line (reads PREF_IMPORT_STATS)
            val importStats = prefsManager.getString(AiImportService.PREF_IMPORT_STATS)
            if (importStats.isNotBlank()) {
                val statsText = TextView(this).apply {
                    text = importStats
                    textSize = 11f
                    setTextColor(0xFF999999.toInt())
                    setPadding(0, (2 * density).toInt(), 0, 0)
                }
                banner.addView(statsText)
            }

            // Cancel/Dismiss button — allows user to stop a stuck import
            val cancelBtn = TextView(this).apply {
                text = "Cancel"
                textSize = 12f
                setTextColor(0xFFD32F2F.toInt())
                setTypeface(null, Typeface.BOLD)
                setPadding((4 * density).toInt(), (8 * density).toInt(), (4 * density).toInt(), (4 * density).toInt())
                setOnClickListener {
                    AlertDialog.Builder(this@BaseDrawerActivity)
                        .setTitle("Cancel Import?")
                        .setMessage("This will stop the import for ${importStoreName.ifBlank { "this store" }}. You can restart it later from Settings.")
                        .setPositiveButton("Cancel Import") { _, _ ->
                            // Clear all AI import state
                            prefsManager.setString(AiImportService.PREF_IMPORT_RUNNING, "")
                            prefsManager.setString(AiImportService.PREF_IMPORT_STATUS, "")
                            prefsManager.setString(AiImportService.PREF_IMPORT_STATS, "")
                            prefsManager.setString(AiImportService.PREF_IMPORT_PHASE, "")
                            prefsManager.setString(AiImportService.PREF_IMPORT_STORE_NAME, "")
                            prefsManager.setString(AiImportService.PREF_IMPORT_ACCOUNT_ID, "")
                            // Keep resume data so they can restart later if they want
                            // Refresh the banner
                            setupAiImportBanner(nav)
                            Toast.makeText(this@BaseDrawerActivity, "Import cancelled", Toast.LENGTH_SHORT).show()
                        }
                        .setNegativeButton("Keep Waiting", null)
                        .show()
                }
            }
            banner.addView(cancelBtn)

            // Poll for updates every 3 seconds
            val handler = Handler(Looper.getMainLooper())
            val pollRunnable = object : Runnable {
                override fun run() {
                    val stillRunning = prefsManager.getString(AiImportService.PREF_IMPORT_RUNNING) == "true"
                    if (!stillRunning) {
                        // Refresh the whole banner to show ready/resume state
                        setupAiImportBanner(nav)
                    } else {
                        // Update status and stats text live
                        val newStatus = prefsManager.getString(AiImportService.PREF_IMPORT_STATUS)
                        val newStats = prefsManager.getString(AiImportService.PREF_IMPORT_STATS)
                        if (newStatus.isNotBlank()) statusText.text = newStatus
                        if (newStats.isNotBlank()) {
                            if (banner.childCount > 2 && banner.getChildAt(2) is TextView) {
                                (banner.getChildAt(2) as TextView).text = newStats
                            }
                        }
                        handler.postDelayed(this, 3000)
                    }
                }
            }
            handler.postDelayed(pollRunnable, 3000)

        } else if (completedAccountId.isNotBlank()) {
            // ── Completed — show "Ready to switch" with summary ──
            banner.setBackgroundColor(0xFFE8F5E9.toInt()) // light green

            val label = TextView(this).apply {
                text = "${importStoreName.ifBlank { "Your store" }} is ready!"
                textSize = 14f
                setTextColor(0xFF2E7D32.toInt())
                setTypeface(null, Typeface.BOLD)
            }
            banner.addView(label)

            // Show final stats summary
            val finalStats = prefsManager.getString(AiImportService.PREF_IMPORT_STATS)
            if (finalStats.isNotBlank()) {
                val statsLabel = TextView(this).apply {
                    text = finalStats
                    textSize = 12f
                    setTextColor(0xFF388E3C.toInt())
                    setPadding(0, (2 * density).toInt(), 0, 0)
                }
                banner.addView(statsLabel)
            }

            val switchBtn = TextView(this).apply {
                text = "Tap here to switch \u2192"
                textSize = 13f
                setTextColor(0xFF1565C0.toInt())
                setPadding(0, (4 * density).toInt(), 0, 0)
            }
            banner.addView(switchBtn)

            banner.setOnClickListener {
                // Switch to the imported account
                prefsManager.setAccountIdSync(completedAccountId)
                prefsManager.setStoreNameSync(importStoreName)
                // Clear the completion signal
                prefsManager.setString(AiImportService.PREF_IMPORT_ACCOUNT_ID, "")
                prefsManager.setString(AiImportService.PREF_IMPORT_STORE_NAME, "")
                prefsManager.setString(AiImportService.PREF_IMPORT_STATS, "")
                // Restart app with new account
                AppDatabase.resetInstance()
                val restartIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
                }
                startActivity(restartIntent)
                finish()
                Runtime.getRuntime().exit(0)
            }

        } else if (canResume) {
            // ── Interrupted — show resume button ──
            banner.setBackgroundColor(0xFFFCE4EC.toInt()) // light red/pink

            val resumeName = prefsManager.getString(AiImportService.PREF_RESUME_NAME)

            val label = TextView(this).apply {
                text = "Import interrupted"
                textSize = 14f
                setTextColor(0xFFC62828.toInt())
                setTypeface(null, Typeface.BOLD)
            }
            banner.addView(label)

            val detail = TextView(this).apply {
                text = "${resumeName.ifBlank { "Store" }} setup was interrupted"
                textSize = 12f
                setTextColor(0xFF999999.toInt())
                setPadding(0, (2 * density).toInt(), 0, 0)
            }
            banner.addView(detail)

            val resumeBtn = TextView(this).apply {
                text = "Tap to resume \u2192"
                textSize = 13f
                setTextColor(0xFF1565C0.toInt())
                setTypeface(null, Typeface.BOLD)
                setPadding(0, (6 * density).toInt(), 0, 0)
            }
            banner.addView(resumeBtn)

            banner.setOnClickListener {
                AiImportService.resume(this, prefsManager)
                // Refresh banner to show "in progress" state after a moment
                Handler(Looper.getMainLooper()).postDelayed({
                    setupAiImportBanner(nav)
                }, 1000)
            }
        }

        // Insert banner right after the logo divider (position 2: logo=0, divider=1, banner=2)
        mainLayout.addView(banner, 2.coerceAtMost(mainLayout.childCount))
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::drawerLayout.isInitialized && drawerLayout.isDrawerOpen(GravityCompat.START)) {
            drawerLayout.closeDrawer(GravityCompat.START)
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }
}
