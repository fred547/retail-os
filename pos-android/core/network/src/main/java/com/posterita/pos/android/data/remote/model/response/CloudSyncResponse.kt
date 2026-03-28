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
    @SerializedName("loyalty_configs") val loyaltyConfigs: List<Map<String, Any?>>? = null,
    @SerializedName("promotions") val promotions: List<Map<String, Any?>>? = null,
    @SerializedName("menu_schedules") val menuSchedules: List<Map<String, Any?>>? = null,
    @SerializedName("shifts") val shifts: List<Map<String, Any?>>? = null,
    @SerializedName("deliveries") val deliveries: List<Map<String, Any?>>? = null,
    @SerializedName("sibling_brands") val siblingBrands: List<Map<String, Any?>>? = null,
    @SerializedName("tax_config") val taxConfig: Map<String, Any?>? = null,
    @SerializedName("tag_groups") val tagGroups: List<Map<String, Any?>>? = null,
    @SerializedName("tags") val tags: List<Map<String, Any?>>? = null,
    @SerializedName("product_tags") val productTags: List<Map<String, Any?>>? = null,
    @SerializedName("quotations") val quotations: List<Map<String, Any?>>? = null,
    @SerializedName("quotation_lines") val quotationLines: List<Map<String, Any?>>? = null,

    // Pagination — indicates whether more pages are available
    @SerializedName("has_more_products") val hasMoreProducts: Boolean = false,
    @SerializedName("has_more_customers") val hasMoreCustomers: Boolean = false,
    @SerializedName("pull_page") val pullPage: Int = 0,
    @SerializedName("pull_page_size") val pullPageSize: Int = 1000,

    // Stats — push counts
    @SerializedName("orders_synced") val ordersSynced: Int = 0,
    @SerializedName("order_lines_synced") val orderLinesSynced: Int = 0,
    @SerializedName("payments_synced") val paymentsSynced: Int = 0,
    @SerializedName("tills_synced") val tillsSynced: Int = 0,
    @SerializedName("error_logs_synced") val errorLogsSynced: Int = 0,
    @SerializedName("inventory_entries_synced") val inventoryEntriesSynced: Int = 0,
    @SerializedName("serial_items_synced") val serialItemsSynced: Int = 0,
    @SerializedName("deliveries_synced") val deliveriesSynced: Int = 0,
    @SerializedName("conflicts_detected") val conflictsDetected: Int = 0,
    @SerializedName("errors") val errors: List<String>? = null,

    // Error (for non-200 responses)
    @SerializedName("error") val error: String? = null,
)
