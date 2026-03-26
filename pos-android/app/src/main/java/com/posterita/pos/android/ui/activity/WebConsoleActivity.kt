package com.posterita.pos.android.ui.activity

import android.annotation.SuppressLint
import android.os.Bundle
import android.util.Log
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.lifecycle.lifecycleScope
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ActivityWebConsoleBinding
import com.posterita.pos.android.util.AppErrorLogger
import com.posterita.pos.android.util.ConnectivityMonitor
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec
import javax.inject.Inject

/**
 * Embeds the web console inside the Android app via WebView.
 * Pass EXTRA_URL to load a specific page, or EXTRA_PATH for a relative path.
 * Pass EXTRA_TITLE to set the top bar title.
 */
@AndroidEntryPoint
class WebConsoleActivity : BaseActivity() {

    private lateinit var binding: ActivityWebConsoleBinding

    @Inject lateinit var prefsManager: SharedPreferencesManager
    @Inject lateinit var connectivityMonitor: ConnectivityMonitor

    companion object {
        const val EXTRA_URL = "web_console_url"
        const val EXTRA_PATH = "web_console_path"
        const val EXTRA_TITLE = "web_console_title"
        // Base URL for the web console
        const val WEB_CONSOLE_BASE = "https://web.posterita.com"
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityWebConsoleBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Top bar
        val title = intent.getStringExtra(EXTRA_TITLE) ?: "Web Console"
        binding.textTitle.text = title
        binding.buttonBack.setOnClickListener {
            if (binding.webView.canGoBack()) {
                binding.webView.goBack()
            } else {
                finish()
            }
        }

        // Connectivity
        connectivityMonitor.isConnected.observe(this) { connected ->
            binding.layoutOfflineBanner.visibility = if (connected) View.GONE else View.VISIBLE
        }

        // Configure WebView — render at mobile width, not desktop overview
        binding.webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            loadWithOverviewMode = false
            useWideViewPort = false
            setSupportZoom(false)
            builtInZoomControls = false
        }

        binding.webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val navUrl = request?.url?.toString() ?: return false

                // Block navigation to login, dashboard, or platform pages — these break the Android nav
                val blockedPaths = listOf("/login", "/customer/login", "/manager", "/platform", "/customer$")
                if (blockedPaths.any { navUrl.contains(it) }) {
                    Log.d("WebConsoleActivity", "Blocked navigation to: $navUrl")
                    return true // block
                }

                // Allow navigation within the web console
                return false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                binding.progressLoading.visibility = View.GONE

