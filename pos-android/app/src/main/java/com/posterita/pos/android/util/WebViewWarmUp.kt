package com.posterita.pos.android.util

import android.annotation.SuppressLint
import android.content.Context
import android.util.Log
import android.webkit.WebView

/**
 * Warms up the Android WebView engine on app start.
 *
 * Problem: The first WebView load takes 300-800ms just to initialize
 * the Chromium engine. Subsequent loads are instant.
 *
 * Solution: Create a hidden WebView early (in Application.onCreate)
 * so the engine is initialized before the user opens any WebView screen.
 *
 * This also pre-warms the DNS cache and TLS connection pool for
 * web.posterita.com, making the first real page load faster.
 */
object WebViewWarmUp {

    private const val TAG = "WebViewWarmUp"
    private var warmedUp = false

    /**
     * Call from Application.onCreate() to initialize the WebView engine.
     * Creates a temporary WebView, loads a blank page to trigger engine init,
     * then destroys it. Takes ~100ms on the main thread.
     */
    @SuppressLint("SetJavaScriptEnabled")
    fun warmUp(context: Context) {
        if (warmedUp) return
        try {
            // This triggers Chromium engine initialization
            val webView = WebView(context)
            webView.settings.javaScriptEnabled = true
            webView.settings.domStorageEnabled = true

            // Load a minimal page to initialize networking stack + DNS
            webView.loadUrl("about:blank")

            // Pre-resolve DNS for web.posterita.com (background)
            Thread {
                try {
                    java.net.InetAddress.getByName("web.posterita.com")
                    Log.d(TAG, "DNS pre-resolved for web.posterita.com")
                } catch (_: Exception) {}
            }.start()

            webView.destroy()
            warmedUp = true
            Log.d(TAG, "WebView engine warmed up")
        } catch (e: Exception) {
            Log.w(TAG, "WebView warm-up failed: ${e.message}")
        }
    }

    /**
     * Pre-fetch a URL in the background so it's cached for when the user
     * opens it in WebConsoleActivity. Uses OkHttp (already in deps).
     */
    fun prefetchUrl(url: String) {
        Thread {
            try {
                val conn = java.net.URL(url).openConnection() as java.net.HttpURLConnection
                conn.requestMethod = "GET"
                conn.connectTimeout = 5000
                conn.readTimeout = 5000
                conn.instanceFollowRedirects = true
                val status = conn.responseCode
                conn.disconnect()
                Log.d(TAG, "Prefetched $url → $status")
            } catch (e: Exception) {
                Log.d(TAG, "Prefetch failed for $url: ${e.message}")
            }
        }.start()
    }
}
