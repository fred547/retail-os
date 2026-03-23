package com.posterita.pos.android.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import com.posterita.pos.android.R
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.*
import com.posterita.pos.android.util.LocalAccountRegistry
import com.posterita.pos.android.util.SharedPreferencesManager
import com.posterita.pos.android.util.WebsiteSetupService
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.*
import javax.inject.Inject

/**
 * Foreground Service that runs the AI product import pipeline in the background.
 *
 * - Survives activity navigation, logout, minimize
 * - Saves progress to SharedPreferences so the nav drawer banner can show live details
 * - Stores resume data so interrupted imports can be restarted
 * - Optimized: skips unnecessary phases, minimizes Claude API calls
 */
@AndroidEntryPoint
class AiImportService : Service() {

    companion object {
        private const val TAG = "AiImportService"
        const val CHANNEL_ID = "ai_import_channel"
        const val CHANNEL_DONE_ID = "ai_import_done_channel"
        private const val NOTIFICATION_ID = 9001
        private const val DONE_NOTIFICATION_ID = 9002
        private const val MIN_PRODUCTS_THRESHOLD = 5

        const val EXTRA_URLS = "extra_urls"
        const val EXTRA_BUSINESS_NAME = "extra_business_name"
        const val EXTRA_BUSINESS_LOCATION = "extra_business_location"
        const val EXTRA_BUSINESS_TYPE = "extra_business_type"
        const val EXTRA_ACCOUNT_ID = "extra_account_id"
        const val EXTRA_OWNER_EMAIL = "extra_owner_email"
        const val EXTRA_OWNER_PHONE = "extra_owner_phone"
        const val EXTRA_ACCOUNT_TYPE = "extra_account_type"

        // ── SharedPreferences keys for progress tracking ──
        const val PREF_IMPORT_RUNNING = "ai_import_running"
        const val PREF_IMPORT_ACCOUNT_ID = "ai_import_account_id"
        const val PREF_IMPORT_STORE_NAME = "ai_import_store_name"
        /** Detailed status line visible in the nav drawer banner */
        const val PREF_IMPORT_STATUS = "ai_import_status"
        /** Phase number (1-5) for progress indication */
        const val PREF_IMPORT_PHASE = "ai_import_phase"
        /** Summary stats: "3 stores, 25 products, 12 images" */
        const val PREF_IMPORT_STATS = "ai_import_stats"

        // ── Resume data — saved so import can be restarted if killed ──
        const val PREF_RESUME_URLS = "ai_import_resume_urls"
        const val PREF_RESUME_NAME = "ai_import_resume_name"
        const val PREF_RESUME_LOCATION = "ai_import_resume_location"
        const val PREF_RESUME_TYPE = "ai_import_resume_type"
        const val PREF_RESUME_ACCOUNT_ID = "ai_import_resume_account_id"
        const val PREF_RESUME_OWNER_EMAIL = "ai_import_resume_owner_email"
        const val PREF_RESUME_OWNER_PHONE = "ai_import_resume_owner_phone"
        const val PREF_RESUME_ACCOUNT_TYPE = "ai_import_resume_account_type"
        const val PREF_IMPORT_TARGET_ACCOUNT_ID = "ai_import_target_account_id"
        const val PREF_PENDING_START = "ai_import_pending_start"

        fun start(
            context: Context,
            urls: List<String>,
            businessName: String,
            businessLocation: String,
            businessType: String,
            accountId: String = "",
            ownerEmail: String = "",
            ownerPhone: String = "",
            accountType: String = "demo"
        ) {
            val intent = Intent(context, AiImportService::class.java).apply {
                putStringArrayListExtra(EXTRA_URLS, ArrayList(urls))
                putExtra(EXTRA_BUSINESS_NAME, businessName)
                putExtra(EXTRA_BUSINESS_LOCATION, businessLocation)
                putExtra(EXTRA_BUSINESS_TYPE, businessType)
                putExtra(EXTRA_ACCOUNT_ID, accountId)
                putExtra(EXTRA_OWNER_EMAIL, ownerEmail)
                putExtra(EXTRA_OWNER_PHONE, ownerPhone)
                putExtra(EXTRA_ACCOUNT_TYPE, accountType)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun queueStart(
            prefs: SharedPreferencesManager,
            urls: List<String>,
            businessName: String,
            businessLocation: String,
            businessType: String,
            accountId: String,
            ownerEmail: String,
            ownerPhone: String,
            accountType: String
        ) {
            prefs.setStringSync(PREF_PENDING_START, "true")
            prefs.setStringSync(PREF_RESUME_URLS, urls.joinToString("|||"))
            prefs.setStringSync(PREF_RESUME_NAME, businessName)
            prefs.setStringSync(PREF_RESUME_LOCATION, businessLocation)
            prefs.setStringSync(PREF_RESUME_TYPE, businessType)
            prefs.setStringSync(PREF_RESUME_ACCOUNT_ID, accountId)
            prefs.setStringSync(PREF_RESUME_OWNER_EMAIL, ownerEmail)
            prefs.setStringSync(PREF_RESUME_OWNER_PHONE, ownerPhone)
            prefs.setStringSync(PREF_RESUME_ACCOUNT_TYPE, accountType)
            prefs.setStringSync(PREF_IMPORT_TARGET_ACCOUNT_ID, accountId)
        }

        fun startPendingIfNeeded(context: Context, prefs: SharedPreferencesManager) {
            if (prefs.getString(PREF_PENDING_START) != "true") return
            if (prefs.getString(PREF_IMPORT_RUNNING) == "true") {
                prefs.setString(PREF_PENDING_START, "")
                return
            }

            // Need at least a business name — URLs are optional (AI will search by name)
            val businessName = prefs.getString(PREF_RESUME_NAME)
            if (businessName.isBlank()) {
                prefs.setString(PREF_PENDING_START, "")
                return
            }

            val urls = prefs.getString(PREF_RESUME_URLS)
                .split("|||")
                .filter { it.isNotBlank() }

            prefs.setString(PREF_PENDING_START, "")
            start(
                context,
                urls,
                businessName,
                prefs.getString(PREF_RESUME_LOCATION),
                prefs.getString(PREF_RESUME_TYPE),
                prefs.getString(PREF_RESUME_ACCOUNT_ID),
                prefs.getString(PREF_RESUME_OWNER_EMAIL),
                prefs.getString(PREF_RESUME_OWNER_PHONE),
                prefs.getString(PREF_RESUME_ACCOUNT_TYPE, "demo")
            )
        }

        /** Check if there's a failed/interrupted import that can be resumed */
        fun hasResumableImport(prefs: SharedPreferencesManager): Boolean {
            return prefs.getString(PREF_RESUME_NAME).isNotBlank() &&
                   prefs.getString(PREF_IMPORT_RUNNING) != "true" &&
                   prefs.getString(PREF_IMPORT_ACCOUNT_ID).isBlank()
        }

        /** Resume a previously interrupted import */
        fun resume(context: Context, prefs: SharedPreferencesManager) {
            val businessName = prefs.getString(PREF_RESUME_NAME)
            if (businessName.isBlank()) return
            val urls = prefs.getString(PREF_RESUME_URLS).split("|||").filter { it.isNotBlank() }
            start(
                context, urls,
                businessName,
                prefs.getString(PREF_RESUME_LOCATION),
                prefs.getString(PREF_RESUME_TYPE),
                prefs.getString(PREF_RESUME_ACCOUNT_ID),
                prefs.getString(PREF_RESUME_OWNER_EMAIL),
                prefs.getString(PREF_RESUME_OWNER_PHONE),
                prefs.getString(PREF_RESUME_ACCOUNT_TYPE, "demo")
            )
        }
    }

    @Inject lateinit var websiteSetupService: WebsiteSetupService
    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var accountRegistry: LocalAccountRegistry

    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent == null) { stopSelf(); return START_NOT_STICKY }
        val urls = intent.getStringArrayListExtra(EXTRA_URLS) ?: arrayListOf()
        val businessName = intent.getStringExtra(EXTRA_BUSINESS_NAME) ?: ""
        val businessLocation = intent.getStringExtra(EXTRA_BUSINESS_LOCATION) ?: ""
        val businessType = intent.getStringExtra(EXTRA_BUSINESS_TYPE) ?: "retail"
        val targetAccountId = intent.getStringExtra(EXTRA_ACCOUNT_ID)
            ?: prefsManager.getString(PREF_RESUME_ACCOUNT_ID)
        val ownerEmail = intent.getStringExtra(EXTRA_OWNER_EMAIL)
            ?: prefsManager.getString(PREF_RESUME_OWNER_EMAIL)
        val ownerPhone = intent.getStringExtra(EXTRA_OWNER_PHONE)
            ?: prefsManager.getString(PREF_RESUME_OWNER_PHONE)
        val accountType = intent.getStringExtra(EXTRA_ACCOUNT_TYPE)
            ?: prefsManager.getString(PREF_RESUME_ACCOUNT_TYPE, "demo")

        startForeground(NOTIFICATION_ID, buildProgressNotification("Starting AI import...", 0, 5))
        prefsManager.setString(PREF_IMPORT_RUNNING, "true")
        prefsManager.setString(PREF_PENDING_START, "")
        prefsManager.setString(PREF_IMPORT_STORE_NAME, businessName)
        prefsManager.setString(PREF_IMPORT_STATUS, "Starting...")
        prefsManager.setString(PREF_IMPORT_PHASE, "1")
        prefsManager.setString(PREF_IMPORT_STATS, "")

        // Save resume data
        prefsManager.setString(PREF_RESUME_URLS, urls.joinToString("|||"))
        prefsManager.setString(PREF_RESUME_NAME, businessName)
        prefsManager.setString(PREF_RESUME_LOCATION, businessLocation)
        prefsManager.setString(PREF_RESUME_TYPE, businessType)
        prefsManager.setString(PREF_RESUME_ACCOUNT_ID, targetAccountId)
        prefsManager.setString(PREF_RESUME_OWNER_EMAIL, ownerEmail)
        prefsManager.setString(PREF_RESUME_OWNER_PHONE, ownerPhone)
        prefsManager.setString(PREF_RESUME_ACCOUNT_TYPE, accountType)
        prefsManager.setString(PREF_IMPORT_TARGET_ACCOUNT_ID, targetAccountId)

        if (targetAccountId.isNotBlank()) {
            accountRegistry.addAccount(
                id = targetAccountId,
                name = businessName.ifBlank { "New Account" },
                storeName = businessName.ifBlank { "New Account" },
                ownerEmail = ownerEmail,
                ownerPhone = ownerPhone,
                type = accountType,
                status = "in_progress"
            )
        }

        // Wire up live status from WebsiteSetupService → SharedPreferences → nav banner
        websiteSetupService.statusListener = { msg ->
            prefsManager.setString(PREF_IMPORT_STATUS, msg)
            Log.d(TAG, "  ↳ $msg")
        }

        serviceScope.launch {
            try {
                runImportPipeline(
                    urls = urls,
                    businessName = businessName,
                    businessLocation = businessLocation,
                    businessType = businessType,
                    targetAccountId = targetAccountId,
                    ownerEmail = ownerEmail,
                    ownerPhone = ownerPhone,
                    accountType = accountType
                )
                // Success — clear resume data
                clearResumeData()
            } catch (e: Exception) {
                Log.e(TAG, "Import pipeline failed", e)
                val errorMsg = e.message ?: "Unknown error"
                setStatus("Failed: $errorMsg", 0)
                prefsManager.setString("ai_import_error", errorMsg)
                if (targetAccountId.isNotBlank()) {
                    accountRegistry.updateStatus(targetAccountId, "failed")
                }
                // Show specific error in notification
                val notifMsg = when {
                    errorMsg.contains("credit balance", ignoreCase = true) ->
                        "AI Import failed: API credits exhausted. Contact support."
                    errorMsg.contains("rate limit", ignoreCase = true) ->
                        "AI Import failed: Rate limited. Will retry automatically."
                    errorMsg.contains("timed out", ignoreCase = true) ->
                        "AI Import timed out. Tap to retry."
                    else -> "AI Import failed: $errorMsg"
                }
                updateNotification(notifMsg, 0, 5)
                showDoneNotification(notifMsg, false)
                // Keep resume data so user can retry
                delay(3000)
            } finally {
                prefsManager.setString(PREF_IMPORT_RUNNING, "")
                stopSelf()
            }
        }

        return START_NOT_STICKY
    }

