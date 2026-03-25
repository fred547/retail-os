package com.posterita.pos.android.ui.activity

import android.content.Intent
import android.os.Bundle
import android.view.Gravity
import android.view.ViewGroup
import android.widget.*
import androidx.core.view.setPadding
import com.posterita.pos.android.kds.KdsDiscovery
import com.posterita.pos.android.R
import kotlinx.coroutines.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Setup screen for KDS mode.
 * Discovers POS terminals on LAN via mDNS or manual IP entry,
 * then launches KdsDisplayActivity.
 */
class KdsSetupActivity : BaseActivity() {

    private lateinit var discovery: KdsDiscovery
    private val discoveredServers = mutableListOf<KdsDiscovery.DiscoveredServer>()
    private lateinit var serverListView: LinearLayout
    private lateinit var statusText: TextView
    private lateinit var manualIpInput: EditText
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val root = ScrollView(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(48)
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            )
        }

        // Title
        content.addView(TextView(this).apply {
            text = "KDS Setup"
            textSize = 24f
            setTypeface(null, android.graphics.Typeface.BOLD)
            gravity = Gravity.CENTER
        })

        content.addView(TextView(this).apply {
            text = "Connect to a POS terminal to display kitchen orders"
            textSize = 14f
            setTextColor(0xFF888888.toInt())
            gravity = Gravity.CENTER
            setPadding(0, 8, 0, 32)
        })

        // Status
        statusText = TextView(this).apply {
            text = "Searching for POS terminals on your network..."
            textSize = 14f
            setPadding(0, 0, 0, 16)
        }
        content.addView(statusText)

        // Discovered servers list
        serverListView = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }
        content.addView(serverListView)

        // Manual IP section
        content.addView(TextView(this).apply {
            text = "Or enter IP address manually:"
            textSize = 14f
            setPadding(0, 32, 0, 8)
        })

        val manualRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
        }

        manualIpInput = EditText(this).apply {
            hint = "192.168.1.100"
            inputType = android.text.InputType.TYPE_CLASS_TEXT
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        manualRow.addView(manualIpInput)

        manualRow.addView(Button(this).apply {
            text = "Connect"
            setOnClickListener {
                val ip = manualIpInput.text.toString().trim()
                if (ip.isNotBlank()) {
                    testAndConnect(ip, KdsDiscovery.DiscoveredServer("Manual", ip, 8321))
                }
            }
        })
        content.addView(manualRow)

        // Back button
        content.addView(Button(this).apply {
            text = "Cancel"
            setPadding(0, 32, 0, 0)
            setOnClickListener { finish() }
        })

        root.addView(content)
        setContentView(root)

        // Start mDNS discovery
        discovery = KdsDiscovery(this)
        discovery.startDiscovery(object : KdsDiscovery.DiscoveryCallback {
            override fun onServerFound(server: KdsDiscovery.DiscoveredServer) {
                runOnUiThread {
                    if (discoveredServers.none { it.host == server.host && it.port == server.port }) {
                        discoveredServers.add(server)
                        addServerButton(server)
                        statusText.text = "Found ${discoveredServers.size} terminal(s)"
                    }
                }
            }

            override fun onServerLost(name: String) {
                runOnUiThread {
                    discoveredServers.removeAll { it.name == name }
                    refreshServerList()
                }
            }

            override fun onError(message: String) {
                runOnUiThread {
                    statusText.text = "Discovery error: $message. Enter IP manually."
                }
            }
        })
    }

    private fun addServerButton(server: KdsDiscovery.DiscoveredServer) {
        val btn = Button(this).apply {
            text = "${server.name}\n${server.host}:${server.port}"
            setOnClickListener { testAndConnect(server.host, server) }
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = 8 }
        }
        serverListView.addView(btn)
    }

    private fun refreshServerList() {
        serverListView.removeAllViews()
        for (server in discoveredServers) {
            addServerButton(server)
        }
        statusText.text = if (discoveredServers.isEmpty()) {
            "Searching for POS terminals..."
        } else {
            "Found ${discoveredServers.size} terminal(s)"
        }
    }

    private fun testAndConnect(host: String, server: KdsDiscovery.DiscoveredServer) {
        statusText.text = "Testing connection to $host..."

        scope.launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    val url = URL("http://$host:${server.port}/kds/health")
                    val conn = url.openConnection() as HttpURLConnection
                    conn.connectTimeout = 3000
                    conn.readTimeout = 3000
                    try {
                        val response = conn.inputStream.bufferedReader().readText()
                        JSONObject(response)
                    } finally {
                        conn.disconnect()
                    }
                }

                if (result.optString("status") == "ok") {
                    statusText.text = "Connected! Starting KDS display..."
                    // Launch KDS display
                    val intent = Intent(this@KdsSetupActivity, KdsDisplayActivity::class.java).apply {
                        putExtra("kds_host", host)
                        putExtra("kds_port", server.port)
                        putExtra("kds_name", server.name)
                    }
                    startActivity(intent)
                    finish()
                } else {
                    statusText.text = "Server responded but health check failed"
                }
            } catch (e: Exception) {
                statusText.text = "Connection failed: ${e.message}"
            }
        }
    }

    override fun onDestroy() {
        discovery.stopDiscovery()
        scope.cancel()
        super.onDestroy()
    }
}