                // Inject viewport meta + CSS to render as mobile, hide sidebar, optimize layout
                view?.evaluateJavascript("""
                    (function() {
                        // Force mobile viewport
                        var vp = document.querySelector('meta[name="viewport"]');
                        if (!vp) {
                            vp = document.createElement('meta');
                            vp.name = 'viewport';
                            document.head.appendChild(vp);
                        }
                        vp.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';

                        var style = document.createElement('style');
                        style.textContent = `
                            /* Force mobile layout */
                            html, body { width: 100% !important; max-width: 100vw !important; overflow-x: hidden !important; }
                            * { box-sizing: border-box !important; }

                            /* Hide sidebar completely */
                            .sidebar-desktop, .sidebar-mobile, aside { display: none !important; }
                            .sidebar-hamburger, .sidebar-backdrop { display: none !important; }
                            button[aria-label="Open menu"], button[aria-label="Close sidebar"] { display: none !important; }

                            /* Full-width content — no left margin for sidebar */
                            main, .flex-1 { margin-left: 0 !important; padding: 12px !important; max-width: 100% !important; }
                            .lg\\:ml-64 { margin-left: 0 !important; }

                            /* Minimal top padding (Android top bar provides context) */
                            .pt-16, .lg\\:pt-8 { padding-top: 4px !important; }

                            /* Hide breadcrumb (Android top bar has title) */
                            nav[aria-label="Breadcrumb"] { display: none !important; }

                            /* Cards: full width, compact */
                            .grid { grid-template-columns: 1fr !important; gap: 8px !important; }
                            .md\\:grid-cols-2, .lg\\:grid-cols-3, .xl\\:grid-cols-4 { grid-template-columns: 1fr !important; }

                            /* Tables: fit phone width by hiding non-essential columns */
                            table { width: 100% !important; font-size: 13px !important; table-layout: fixed !important; }
                            th, td { padding: 8px 6px !important; overflow: hidden !important; text-overflow: ellipsis !important; white-space: nowrap !important; }
                            .overflow-x-auto { overflow-x: auto !important; -webkit-overflow-scrolling: touch !important; }

                            /* Hide less important columns on phone: UPC, Cost, Source, Status columns */
                            th:nth-child(4), td:nth-child(4),
                            th:nth-child(5), td:nth-child(5) { display: none !important; }

                            /* Image column: smaller */
                            th:nth-child(1), td:nth-child(1) { width: 40px !important; }
                            td img, td .w-10 { width: 32px !important; height: 32px !important; }

                            /* Name column: allow wrapping */
                            td:nth-child(2) { white-space: normal !important; word-break: break-word !important; max-width: 150px !important; }
                            td:nth-child(2) .text-xs { display: none !important; }

                            /* Touch-friendly rows */
                            tbody tr { min-height: 48px !important; }

                            /* Ensure edit/action buttons stay visible */
                            td:last-child { width: 40px !important; text-align: center !important; position: sticky !important; right: 0 !important; background: white !important; }

                            /* Compact spacing */
                            .space-y-6 > * + * { margin-top: 10px !important; }
                            .space-y-4 > * + * { margin-top: 8px !important; }

                            /* Dialogs & bottom sheets: full width on mobile */
                            [role="dialog"] { max-height: 85vh !important; max-width: 100% !important; width: 100% !important; }
                            .sm\\:max-w-md, .sm\\:max-w-lg { max-width: 100% !important; }
                            .sm\\:rounded-2xl { border-radius: 16px 16px 0 0 !important; }

                            /* Edit forms: full width inputs */
                            input, select, textarea { width: 100% !important; font-size: 16px !important; }

                            /* Page headings: compact */
                            h1 { font-size: 20px !important; }
                            h2 { font-size: 17px !important; }

                            /* Hide desktop-only elements */
                            .hidden.lg\\:block, .hidden.md\\:block { display: none !important; }
                        `;
                        document.head.appendChild(style);
                    })();
                """.trimIndent(), null)
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                binding.progressLoading.visibility = View.GONE
                if (request?.isForMainFrame == true) {
                    Toast.makeText(this@WebConsoleActivity, "Failed to load — check your internet connection", Toast.LENGTH_SHORT).show()
                }
            }
        }

        binding.webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                binding.progressLoading.visibility = if (newProgress < 100) View.VISIBLE else View.GONE
            }
        }

        // Build the target URL
        val url = intent.getStringExtra(EXTRA_URL)
        val path = intent.getStringExtra(EXTRA_PATH)

        val targetUrl = when {
            url != null -> url
            path != null -> "$WEB_CONSOLE_BASE$path"
            else -> WEB_CONSOLE_BASE
        }

        binding.progressLoading.visibility = View.VISIBLE

        // Fetch OTT token then load URL with it appended
        lifecycleScope.launch {
            val ottToken = fetchOttToken()
            val finalUrl = if (ottToken != null) {
                val separator = if (targetUrl.contains("?")) "&" else "?"
                "$targetUrl${separator}ott=$ottToken"
            } else {
                // OTT failed — load without auth (user may see login page)
                Log.w("WebConsoleActivity", "Loading without OTT auth: $targetUrl")
                targetUrl
            }
            binding.webView.loadUrl(finalUrl)
        }
    }

    /**
     * Requests a One-Time Token from the web console API.
     * Returns the token string on success, or null on any failure (offline, error, etc).
     */
    @Inject lateinit var db: com.posterita.pos.android.data.local.AppDatabase
    @Inject lateinit var sessionManager: com.posterita.pos.android.util.SessionManager

    private suspend fun fetchOttToken(): String? = withContext(Dispatchers.IO) {
        try {
            val rawAccountId = prefsManager.accountId
            val accountId = rawAccountId.ifEmpty { null } ?: run {
                Log.e("WebConsoleActivity", "OTT: accountId is empty, cannot fetch token")
                return@withContext null
            }
            if (accountId == "null" || accountId == "0") {
                Log.e("WebConsoleActivity", "OTT: accountId is invalid ($accountId)")
                return@withContext null
            }
            // Read user/store/terminal from this brand's DB (not sessionManager — it may hold another brand's context)
            val user = try { db.userDao().getAllUsers().firstOrNull() } catch (_: Exception) { null }
            val store = try { db.storeDao().getAllStores().lastOrNull() } catch (_: Exception) { null }
            val terminal = if (store != null) {
                try { db.terminalDao().getTerminalsForStore(store.storeId).firstOrNull() } catch (_: Exception) { null }
            } else {
                try { db.terminalDao().getAllTerminals().lastOrNull() } catch (_: Exception) { null }
            }
            val userId = user?.user_id ?: 0
            val storeId = store?.storeId ?: 0
            val terminalId = terminal?.terminalId ?: 0
            Log.d("WebConsoleActivity", "OTT: requesting token for account=$accountId user=$userId store=$storeId terminal=$terminalId")

            val url = URL("$WEB_CONSOLE_BASE/api/auth/ott")
            val conn = url.openConnection() as HttpURLConnection
            conn.apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                connectTimeout = 5_000
                readTimeout = 5_000
                doOutput = true
            }

            val payload = JSONObject().apply {
                put("account_id", accountId)
                put("user_id", if (userId > 0) userId else 1)
                if (storeId > 0) put("store_id", storeId)
                if (terminalId > 0) put("terminal_id", terminalId)
            }

            // Add HMAC auth headers (required by OTT endpoint)
            val syncSecret = prefsManager.syncSecret
            if (syncSecret.isNotEmpty()) {
                val timestamp = (System.currentTimeMillis() / 1000).toString()
                val hmacMessage = "$timestamp.${payload.toString()}"
                val signature = computeHmacSha256(syncSecret, hmacMessage)
                conn.setRequestProperty("X-Sync-Timestamp", timestamp)
                conn.setRequestProperty("X-Sync-Signature", signature)
            }

            OutputStreamWriter(conn.outputStream).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            val responseCode = conn.responseCode
            if (responseCode == 200) {
                val response = conn.inputStream.bufferedReader().readText()
                val json = JSONObject(response)
                val token = json.optString("token").ifEmpty { null }
                Log.d("WebConsoleActivity", "OTT: got token=${token?.take(8)}...")
                token
            } else {
                val errorBody = try { conn.errorStream?.bufferedReader()?.readText() } catch (_: Exception) { null }
                Log.w("WebConsoleActivity", "OTT request failed: $responseCode body=$errorBody")
                null
            }
        } catch (e: Exception) {
            AppErrorLogger.warn(this@WebConsoleActivity, "WebConsoleActivity", "OTT fetch failed (will load without auth)", e)
            null
        }
    }

    private fun computeHmacSha256(secret: String, message: String): String {
        val mac = Mac.getInstance("HmacSHA256")
        mac.init(SecretKeySpec(secret.toByteArray(Charsets.UTF_8), "HmacSHA256"))
        return mac.doFinal(message.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (binding.webView.canGoBack()) {
            binding.webView.goBack()
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }
}
