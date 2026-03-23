package com.posterita.pos.android.kds

import com.posterita.pos.android.data.local.entity.HoldOrder
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Converts HoldOrder entities to KDS-friendly JSON payloads.
 */
object KdsOrderSerializer {

    private val isoFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)

    /**
     * Serialize a list of hold orders to the KDS orders response.
     */
    fun serializeOrders(orders: List<HoldOrder>, stationFilter: Int? = null): JSONObject {
        val ordersArray = JSONArray()
        for (order in orders) {
            val json = order.json ?: continue
            if (json.optBoolean("isKitchenOrder", false).not()) continue
            val serialized = serializeOrder(order, stationFilter)
            if (serialized != null) ordersArray.put(serialized)
        }
        return JSONObject().apply {
            put("orders", ordersArray)
            put("server_time", isoFormat.format(Date()))
        }
    }

    /**
     * Serialize a single hold order.
     * If stationFilter is set, only include items for that station.
     */
    fun serializeOrder(holdOrder: HoldOrder, stationFilter: Int? = null): JSONObject? {
        val json = holdOrder.json ?: return null
        val items = json.optJSONArray("items") ?: return null

        val now = System.currentTimeMillis()
        val createdAt = holdOrder.dateHold?.time ?: now
        val elapsedSeconds = (now - createdAt) / 1000

        val serializedItems = JSONArray()
        for (i in 0 until items.length()) {
            val item = items.optJSONObject(i) ?: continue
            val itemStationId = item.optInt("station_id", 0)

            // Apply station filter
            if (stationFilter != null && stationFilter > 0 && itemStationId != stationFilter) continue

            serializedItems.put(JSONObject().apply {
                put("line_id", i)
                put("product_name", item.optString("product_name", ""))
                put("quantity", item.optDouble("qty", 1.0))
                put("modifiers", item.optString("modifiers", ""))
                put("note", item.optString("note", ""))
                put("station_id", if (itemStationId > 0) itemStationId else JSONObject.NULL)
                put("station_name", item.optString("station_name", ""))
                put("item_status", item.optString("item_status", "new"))
                put("bumped_at", if (item.has("bumped_at")) item.optString("bumped_at") else JSONObject.NULL)
                put("is_kitchen_item", item.optString("isKitchenItem", "N"))
            })
        }

        // Skip if no items match the station filter
        if (serializedItems.length() == 0) return null

        return JSONObject().apply {
            put("hold_order_id", holdOrder.holdOrderId)
            put("table_name", json.optString("tableName", ""))
            put("section_name", json.optString("sectionName", ""))
            put("order_type", json.optString("orderType", "dine_in"))
            put("status", json.optString("status", "NEW"))
            put("created_at", isoFormat.format(Date(createdAt)))
            put("elapsed_seconds", elapsedSeconds)
            put("note", json.optString("note", ""))
            put("items", serializedItems)
        }
    }

    /**
     * Serialize a KDS event to SSE data format.
     */
    fun serializeEvent(event: KdsEventBus.KdsEvent): Pair<String, String>? {
        return when (event) {
            is KdsEventBus.KdsEvent.OrderCreated -> "order_new" to JSONObject().apply {
                put("hold_order_id", event.holdOrderId)
                put("table_name", event.tableName)
            }.toString()

            is KdsEventBus.KdsEvent.OrderUpdated -> "order_updated" to JSONObject().apply {
                put("hold_order_id", event.holdOrderId)
            }.toString()

            is KdsEventBus.KdsEvent.ItemBumped -> "item_status" to JSONObject().apply {
                put("hold_order_id", event.holdOrderId)
                put("line_id", event.lineIndex)
                put("status", event.newStatus)
            }.toString()

            is KdsEventBus.KdsEvent.OrderBumped -> "order_bump" to JSONObject().apply {
                put("hold_order_id", event.holdOrderId)
                put("status", event.newStatus)
            }.toString()

            is KdsEventBus.KdsEvent.OrderRecalled -> "order_recall" to JSONObject().apply {
                put("hold_order_id", event.holdOrderId)
            }.toString()

            is KdsEventBus.KdsEvent.OrderDeleted -> "order_deleted" to JSONObject().apply {
                put("hold_order_id", event.holdOrderId)
            }.toString()

            is KdsEventBus.KdsEvent.TableTransferred -> "table_transfer" to JSONObject().apply {
                put("hold_order_id", event.holdOrderId)
                put("from_table", event.fromTable)
                put("to_table", event.toTable)
            }.toString()

            is KdsEventBus.KdsEvent.OrderMerged -> "order_merge" to JSONObject().apply {
                put("source_order_id", event.sourceOrderId)
                put("target_order_id", event.targetOrderId)
            }.toString()

            is KdsEventBus.KdsEvent.Heartbeat -> "heartbeat" to JSONObject().apply {
                put("server_time", isoFormat.format(Date()))
            }.toString()
        }
    }
}
