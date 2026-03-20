package com.posterita.pos.android.ui.activity

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.posterita.pos.android.R
import com.posterita.pos.android.databinding.ActivityWebConsoleBinding
import com.posterita.pos.android.util.ConnectivityMonitor
import com.posterita.pos.android.util.SharedPreferencesManager
import dagger.hilt.android.AndroidEntryPoint
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
        const val WEB_CONSOLE_BASE = "https://posterita-cloud.vercel.app"
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
                // Keep all navigation inside the WebView
                return false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                binding.progressLoading.visibility = View.GONE

                // Inject CSS to hide the web console's sidebar nav (we provide our own nav)
                view?.evaluateJavascript("""
                    (function() {
                        var style = document.createElement('style');
                        style.textContent = `
                            /* Hide sidebar navigation — Android provides its own */
                            [data-sidebar], nav, .sidebar, aside { display: none !important; }
                            /* Make main content full width */
                            main, [role="main"], .main-content {
                                margin-left: 0 !important;
                                width: 100% !important;
                                max-width: 100% !important;
                            }
                            /* Hide any top nav/header from the web console */
                            header.top-bar, .top-navigation { display: none !important; }
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

        // Load the URL
        val url = intent.getStringExtra(EXTRA_URL)
        val path = intent.getStringExtra(EXTRA_PATH)

        val targetUrl = when {
            url != null -> url
            path != null -> "$WEB_CONSOLE_BASE$path"
            else -> WEB_CONSOLE_BASE
        }

        binding.progressLoading.visibility = View.VISIBLE
        binding.webView.loadUrl(targetUrl)
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