    override fun onDestroy() {
        websiteSetupService.statusListener = null
        serviceScope.cancel()
        super.onDestroy()
    }

    private fun clearResumeData() {
        prefsManager.setString(PREF_RESUME_URLS, "")
        prefsManager.setString(PREF_RESUME_NAME, "")
        prefsManager.setString(PREF_RESUME_LOCATION, "")
        prefsManager.setString(PREF_RESUME_TYPE, "")
        prefsManager.setString(PREF_RESUME_ACCOUNT_ID, "")
        prefsManager.setString(PREF_RESUME_OWNER_EMAIL, "")
        prefsManager.setString(PREF_RESUME_OWNER_PHONE, "")
        prefsManager.setString(PREF_RESUME_ACCOUNT_TYPE, "")
    }

    // ─── Import Pipeline ─────────────────────────────────────

    private suspend fun runImportPipeline(
        urls: List<String>,
        businessName: String,
        businessLocation: String,
        businessType: String,
        targetAccountId: String,
        ownerEmail: String,
        ownerPhone: String,
        accountType: String
    ) {
        val data = tryCloudImport(urls, businessName, businessLocation, businessType)
            ?: runLegacyImportPipeline(urls, businessName, businessLocation, businessType)

        if (data == null) {
            Log.e(TAG, "AI import produced no data for $businessName")
            showDoneNotification("Import couldn't find products for $businessName. Tap to retry.", false)
            return
        }

        // ── Phase 5: Save to database ──
        val totalProducts = data.categories.sumOf { it.products.size }
        val totalImages = data.categories.sumOf { cat ->
            cat.products.count { !it.imageUrl.isNullOrBlank() && it.imageUrl != "" }
        }
        val totalStores = data.stores.size.coerceAtLeast(1)
        val totalCategories = data.categories.size

        setStatus("Saving $totalProducts products to database...", 5)
        updateNotification("Saving your store...", 3, 3)

        val accountId = saveImportToDatabase(
            data = data,
            businessName = businessName,
            targetAccountId = targetAccountId,
            ownerEmail = ownerEmail,
            ownerPhone = ownerPhone,
            accountType = accountType
        )

        // Signal completion
        prefsManager.setString(PREF_IMPORT_ACCOUNT_ID, accountId)
        prefsManager.setString(PREF_IMPORT_STORE_NAME, data.storeName.orEmpty().ifBlank { businessName })

        val summary = buildString {
            append("$totalStores store${if (totalStores > 1) "s" else ""}, ")
            append("$totalProducts products in $totalCategories categories")
            if (totalImages > 0) append(", $totalImages with images")
        }
        prefsManager.setString(PREF_IMPORT_STATS, summary)
        setStatus("Complete! $summary", 5)

        showDoneNotification(
            "${data.storeName.orEmpty().ifBlank { businessName }} is ready! $summary",
            true
        )
    }

