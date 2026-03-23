package com.posterita.pos.android.util

import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.PreparationStation

/**
 * Resolves the preparation station for a product using priority:
 * 1. Product station override (product.station_override_id)
 * 2. Category mapping (category_station_mapping where category_id = product.productcategory_id)
 * 3. Default: first active kitchen station for the store
 *
 * Returns null if no station is configured (legacy single-printer mode).
 */
data class ResolvedStation(
    val stationId: Int,
    val stationName: String,
    val color: String
)

object StationResolver {

    /**
     * Resolve station for a single product.
     */
    suspend fun resolve(
        db: AppDatabase,
        accountId: String,
        storeId: Int,
        productCategoryId: Int,
        productStationOverrideId: Int?
    ): ResolvedStation? {
        // 1. Product-level override
        if (productStationOverrideId != null && productStationOverrideId > 0) {
            val station = db.preparationStationDao().getStationById(productStationOverrideId)
            if (station != null && station.is_active) {
                return ResolvedStation(station.station_id, station.name, station.color)
            }
        }

        // 2. Category mapping
        val mappedStationId = db.categoryStationMappingDao()
            .getStationForCategory(accountId, productCategoryId)
        if (mappedStationId != null) {
            val station = db.preparationStationDao().getStationById(mappedStationId)
            if (station != null && station.is_active) {
                return ResolvedStation(station.station_id, station.name, station.color)
            }
        }

        // 3. Default: first active kitchen station
        val defaultStations = db.preparationStationDao()
            .getStationsByType(PreparationStation.TYPE_KITCHEN, storeId)
        if (defaultStations.isNotEmpty()) {
            val s = defaultStations.first()
            return ResolvedStation(s.station_id, s.name, s.color)
        }

        // No stations configured — legacy mode
        return null
    }

    /**
     * Batch-resolve stations for all cart items.
     * Returns a map of product_id → ResolvedStation (null if no station).
     */
    suspend fun resolveForCart(
        db: AppDatabase,
        accountId: String,
        storeId: Int,
        items: List<CartItemRef>
    ): Map<Int, ResolvedStation?> {
        // Pre-load mappings and stations to avoid N+1 queries
        val allMappings = db.categoryStationMappingDao().getMappingsByAccount(accountId)
        val allStations = db.preparationStationDao().getStationsByStore(storeId)
        val stationMap = allStations.associateBy { it.station_id }
        val categoryToStation = allMappings.associate { it.category_id to it.station_id }
        val defaultKitchen = allStations.firstOrNull { it.station_type == PreparationStation.TYPE_KITCHEN }

        return items.associate { item ->
            val resolved = resolveFromCache(
                item.productStationOverrideId,
                item.productCategoryId,
                stationMap,
                categoryToStation,
                defaultKitchen
            )
            item.productId to resolved
        }
    }

    private fun resolveFromCache(
        overrideId: Int?,
        categoryId: Int,
        stationMap: Map<Int, PreparationStation>,
        categoryToStation: Map<Int, Int>,
        defaultKitchen: PreparationStation?
    ): ResolvedStation? {
        // 1. Product override
        if (overrideId != null && overrideId > 0) {
            val s = stationMap[overrideId]
            if (s != null && s.is_active) return ResolvedStation(s.station_id, s.name, s.color)
        }

        // 2. Category mapping
        val mappedId = categoryToStation[categoryId]
        if (mappedId != null) {
            val s = stationMap[mappedId]
            if (s != null && s.is_active) return ResolvedStation(s.station_id, s.name, s.color)
        }

        // 3. Default kitchen
        if (defaultKitchen != null && defaultKitchen.is_active) {
            return ResolvedStation(defaultKitchen.station_id, defaultKitchen.name, defaultKitchen.color)
        }

        return null
    }

    data class CartItemRef(
        val productId: Int,
        val productCategoryId: Int,
        val productStationOverrideId: Int?
    )
}
