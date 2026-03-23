package com.posterita.pos.android.kds

import android.util.Log
import com.posterita.pos.android.data.local.AppDatabase
import fi.iki.elonen.NanoHTTPD
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.collectLatest
import org.json.JSONObject
import java.io.OutputStream
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Embedded HTTP server for Kitchen Display System communication.
 * Uses NanoHTTPD (Android-compatible). Runs on LAN only — no internet required.
 *
 * Endpoints:
 *   GET  /kds/orders           — active hold orders (optional ?station_id=N)
 *   GET  /kds/stream           — SSE stream for real-time updates
 *   POST /kds/bump             — bump item or order status
 *   POST /kds/recall           — recall a bumped order
 *   GET  /kds/stations         — list preparation stations
 *   GET  /kds/health           — server health check
 */
class KdsServer(
    private val db: AppDatabase,
    port: Int = DEFAULT_PORT
) : NanoHTTPD(port) {

    companion object {
        const val DEFAULT_PORT = 8321
        private const val TAG = "KdsServer"
    }

    private val sseClients = CopyOnWriteArrayList<SseClient>()
    private var eventRelayJob: Job? = null
    private var heartbeatJob: Job? = null
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val startTimeMs = System.currentTimeMillis()

    data class SseClient(val output: OutputStream, val stationFilter: Int?)

    val isRunning: Boolean get() = wasStarted()

    override fun start() {
        super.start()

        // Relay KdsEventBus events to SSE clients
        eventRelayJob = scope.launch {
            KdsEventBus.events.collectLatest { event ->
                val serialized = KdsOrderSerializer.serializeEvent(event) ?: return@collectLatest
                broadcastSse(serialized.first, serialized.second)
            }
        }

        // Heartbeat every 15 seconds
        heartbeatJob = scope.launch {
            while (isActive) {
                delay(15_000)
                KdsEventBus.emit(KdsEventBus.KdsEvent.Heartbeat)
            }
        }

        Log.i(TAG, "KDS server started on port $listeningPort")
    }

    override fun stop() {
        heartbeatJob?.cancel()
        eventRelayJob?.cancel()
        sseClients.clear()
        super.stop()
        Log.i(TAG, "KDS server stopped")
    }

    override fun serve(session: IHTTPSession): Response {
        val uri = session.uri
        val method = session.method

        // CORS preflight
        if (method == Method.OPTIONS) {
            return newFixedLengthResponse(Response.Status.NO_CONTENT, MIME_PLAINTEXT, "").apply {
                addCorsHeaders(this)
            }
        }

        return try {
            when {
                uri == "/kds/orders" && method == Method.GET -> handleOrders(session)
                uri == "/kds/stream" && method == Method.GET -> handleSseStream(session)
                uri == "/kds/bump" && method == Method.POST -> handleBump(session)
                uri == "/kds/recall" && method == Method.POST -> handleRecall(session)
                uri == "/kds/stations" && method == Method.GET -> handleStations()
                uri == "/kds/health" && method == Method.GET -> handleHealth()
                else -> jsonResponse(Response.Status.NOT_FOUND, """{"error":"Not found"}""")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error serving $uri: ${e.message}")
            jsonResponse(Response.Status.INTERNAL_ERROR, """{"error":"${e.message}"}""")
        }
    }

    // ── GET /kds/orders ──

    private fun handleOrders(session: IHTTPSession): Response {
        val stationId = session.parms?.get("station_id")?.toIntOrNull()

        val orders = runBlocking {
            db.holdOrderDao().getAllHoldOrders()
        }

        val payload = KdsOrderSerializer.serializeOrders(orders, stationId)
        return jsonResponse(Response.Status.OK, payload.toString())
    }

    // ── GET /kds/stream (SSE) ──

    private fun handleSseStream(session: IHTTPSession): Response {
        val stationId = session.parms?.get("station_id")?.toIntOrNull()

        // NanoHTTPD SSE via PipedStream
        val pipedOut = java.io.PipedOutputStream()
        val pipedIn = java.io.PipedInputStream(pipedOut)

        val client = SseClient(pipedOut, stationId)
        sseClients.add(client)
        Log.d(TAG, "SSE client connected (station=$stationId), total=${sseClients.size}")

        // Send initial event
        try {
            val connectData = """{"server_time":"${isoNow()}"}"""
            writeSseEvent(pipedOut, "connected", connectData)
        } catch (e: Exception) {
            sseClients.remove(client)
        }

        val sseResponse = newChunkedResponse(Response.Status.OK, "text/event-stream", pipedIn)
        sseResponse.addHeader("Cache-Control", "no-cache")
        sseResponse.addHeader("Connection", "keep-alive")
        addCorsHeaders(sseResponse)
        return sseResponse
    }

    private fun broadcastSse(eventType: String, data: String) {
        val deadClients = mutableListOf<SseClient>()
        for (client in sseClients) {
            try {
                writeSseEvent(client.output, eventType, data)
            } catch (e: Exception) {
                deadClients.add(client)
            }
        }
        sseClients.removeAll(deadClients.toSet())
    }

    private fun writeSseEvent(output: OutputStream, event: String, data: String) {
        val sseData = "event: $event\ndata: $data\n\n"
        output.write(sseData.toByteArray())
        output.flush()
    }

    // ── POST /kds/bump ──

    private fun handleBump(session: IHTTPSession): Response {
        val body = readBody(session)
        val json = JSONObject(body)
        val holdOrderId = json.getInt("hold_order_id")
        val lineId = json.optInt("line_id", -1)
        val targetStatus = json.optString("status", "ready")

        runBlocking {
            val orders = db.holdOrderDao().getAllHoldOrders()
            val order = orders.find { it.holdOrderId == holdOrderId }
                ?: throw Exception("Order $holdOrderId not found")

            val orderJson = order.json ?: throw Exception("Order has no JSON")
            val now = isoNow()

            if (lineId >= 0) {
                // Bump single item
                val items = orderJson.optJSONArray("items")
                    ?: throw Exception("Order has no items")
                if (lineId < items.length()) {
                    val item = items.getJSONObject(lineId)
                    item.put("item_status", targetStatus)
                    if (targetStatus == "ready" || targetStatus == "served") {
                        item.put("bumped_at", now)
                    }
                }
                KdsEventBus.emit(KdsEventBus.KdsEvent.ItemBumped(holdOrderId, lineId, targetStatus))
            } else {
                // Bump entire order
                val items = orderJson.optJSONArray("items")
                if (items != null) {
                    for (i in 0 until items.length()) {
                        val item = items.getJSONObject(i)
                        item.put("item_status", targetStatus)
                        if (targetStatus == "ready" || targetStatus == "served") {
                            item.put("bumped_at", now)
                        }
                    }
                }
                val orderStatus = when (targetStatus) {
                    "in_progress" -> "IN_PROGRESS"
                    "ready" -> "READY"
                    else -> "NEW"
                }
                orderJson.put("status", orderStatus)
                KdsEventBus.emit(KdsEventBus.KdsEvent.OrderBumped(holdOrderId, orderStatus))
            }

            val updated = order.copy(json = orderJson)
            db.holdOrderDao().insertHoldOrder(updated)
        }

        return jsonResponse(Response.Status.OK, """{"success":true}""")
    }

    // ── POST /kds/recall ──

    private fun handleRecall(session: IHTTPSession): Response {
        val body = readBody(session)
        val json = JSONObject(body)
        val holdOrderId = json.getInt("hold_order_id")

        runBlocking {
            val orders = db.holdOrderDao().getAllHoldOrders()
            val order = orders.find { it.holdOrderId == holdOrderId }
                ?: throw Exception("Order $holdOrderId not found")

            val orderJson = order.json ?: throw Exception("Order has no JSON")

            val items = orderJson.optJSONArray("items")
            if (items != null) {
                for (i in 0 until items.length()) {
                    val item = items.getJSONObject(i)
                    item.put("item_status", "new")
                    item.remove("bumped_at")
                }
            }
            orderJson.put("status", "NEW")

            val updated = order.copy(json = orderJson)
            db.holdOrderDao().insertHoldOrder(updated)
        }

        KdsEventBus.emit(KdsEventBus.KdsEvent.OrderRecalled(holdOrderId))
        return jsonResponse(Response.Status.OK, """{"success":true}""")
    }

    // ── GET /kds/stations ──

    private fun handleStations(): Response {
        val stations = runBlocking {
            val allOrders = db.holdOrderDao().getAllHoldOrders()
            val storeId = allOrders.firstOrNull()?.storeId ?: 0
            db.preparationStationDao().getStationsByStore(storeId)
        }

        val arr = org.json.JSONArray()
        for (s in stations) {
            arr.put(JSONObject().apply {
                put("station_id", s.station_id)
                put("name", s.name)
                put("station_type", s.station_type)
                put("color", s.color)
            })
        }

        return jsonResponse(Response.Status.OK, JSONObject().apply { put("stations", arr) }.toString())
    }

    // ── GET /kds/health ──

    private fun handleHealth(): Response {
        val uptime = (System.currentTimeMillis() - startTimeMs) / 1000
        return jsonResponse(Response.Status.OK, JSONObject().apply {
            put("status", "ok")
            put("port", listeningPort)
            put("uptime_seconds", uptime)
            put("sse_clients", sseClients.size)
        }.toString())
    }

    // ── Helpers ──

    private fun jsonResponse(status: Response.Status, body: String): Response {
        return newFixedLengthResponse(status, "application/json", body).apply {
            addCorsHeaders(this)
        }
    }

    private fun addCorsHeaders(response: Response) {
        response.addHeader("Access-Control-Allow-Origin", "*")
        response.addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        response.addHeader("Access-Control-Allow-Headers", "Content-Type")
    }

    private fun readBody(session: IHTTPSession): String {
        val contentLength = session.headers["content-length"]?.toIntOrNull() ?: 0
        val buffer = ByteArray(contentLength)
        session.inputStream.read(buffer, 0, contentLength)
        return String(buffer)
    }

    private fun isoNow(): String {
        return java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US)
            .format(java.util.Date())
    }
}