    private suspend fun tryCloudImport(
        urls: List<String>,
        businessName: String,
        businessLocation: String,
        businessType: String
    ): WebsiteSetupService.StoreSetupResult? {
        setStatus("Posterita AI is analyzing your business online...", 1)
        updateNotification("Phase 1/3 — Analyzing sources...", 1, 3)

        val result = websiteSetupService.analyzeBusinessWithServer(
            urls = urls,
            businessName = businessName,
            location = businessLocation,
            businessType = businessType
        )

        val setupData = result.getOrNull()
        if (setupData != null) {
            val productCount = setupData.categories.sumOf { it.products.size }
            val storeCount = setupData.stores.size.coerceAtLeast(1)
            updateStats(setupData)
            setStatus(
                "Found $productCount products" +
                    (if (storeCount > 1) " across $storeCount locations" else "") +
                    " with server-side images",
                2
            )
            updateNotification("Phase 2/3 — Products ready to save...", 2, 3)
            return setupData
        }

        Log.w(TAG, "Cloud AI import unavailable, falling back to on-device import", result.exceptionOrNull())
        setStatus("Cloud AI unavailable, falling back to on-device import...", 1)
        updateNotification("Cloud AI unavailable — using device fallback...", 1, 3)
        return null
    }

    private suspend fun runLegacyImportPipeline(
        urls: List<String>,
        businessName: String,
        businessLocation: String,
        businessType: String
    ): WebsiteSetupService.StoreSetupResult? {
        // ── Phase 1: Scrape sources (Claude API call) ──
        setStatus("Analyzing ${urls.size} source${if (urls.size > 1) "s" else ""}...", 1)
        updateNotification("Fallback 1/4 — Analyzing sources...", 1, 4)

        var result = if (urls.size == 1) {
            websiteSetupService.analyzeWebsite(urls.first())
        } else {
            websiteSetupService.analyzeMultipleSources(urls, businessName, businessLocation, businessType)
        }

        var setupData = result.getOrNull()
        var productCount = setupData?.categories?.sumOf { it.products.size } ?: 0
        val storeCount = setupData?.stores?.size ?: 0
        Log.d(TAG, "Fallback phase 1: $productCount products, $storeCount stores")

        updateStats(setupData)
        setStatus(
            if (productCount > 0) {
                "Found $productCount products" +
                    (if (storeCount > 1) " across $storeCount locations" else "")
            } else {
                "Searching for more sources..."
            },
            1
        )

        if (productCount < MIN_PRODUCTS_THRESHOLD) {
            setStatus("Found only $productCount products, searching for more...", 2)
            updateNotification("Fallback 2/4 — Searching for menu pages...", 2, 4)

            val menuUrls = websiteSetupService.searchForMenuSources(businessName, businessLocation, businessType)
            val newMenuUrls = menuUrls.filter { it !in urls }

            if (newMenuUrls.isNotEmpty()) {
                setStatus("Found ${newMenuUrls.size} more sources, analyzing...", 2)

                val menuResult = websiteSetupService.analyzeMultipleSources(
                    urls + newMenuUrls, businessName, businessLocation, businessType
                )

                if (menuResult.isSuccess) {
                    val menuData = menuResult.getOrNull()
                    val menuProductCount = menuData?.categories?.sumOf { it.products.size } ?: 0
                    if (menuProductCount > productCount) {
                        result = menuResult
                        setupData = menuData
                        productCount = menuProductCount
                        updateStats(setupData)
                        setStatus("Now have $productCount products", 2)
                    }
                }
            }
        } else {
            Log.d(TAG, "Fallback phase 2 skipped: already have $productCount products")
        }

        if (productCount < MIN_PRODUCTS_THRESHOLD) {
            setStatus("AI is creating realistic products for $businessName...", 3)
            updateNotification("Fallback 3/4 — Generating product catalog...", 3, 4)

            val genResult = websiteSetupService.generateProductsFromKnowledge(
                businessName, businessLocation, businessType, setupData
            )

            if (genResult.isSuccess) {
                result = genResult
                setupData = genResult.getOrNull()
                productCount = setupData?.categories?.sumOf { it.products.size } ?: 0
                updateStats(setupData)
                setStatus("Generated $productCount products", 3)
            }
        } else {
            Log.d(TAG, "Fallback phase 3 skipped: already have $productCount products")
        }

        val data = result.getOrNull() ?: return null

        val productsWithoutImages = data.categories.sumOf { cat ->
            cat.products.count { it.imageUrl.isNullOrBlank() || it.imageUrl == "" }
        }

        if (productsWithoutImages <= 0) {
            Log.d(TAG, "Fallback phase 4 skipped: all $productCount products have images")
            return data
        }

        setStatus("Downloading images: 0/$productsWithoutImages...", 4)
        updateNotification("Fallback 4/4 — Finding images (0/$productsWithoutImages)...", 3, 4)

        return try {
            websiteSetupService.fetchImagesForProducts(
                applicationContext, data, businessName
            ) { completed, total ->
                setStatus("Downloading images: $completed/$total...", 4)
                updateNotification("Fallback 4/4 — Images: $completed/$total", 3, 4)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Fallback image fetch failed: ${e.message}")
            data
        }
    }

    // ─── Progress helpers ────────────────────────────────────

    private fun setStatus(status: String, phase: Int) {
        prefsManager.setString(PREF_IMPORT_STATUS, status)
        prefsManager.setString(PREF_IMPORT_PHASE, phase.toString())
        Log.d(TAG, "[$phase/5] $status")
    }

    private fun updateStats(data: WebsiteSetupService.StoreSetupResult?) {
        if (data == null) return
        val products = data.categories.sumOf { it.products.size }
        val stores = data.stores.size.coerceAtLeast(1)
        val categories = data.categories.size
        val images = data.categories.sumOf { cat ->
            cat.products.count { !it.imageUrl.isNullOrBlank() && it.imageUrl != "" }
        }
        val stats = buildString {
            if (stores > 1) append("$stores stores, ")
            append("$products products")
            if (categories > 0) append(", $categories categories")
            if (images > 0) append(", $images images")
        }
        prefsManager.setString(PREF_IMPORT_STATS, stats)
    }

    // ─── Save to Database ────────────────────────────────────

    /**
     * Saves AI import results to the SERVER via /api/ai-import/save.
     * Server is source of truth — never save master data to local Room DB.
     * After saving, triggers sync to pull data locally.
     */
    private suspend fun saveImportToDatabase(
        data: WebsiteSetupService.StoreSetupResult,
        businessName: String,
        targetAccountId: String,
        ownerEmail: String,
        ownerPhone: String,
        accountType: String
    ): String {
        if (targetAccountId.isBlank()) {
            throw IllegalStateException("No target account ID — standalone account creation is no longer supported")
        }
        val accountId = targetAccountId
        val storeName = data.storeName.orEmpty().ifBlank { businessName }

        // Build payload for server
        val categoriesJson = org.json.JSONArray()
        for (catData in data.categories) {
            if (catData.name.isNullOrBlank()) continue
            val catObj = org.json.JSONObject()
            catObj.put("name", catData.name)
            val productsArr = org.json.JSONArray()
            for (prod in catData.products) {
                val pObj = org.json.JSONObject()
                pObj.put("name", prod.name ?: "Product")
                pObj.put("price", prod.price)
                pObj.put("description", prod.description ?: "")
                pObj.put("image_url", prod.imageUrl ?: "")
                productsArr.put(pObj)
            }
            catObj.put("products", productsArr)
            categoriesJson.put(catObj)
        }

        val payload = org.json.JSONObject().apply {
            put("account_id", accountId)
            put("store_name", storeName)
            put("currency", data.currency ?: "USD")
            put("tax_name", data.taxName ?: "Tax")
            put("tax_rate", data.taxRate)
            put("categories", categoriesJson)
        }

        // POST to server
        val url = java.net.URL("https://web.posterita.com/api/ai-import/save")
        val conn = url.openConnection() as java.net.HttpURLConnection
        conn.requestMethod = "POST"
        conn.setRequestProperty("Content-Type", "application/json")
        conn.connectTimeout = 30_000
        conn.readTimeout = 30_000
        conn.doOutput = true
        conn.outputStream.bufferedWriter().use { it.write(payload.toString()) }

        val responseCode = conn.responseCode
        val responseBody = if (responseCode in 200..299) {
            conn.inputStream.bufferedReader().readText()
        } else {
            val err = conn.errorStream?.bufferedReader()?.readText() ?: "Unknown error"
            throw Exception("Server save failed ($responseCode): $err")
        }

        val result = org.json.JSONObject(responseBody)
        val productsCreated = result.optInt("products_created", 0)
        val categoriesCreated = result.optInt("categories_created", 0)

        Log.d(TAG, "Server saved $accountId: $productsCreated products, $categoriesCreated categories")

        // Register in local account registry
        accountRegistry.addAccount(
            id = accountId,
            name = storeName,
            storeName = storeName,
            ownerEmail = ownerEmail,
            ownerPhone = ownerPhone,
            type = accountType,
            status = defaultStatusForType(accountType)
        )

        // Reset sync timestamp so next sync pulls everything
        val syncKey = CloudSyncService.syncDateKey(accountId)
        prefsManager.setString(syncKey, "1970-01-01T00:00:00.000Z")

        // Trigger sync to pull server data locally
        com.posterita.pos.android.worker.CloudSyncWorker.syncNow(applicationContext)

        return accountId
    }

    private fun defaultStatusForType(accountType: String): String = when (accountType.lowercase()) {
        "live" -> "onboarding"
        "demo", "trial" -> "testing"
        else -> "draft"
    }

    // ─── Notifications ───────────────────────────────────────

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(NotificationManager::class.java)
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "AI Product Import", NotificationManager.IMPORTANCE_LOW).apply {
                    description = "Shows progress while importing products from your business website"
                }
            )
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_DONE_ID, "Import Complete", NotificationManager.IMPORTANCE_DEFAULT).apply {
                    description = "Notifies when your store setup is complete"
                }
            )
        }
    }

    private fun buildProgressNotification(text: String, progress: Int, max: Int): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle("Setting up your store")
            .setContentText(text)
            .setOngoing(true)
            .setProgress(max, progress, progress == 0)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun updateNotification(text: String, progress: Int, max: Int) {
        val nm = getSystemService(NotificationManager::class.java)
        nm.notify(NOTIFICATION_ID, buildProgressNotification(text, progress, max))
    }

    private fun showDoneNotification(message: String, success: Boolean) {
        val nm = getSystemService(NotificationManager::class.java)
        nm.cancel(NOTIFICATION_ID)

        val tapIntent = packageManager.getLaunchIntentForPackage(packageName)?.apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, tapIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_DONE_ID)
            .setSmallIcon(if (success) R.drawable.ic_notification else android.R.drawable.ic_dialog_alert)
            .setContentTitle(if (success) "Your store is ready!" else "Import issue")
            .setContentText(message)
            .setStyle(NotificationCompat.BigTextStyle().bigText(message))
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        nm.notify(DONE_NOTIFICATION_ID, notification)
    }
}
