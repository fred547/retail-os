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
import androidx.appcompat.app.AppCompatActivity
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
import javax.inject.Inject

/**
 * Embeds the web console inside the Android app via WebView.
 * Pass EXTRA_URL to load a specific page, or EXTRA_PATH for a relative path.
 * Pass EXTRA_TITLE to set the top bar title.
 */
@AndroidEntryPoint
class WebConsoleActivity : AppCompatActivity() {

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

        // Configure WebView
        binding.webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
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

                // Inject CSS to hide sidebar, fit the native app shell, optimize for mobile
                view?.evaluateJavascript("""
                    (function() {
                        var style = document.createElement('style');
                        style.textContent = `
                            /* Hide sidebar completely */
                            .sidebar-desktop, .sidebar-mobile, aside { display: none !important; }
                            .sidebar-hamburger, .sidebar-backdrop { display: none !important; }
                            button[aria-label="Open menu"], button[aria-label="Close sidebar"] { display: none !important; }
                            /* Full-width content */
                            main, .flex-1 { margin-left: 0 !important; padding: 8px !important; }
                            .lg\\:ml-64 { margin-left: 0 !important; }
                            /* Minimal top padding */
                            .pt-16, .lg\\:pt-8 { padding-top: 4px !important; }
                            /* Hide breadcrumb and page heading (Android top bar has it) */
                            nav[aria-label="Breadcrumb"] { display: none !important; }
                            /* Mobile-optimize data tables: compact but keep all columns visible */
                            .data-table { font-size: 13px !important; }
                            .data-table th, .data-table td { padding: 8px 6px !important; font-size: 13px !important; }
                            .data-table { overflow-x: auto !important; display: block !important; }
                            /* Make rows tappable with better touch targets */
                            .data-table tbody tr { min-height: 48px; }
                            /* Compact spacing */
                            .space-y-6 > * + * { margin-top: 8px !important; }
                            .space-y-4 > * + * { margin-top: 6px !important; }
                            /* Bottom sheet: ensure it fits mobile */
                            [role="dialog"] { max-height: 85vh !important; }
                            .sm\\:max-w-md { max-width: 100% !important; }
                            .sm\\:rounded-2xl { border-radius: 16px 16px 0 0 !important; }
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
            // Read user/store/terminal from session or DB (not prefs — prefs may belong to another brand)
            val user = sessionManager.user ?: try { db.userDao().getAllUsers().firstOrNull() } catch (_: Exception) { null }
            val store = sessionManager.store ?: try { db.storeDao().getAllStores().firstOrNull() } catch (_: Exception) { null }
            val terminal = sessionManager.terminal ?: try { db.terminalDao().getAllTerminals().firstOrNull() } catch (_: Exception) { null }
            val userId = user?.user_id ?: 0
            val storeId = store?.storeId ?: prefsManager.storeId
            val terminalId = terminal?.terminalId ?: prefsManager.terminalId
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
