package com.posterita.pos.android.data.remote.model.response

import com.google.gson.annotations.SerializedName

/**
 * Response from the cloud sync endpoint.
 * Contains data pulled from the server and sync stats.
 */
data class CloudSyncResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("server_time") val serverTime: String? = null,
    // Version info
    @SerializedName("server_sync_version") val serverSyncVersion: Int = 0,
    @SerializedName("min_client_version") val minClientVersion: Int = 0,

    // Pull: cloud → terminal
    @SerializedName("products") val products: List<Map<String, Any?>>? = null,
    @SerializedName("product_categories") val productCategories: List<Map<String, Any?>>? = null,
    @SerializedName("taxes") val taxes: List<Map<String, Any?>>? = null,
    @SerializedName("modifiers") val modifiers: List<Map<String, Any?>>? = null,
    @SerializedName("customers") val customers: List<Map<String, Any?>>? = null,
    @SerializedName("preferences") val preferences: List<Map<String, Any?>>? = null,
    @SerializedName("users") val users: List<Map<String, Any?>>? = null,
    @SerializedName("discount_codes") val discountCodes: List<Map<String, Any?>>? = null,
    @SerializedName("restaurant_tables") val restaurantTables: List<Map<String, Any?>>? = null,
    @SerializedName("stores") val stores: List<Map<String, Any?>>? = null,
    @SerializedName("terminals") val terminals: List<Map<String, Any?>>? = null,
    @SerializedName("inventory_sessions") val inventorySessions: List<Map<String, Any?>>? = null,
    @SerializedName("table_sections") val tableSections: List<Map<String, Any?>>? = null,
    @SerializedName("preparation_stations") val preparationStations: List<Map<String, Any?>>? = null,
    @SerializedName("category_station_mappings") val categoryStationMappings: List<Map<String, Any?>>? = null,
    @SerializedName("serial_items") val serialItems: List<Map<String, Any?>>? = null,
    @SerializedName("sibling_brands") val siblingBrands: List<Map<String, Any?>>? = null,
    @SerializedName("tax_config") val taxConfig: Map<String, Any?>? = null,

    // Stats
    @SerializedName("orders_synced") val ordersSynced: Int = 0,
    @SerializedName("order_lines_synced") val orderLinesSynced: Int = 0,
    @SerializedName("payments_synced") val paymentsSynced: Int = 0,
    @SerializedName("tills_synced") val tillsSynced: Int = 0,
    @SerializedName("errors") val errors: List<String>? = null,

    // Error (for non-200 responses)
    @SerializedName("error") val error: String? = null,
)
