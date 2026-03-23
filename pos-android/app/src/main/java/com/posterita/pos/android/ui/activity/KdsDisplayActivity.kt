package com.posterita.pos.android.ui.activity

import android.graphics.Color
import android.graphics.Typeface
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import kotlinx.coroutines.*
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

/**
 * Full-screen Kitchen Display System.
 * Connects to a POS terminal's KdsServer via HTTP + SSE.
 * Shows active orders in a grid, with bump/recall gestures.
 */
class KdsDisplayActivity : AppCompatActivity() {

    private lateinit var recyclerView: RecyclerView
    private lateinit var headerText: TextView
    private lateinit var clockText: TextView
    private lateinit var connectionDot: View

    private var kdsHost: String = ""
    private var kdsPort: Int = 8321
    private var stationFilter: Int? = null

    private val orders = mutableListOf<KdsOrderCard>()
    private lateinit var adapter: KdsGridAdapter

    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private val timerHandler = Handler(Looper.getMainLooper())
    private var sseJob: Job? = null
    private var connected = false

    data class KdsOrderCard(
        val holdOrderId: Int,
        var tableName: String,
        var sectionName: String,
        var status: String,
        var createdAt: Long,
        var items: List<KdsItemLine>,
        var note: String
    )

    data class KdsItemLine(
        val lineId: Int,
        val productName: String,
        val quantity: Double,
        val modifiers: String,
        val note: String,
        var itemStatus: String,
        val stationName: String
    )

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Full screen, keep screen on
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
        )

        kdsHost = intent.getStringExtra("kds_host") ?: ""
        kdsPort = intent.getIntExtra("kds_port", 8321)

        buildLayout()
        setupRecyclerView()
        startTimerUpdates()

        // Initial fetch
        scope.launch { fetchOrders() }

        // Start SSE connection
        connectSse()
    }

    private fun buildLayout() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#1F2937"))
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
        }

        // Header bar
        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            setBackgroundColor(Color.parseColor("#111827"))
            setPadding(24, 12, 24, 12)
            gravity = Gravity.CENTER_VERTICAL
        }

        headerText = TextView(this).apply {
            text = "KITCHEN DISPLAY"
            setTextColor(Color.WHITE)
            textSize = 20f
            setTypeface(null, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
        }
        header.addView(headerText)

        connectionDot = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(16, 16).apply { rightMargin = 12 }
            background = resources.getDrawable(android.R.drawable.presence_offline, null)
        }
        header.addView(connectionDot)

        clockText = TextView(this).apply {
            setTextColor(Color.parseColor("#9CA3AF"))
            textSize = 16f
        }
        header.addView(clockText)

        // Exit button
        header.addView(TextView(this).apply {
            text = "EXIT"
            setTextColor(Color.parseColor("#EF4444"))
            textSize = 14f
            setTypeface(null, Typeface.BOLD)
            setPadding(24, 8, 0, 8)
            setOnClickListener { confirmExit() }
        })

        root.addView(header)

        // RecyclerView
        recyclerView = RecyclerView(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                0, 1f
            )
            setPadding(8, 8, 8, 8)
            clipToPadding = false
        }
        root.addView(recyclerView)

        setContentView(root)
    }

    private fun setupRecyclerView() {
        // Auto-determine columns based on screen width
        val displayWidth = resources.displayMetrics.widthPixels
        val dpWidth = displayWidth / resources.displayMetrics.density
        val columns = when {
            dpWidth >= 1200 -> 6
            dpWidth >= 900 -> 4
            dpWidth >= 600 -> 3
            else -> 2
        }

        adapter = KdsGridAdapter(orders) { order ->
            bumpOrder(order)
        }
        recyclerView.layoutManager = GridLayoutManager(this, columns)
        recyclerView.adapter = adapter
    }

    // ── Data fetching ──

    private suspend fun fetchOrders() {
        try {
            val result = withContext(Dispatchers.IO) {
                val urlStr = buildString {
                    append("http://$kdsHost:$kdsPort/kds/orders")
                    if (stationFilter != null) append("?station_id=$stationFilter")
                }
                val conn = URL(urlStr).openConnection() as HttpURLConnection
                conn.connectTimeout = 5000
                conn.readTimeout = 5000
                try {
                    conn.inputStream.bufferedReader().readText()
                } finally {
                    conn.disconnect()
                }
            }

            val json = JSONObject(result)
            val ordersArray = json.optJSONArray("orders") ?: JSONArray()
            parseOrders(ordersArray)
        } catch (e: Exception) {
            // Will retry via SSE reconnect
        }
    }

    private fun parseOrders(ordersArray: JSONArray) {
        orders.clear()
        for (i in 0 until ordersArray.length()) {
            val obj = ordersArray.getJSONObject(i)
            val itemsArr = obj.optJSONArray("items") ?: JSONArray()
            val items = mutableListOf<KdsItemLine>()
            for (j in 0 until itemsArr.length()) {
                val item = itemsArr.getJSONObject(j)
                items.add(KdsItemLine(
                    lineId = item.optInt("line_id", j),
                    productName = item.optString("product_name", ""),
                    quantity = item.optDouble("quantity", 1.0),
                    modifiers = item.optString("modifiers", ""),
                    note = item.optString("note", ""),
                    itemStatus = item.optString("item_status", "new"),
                    stationName = item.optString("station_name", "")
                ))
            }
            orders.add(KdsOrderCard(
                holdOrderId = obj.optInt("hold_order_id"),
                tableName = obj.optString("table_name", ""),
                sectionName = obj.optString("section_name", ""),
                status = obj.optString("status", "NEW"),
                createdAt = parseIsoToMillis(obj.optString("created_at", "")),
                items = items,
                note = obj.optString("note", "")
            ))
        }
        // Sort by oldest first
        orders.sortBy { it.createdAt }
        adapter.notifyDataSetChanged()
    }

    // ── SSE connection ──

    private fun connectSse() {
        sseJob?.cancel()
        sseJob = scope.launch {
            while (isActive) {
                try {
                    withContext(Dispatchers.IO) {
                        val urlStr = buildString {
                            append("http://$kdsHost:$kdsPort/kds/stream")
                            if (stationFilter != null) append("?station_id=$stationFilter")
                        }
                        val conn = URL(urlStr).openConnection() as HttpURLConnection
                        conn.connectTimeout = 5000
                        conn.readTimeout = 0 // No read timeout for SSE
                        conn.setRequestProperty("Accept", "text/event-stream")

                        val reader = BufferedReader(InputStreamReader(conn.inputStream))
                        withContext(Dispatchers.Main) {
                            connected = true
                            updateConnectionDot()
                        }

                        var eventType = ""
                        var data = ""

                        var line: String?
                        while (reader.readLine().also { line = it } != null) {
                            val l = line ?: continue
                            when {
                                l.startsWith("event: ") -> eventType = l.removePrefix("event: ")
                                l.startsWith("data: ") -> data = l.removePrefix("data: ")
                                l.isBlank() && eventType.isNotEmpty() -> {
                                    withContext(Dispatchers.Main) {
                                        handleSseEvent(eventType, data)
                                    }
                                    eventType = ""
                                    data = ""
                                }
                            }
                        }
                    }
                } catch (_: Exception) {
                    // Connection lost
                }

                connected = false
                updateConnectionDot()
                // Reconnect after 3 seconds
                delay(3000)
                // Re-fetch full state on reconnect
                fetchOrders()
            }
        }
    }

    private fun handleSseEvent(eventType: String, data: String) {
        when (eventType) {
            "order_new", "order_updated", "order_recall" -> {
                // Re-fetch all orders for simplicity
                scope.launch { fetchOrders() }
                if (eventType == "order_new") playChime()
            }
            "item_status" -> {
                try {
                    val json = JSONObject(data)
                    val orderId = json.getInt("hold_order_id")
                    val lineId = json.getInt("line_id")
                    val status = json.getString("status")
                    val order = orders.find { it.holdOrderId == orderId }
                    val item = order?.items?.find { it.lineId == lineId }
                    if (item != null) {
                        item.itemStatus = status
                        adapter.notifyDataSetChanged()
                    }
                } catch (_: Exception) {
                    scope.launch { fetchOrders() }
                }
            }
            "order_bump" -> {
                try {
                    val json = JSONObject(data)
                    val orderId = json.getInt("hold_order_id")
                    val status = json.getString("status")
                    val order = orders.find { it.holdOrderId == orderId }
                    if (order != null) {
                        order.status = status
                        if (status == "READY") {
                            // Move to end (done section)
                            orders.remove(order)
                            orders.add(order)
                        }
                        adapter.notifyDataSetChanged()
                    }
                } catch (_: Exception) {
                    scope.launch { fetchOrders() }
                }
            }
            "order_deleted", "order_merge", "table_transfer" -> {
                scope.launch { fetchOrders() }
            }
            "heartbeat" -> {
                connected = true
                updateConnectionDot()
            }
        }
    }

    // ── Actions ──

    private fun bumpOrder(order: KdsOrderCard) {
        scope.launch {
            try {
                withContext(Dispatchers.IO) {
                    val conn = URL("http://$kdsHost:$kdsPort/kds/bump").openConnection() as HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json")
                    conn.doOutput = true
                    val targetStatus = when (order.status) {
                        "NEW" -> "in_progress"
                        "IN_PROGRESS" -> "ready"
                        else -> "new"
                    }
                    val body = JSONObject().apply {
                        put("hold_order_id", order.holdOrderId)
                        put("status", targetStatus)
                    }
                    conn.outputStream.use { it.write(body.toString().toByteArray()) }
                    conn.inputStream.bufferedReader().readText()
                    conn.disconnect()
                }
            } catch (e: Exception) {
                Toast.makeText(this@KdsDisplayActivity, "Bump failed: ${e.message}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    // ── Timer ──

    private val timerRunnable = object : Runnable {
        override fun run() {
            val now = System.currentTimeMillis()
            clockText.text = java.text.SimpleDateFormat("HH:mm", java.util.Locale.getDefault()).format(java.util.Date(now))
            adapter.notifyDataSetChanged() // Refresh elapsed times
            timerHandler.postDelayed(this, 1000)
        }
    }

    private fun startTimerUpdates() {
        timerHandler.post(timerRunnable)
    }

    private fun updateConnectionDot() {
        connectionDot.setBackgroundColor(if (connected) Color.parseColor("#10B981") else Color.parseColor("#EF4444"))
    }

    private fun playChime() {
        try {
            val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
            RingtoneManager.getRingtone(this, uri)?.play()
        } catch (_: Exception) {}
    }

    private fun confirmExit() {
        AlertDialog.Builder(this)
            .setTitle("Exit KDS")
            .setMessage("Return to the main app?")
            .setPositiveButton("Exit") { _, _ -> finish() }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun parseIsoToMillis(iso: String): Long {
        return try {
            java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).parse(iso)?.time
                ?: System.currentTimeMillis()
        } catch (_: Exception) {
            System.currentTimeMillis()
        }
    }

    override fun onDestroy() {
        timerHandler.removeCallbacks(timerRunnable)
        sseJob?.cancel()
        scope.cancel()
        super.onDestroy()
    }

    // ── Grid Adapter ──

    inner class KdsGridAdapter(
        private val orders: List<KdsOrderCard>,
        private val onBump: (KdsOrderCard) -> Unit
    ) : RecyclerView.Adapter<KdsGridAdapter.ViewHolder>() {

        inner class ViewHolder(val card: LinearLayout) : RecyclerView.ViewHolder(card)

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
            val card = LinearLayout(parent.context).apply {
                orientation = LinearLayout.VERTICAL
                setBackgroundColor(Color.parseColor("#374151"))
                setPadding(16, 12, 16, 12)
                layoutParams = RecyclerView.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply { setMargins(6, 6, 6, 6) }
            }
            return ViewHolder(card)
        }

        override fun getItemCount() = orders.size

        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val order = orders[position]
            val card = holder.card
            card.removeAllViews()

            val now = System.currentTimeMillis()
            val elapsed = (now - order.createdAt) / 1000
            val minutes = elapsed / 60

            // Timer color
            val timerColor = when {
                minutes >= 15 -> Color.parseColor("#EF4444") // Red
                minutes >= 10 -> Color.parseColor("#F97316") // Orange
                minutes >= 5 -> Color.parseColor("#EAB308")  // Yellow
                else -> Color.parseColor("#10B981")           // Green
            }

            // Status border color
            val borderColor = when (order.status) {
                "READY" -> Color.parseColor("#10B981")
                "IN_PROGRESS" -> Color.parseColor("#EAB308")
                else -> Color.parseColor("#3B82F6")
            }

            card.setBackgroundColor(if (order.status == "READY") Color.parseColor("#064E3B") else Color.parseColor("#374151"))

            // Header: table name + elapsed time
            val headerRow = LinearLayout(card.context).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }

            headerRow.addView(TextView(card.context).apply {
                text = order.tableName.ifBlank { "Order #${order.holdOrderId}" }
                setTextColor(Color.WHITE)
                textSize = 16f
                setTypeface(null, Typeface.BOLD)
                layoutParams = LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f)
            })

            headerRow.addView(TextView(card.context).apply {
                text = "${minutes}m"
                setTextColor(timerColor)
                textSize = 14f
                setTypeface(null, Typeface.BOLD)
            })

            card.addView(headerRow)

            // Section name (if present)
            if (order.sectionName.isNotBlank()) {
                card.addView(TextView(card.context).apply {
                    text = order.sectionName
                    setTextColor(Color.parseColor("#9CA3AF"))
                    textSize = 12f
                })
            }

            // Divider
            card.addView(View(card.context).apply {
                setBackgroundColor(Color.parseColor("#4B5563"))
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, 1
                ).apply { topMargin = 8; bottomMargin = 8 }
            })

            // Items
            for (item in order.items) {
                val itemColor = when (item.itemStatus) {
                    "ready" -> Color.parseColor("#10B981")
                    "in_progress" -> Color.parseColor("#EAB308")
                    else -> Color.WHITE
                }

                card.addView(TextView(card.context).apply {
                    text = "${item.quantity.toInt()}x ${item.productName}"
                    setTextColor(itemColor)
                    textSize = 14f
                    setTypeface(null, if (item.itemStatus == "ready") Typeface.NORMAL else Typeface.BOLD)
                    if (item.itemStatus == "ready") {
                        paintFlags = paintFlags or android.graphics.Paint.STRIKE_THRU_TEXT_FLAG
                    }
                })

                if (item.modifiers.isNotBlank()) {
                    card.addView(TextView(card.context).apply {
                        text = "  ${item.modifiers}"
                        setTextColor(Color.parseColor("#9CA3AF"))
                        textSize = 12f
                    })
                }
            }

            // Bump button
            val bumpText = when (order.status) {
                "NEW" -> "START"
                "IN_PROGRESS" -> "DONE"
                "READY" -> "RECALL"
                else -> "BUMP"
            }

            card.addView(TextView(card.context).apply {
                text = bumpText
                setTextColor(Color.WHITE)
                textSize = 14f
                setTypeface(null, Typeface.BOLD)
                gravity = Gravity.CENTER
                setBackgroundColor(borderColor)
                setPadding(0, 12, 0, 12)
                layoutParams = LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.WRAP_CONTENT
                ).apply { topMargin = 12 }
                setOnClickListener { onBump(order) }
            })
        }
    }
}
