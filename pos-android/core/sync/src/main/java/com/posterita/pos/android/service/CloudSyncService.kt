package com.posterita.pos.android.service

import android.util.Log
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import androidx.room.withTransaction
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.*
import com.posterita.pos.android.data.remote.CloudSyncApi
import com.posterita.pos.android.data.remote.model.request.*
import com.posterita.pos.android.data.remote.model.response.CloudSyncResponse
import com.posterita.pos.android.util.SharedPreferencesManager
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.*
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Handles bidirectional sync between the local Room database and Posterita Cloud (Supabase).
 *
 * Sync strategy:
 * - Every 5 minutes (via CloudSyncWorker) for regular background sync
 * - Immediately after order completion for critical data
 * - On-demand via manual trigger
 *
 * Push (terminal → cloud): unsynced orders, order lines, payments, closed tills, new customers
 * Pull (cloud → terminal): products, categories, taxes, modifiers, preferences, users, etc.
 */
@Singleton
class CloudSyncService @Inject constructor(
    private val db: AppDatabase,
    private val prefsManager: SharedPreferencesManager
) {
    companion object {
        private const val TAG = "CloudSyncService"
        private const val CLOUD_SYNC_DATE_KEY_PREFIX = "cloud_last_sync_at_"

        /** Per-account sync timestamp key */
        fun syncDateKey(accountId: String): String = "$CLOUD_SYNC_DATE_KEY_PREFIX$accountId"
    }

    private val objectMapper = ObjectMapper().apply {
        registerKotlinModule()
        configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
    }

    private val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
        timeZone = TimeZone.getTimeZone("UTC")
    }

    private val timestampFormat = SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)

    /**
     * Whether cloud sync is enabled (account has been linked to cloud).
     */
    fun isCloudSyncEnabled(): Boolean {
        return prefsManager.cloudSyncEnabled && prefsManager.accountId.isNotEmpty()
    }

    /**
     * Perform a full bidirectional sync.
     * @param cloudSyncApi The Retrofit interface (created by the worker since it's not a singleton)
     * @return Result with sync stats or error
     */
    suspend fun performSync(cloudSyncApi: CloudSyncApi): Result<SyncStats> {
        val startTime = System.currentTimeMillis()
        return try {
            val accountId = prefsManager.accountId

            if (accountId.isEmpty()) {
                return Result.failure(Exception("No account configured"))
            }

            // Resolve store/terminal context — validate against this brand's Room DB
            // Priority: prefs value (set by CloudSyncWorker per-brand) → DB lookup → first active
            val prefsStoreId = prefsManager.storeId
            val prefsTerminalId = prefsManager.terminalId

            val resolvedStore = when {
                prefsStoreId > 0 -> db.storeDao().getStoreById(prefsStoreId)
                else -> null
            } ?: db.storeDao().getAllStores().firstOrNull() // fallback: first active store

            val resolvedTerminal = when {
                prefsTerminalId > 0 -> db.terminalDao().getTerminalById(prefsTerminalId)
                else -> null
            } ?: resolvedStore?.let {
                db.terminalDao().getTerminalsForStore(it.storeId).firstOrNull()
            } ?: db.terminalDao().getAllTerminals().firstOrNull()

            val storeId = resolvedStore?.storeId ?: 0
            val terminalId = resolvedTerminal?.terminalId ?: 0

            // Log context resolution for debugging
            if (storeId == 0) {
                Log.w(TAG, "No store found for account $accountId (prefs=$prefsStoreId)")
            } else if (prefsStoreId > 0 && prefsStoreId != storeId) {
                Log.w(TAG, "Store mismatch: prefs=$prefsStoreId, resolved=$storeId (account=$accountId)")
            }
            if (terminalId == 0) {
                Log.w(TAG, "No terminal found for account $accountId (prefs=$prefsTerminalId)")
            } else if (prefsTerminalId > 0 && prefsTerminalId != terminalId) {
                Log.w(TAG, "Terminal mismatch: prefs=$prefsTerminalId, resolved=$terminalId (account=$accountId)")
            }

            SyncStatusManager.update(
                SyncStatusManager.SyncState.CONNECTING,
                "Connecting to cloud..."
            )

            var lastSyncAt = prefsManager.getString(syncDateKey(accountId), "1970-01-01T00:00:00.000Z")

            // Integrity check: if local DB is empty but we've synced before, reset to epoch
            // This catches cases where prefs were wiped, DB was cleared, or login on new device
            if (lastSyncAt != "1970-01-01T00:00:00.000Z") {
                val localProductCount = try { db.productDao().getAllProductsSync().size } catch (_: Exception) { 0 }
                if (localProductCount == 0) {
                    Log.w(TAG, "Integrity check: 0 local products but last_sync_at=$lastSyncAt — resetting to epoch for full pull")
                    lastSyncAt = "1970-01-01T00:00:00.000Z"
                    prefsManager.setString(syncDateKey(accountId), lastSyncAt)
                }
            }

            // Collect local data to push
            val unsyncedOrders = db.orderDao().getUnSyncedOrders()
            // Sync both open and closed tills (open = header only, closed = full amounts)
            // Use getAllUnsyncedTills() — not filtered by terminal_id, since the till may have
            // been opened before terminal was synced or with a different terminal context
            val unsyncedTills = db.tillDao().getAllUnsyncedTills()

            // Report pending counts to UI
            SyncStatusManager.updatePendingCounts(unsyncedOrders.size, unsyncedTills.size)

            // Collect order lines and payments for unsynced orders
            val orderLines = mutableListOf<OrderLine>()
            val payments = mutableListOf<Payment>()
            for (order in unsyncedOrders) {
                orderLines.addAll(db.orderLineDao().getOrderLinesByOrderId(order.orderId))
                payments.addAll(db.paymentDao().getPaymentsByOrderId(order.orderId))
            }

            // Collect customers to push (all active customers)
            val allCustomers = db.customerDao().getAllCustomersSync()

            // Report push status with counts
            val totalOrderCount = db.orderDao().getOrderCount()
            val totalTillCount = db.tillDao().getClosedTillByTerminalId(terminalId).size

            if (unsyncedOrders.isNotEmpty()) {
                SyncStatusManager.update(
                    SyncStatusManager.SyncState.PUSHING_ORDERS,
                    "↑ Uploading ${unsyncedOrders.size} orders...",
                    "${unsyncedOrders.size}/${totalOrderCount} orders, ${orderLines.size} lines",
                    percent = 10
                )
            }
            if (unsyncedTills.isNotEmpty()) {
                SyncStatusManager.update(
                    SyncStatusManager.SyncState.PUSHING_TILLS,
                    "↑ Uploading ${unsyncedTills.size} tills...",
                    "${unsyncedTills.size}/${totalTillCount} tills",
                    percent = 15
                )
            }

            // Master data (products, categories, taxes, stores, terminals, users) is SERVER-AUTHORITATIVE.
            // Android NEVER pushes master data — it only pulls. This prevents empty local DBs
            // from overwriting server data. Master data is managed via web console + API routes.
            // Only transactional data (orders, tills, customers, error logs, inventory entries)
            // flows from device → cloud.

            // Collect unsynced inventory count entries
            val unsyncedInventoryEntries = db.inventoryCountEntryDao().getUnsyncedEntries()

            // Collect unsynced serial items (sold/delivered/returned status changes)
            val unsyncedSerialItems = db.serialItemDao().getUnsyncedItems()

            // Collect unsynced error logs
            val unsyncedErrorLogs = db.errorLogDao().getUnsyncedLogs()

            // Collect locally-created deliveries (id=0 means not yet on server)
            val unsyncedDeliveries = db.deliveryDao().getUnsyncedDeliveries(accountId)

            // Build sync request with device registration
            val syncDeviceId = prefsManager.getString("device_id", "").ifEmpty {
                val id = "dev_${System.currentTimeMillis()}_${terminalId}"
                prefsManager.setStringSync("device_id", id)
                id
            }

            // Compute payload checksum for integrity verification
            val checksumInput = buildString {
                unsyncedOrders.sortedBy { it.uuid }.forEach { o ->
                    append("O:${o.uuid}:${o.grandTotal};")
                }
                unsyncedTills.sortedBy { it.uuid }.forEach { t ->
                    append("T:${t.uuid}:${t.openingAmt}:${t.grandtotal};")
                }
            }
            val payloadChecksum = if (checksumInput.isNotEmpty()) {
                java.security.MessageDigest.getInstance("SHA-256")
                    .digest(checksumInput.toByteArray())
                    .joinToString("") { "%02x".format(it) }
            } else null

            val request = CloudSyncRequest(
                accountId = accountId,
                terminalId = terminalId,
                storeId = storeId,
                lastSyncAt = lastSyncAt,
                deviceId = syncDeviceId,
                deviceModel = android.os.Build.MODEL,
                deviceName = android.os.Build.DEVICE,
                osVersion = "Android ${android.os.Build.VERSION.RELEASE}",
                orders = if (unsyncedOrders.isNotEmpty()) unsyncedOrders.map { it.toSyncOrder() } else null,
                orderLines = if (orderLines.isNotEmpty()) orderLines.map { it.toSyncOrderLine() } else null,
                payments = if (payments.isNotEmpty()) payments.map { it.toSyncPayment() } else null,
                tills = if (unsyncedTills.isNotEmpty()) unsyncedTills.map { it.toSyncTill() } else null,
                customers = if (allCustomers.isNotEmpty()) allCustomers.map { it.toSyncCustomer() } else null,
                inventoryCountEntries = if (unsyncedInventoryEntries.isNotEmpty()) unsyncedInventoryEntries.map { it.toSyncInventoryCountEntry() } else null,
                errorLogs = if (unsyncedErrorLogs.isNotEmpty()) unsyncedErrorLogs.map { it.toSyncErrorLog() } else null,
                serialItems = if (unsyncedSerialItems.isNotEmpty()) unsyncedSerialItems.map { it.toSyncSerialItem() } else null,
                deliveries = if (unsyncedDeliveries.isNotEmpty()) unsyncedDeliveries.map { it.toSyncDelivery() } else null,
                payloadChecksum = payloadChecksum,
            )

            Log.d(TAG, "Syncing: ${unsyncedOrders.size} orders, ${orderLines.size} lines, ${unsyncedTills.size} tills")

            SyncStatusManager.update(
                SyncStatusManager.SyncState.CONNECTING,
                "Sending to cloud...",
                percent = 20
            )

            // Call the cloud sync API
            val response = cloudSyncApi.sync(request)

            if (!response.isSuccessful) {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                val msg = "Sync failed (${response.code()}): $errorBody"
                SyncStatusManager.error(msg)
                return Result.failure(Exception(msg))
            }

            val syncResponse = response.body()
                ?: return Result.failure(Exception("Empty sync response").also {
                    SyncStatusManager.error("Empty response from server")
                })

            // Check version compatibility
            if (syncResponse.serverSyncVersion > 0) {
                val clientVersion = com.posterita.pos.android.data.remote.model.request.SYNC_VERSION
                if (clientVersion < syncResponse.minClientVersion) {
                    Log.w(TAG, "Client sync version $clientVersion is below server minimum ${syncResponse.minClientVersion}")
                    SyncStatusManager.error("App update required — please update Posterita to continue syncing")
                    return Result.failure(Exception("Client too old: v$clientVersion < min v${syncResponse.minClientVersion}"))
                }
                if (syncResponse.serverSyncVersion > clientVersion) {
                    Log.i(TAG, "Server sync version ${syncResponse.serverSyncVersion} > client $clientVersion — update recommended")
                }
            }

            // Process the response with detailed progress
            processSyncResponse(syncResponse, unsyncedOrders, unsyncedTills)

            // Paginated pull: if server indicates more pages, fetch them (pull-only, no push data)
            var currentPage = syncResponse.pullPage
            var hasMoreProducts = syncResponse.hasMoreProducts
            var hasMoreCustomers = syncResponse.hasMoreCustomers
            while (hasMoreProducts || hasMoreCustomers) {
                currentPage++
                Log.d(TAG, "Fetching pull page $currentPage (moreProducts=$hasMoreProducts, moreCustomers=$hasMoreCustomers)")
                SyncStatusManager.update(
                    SyncStatusManager.SyncState.PULLING_PRODUCTS,
                    "↓ Fetching page ${currentPage + 1}...",
                    percent = 60
                )
                val pageRequest = CloudSyncRequest(
                    accountId = accountId,
                    terminalId = terminalId,
                    storeId = storeId,
                    lastSyncAt = lastSyncAt,
                    pullPage = currentPage,
                    pullPageSize = syncResponse.pullPageSize,
                )
                val pageResponse = cloudSyncApi.sync(pageRequest)
                if (!pageResponse.isSuccessful) {
                    Log.w(TAG, "Paginated pull page $currentPage failed: ${pageResponse.code()}")
                    break
                }
                val pageBody = pageResponse.body() ?: break
                processSyncResponse(pageBody, emptyList(), emptyList())
                hasMoreProducts = pageBody.hasMoreProducts
                hasMoreCustomers = pageBody.hasMoreCustomers
            }

            // Save sibling brands for the worker to register
            lastSiblingBrands = syncResponse.siblingBrands

            // Mark inventory count entries as synced
            if (unsyncedInventoryEntries.isNotEmpty()) {
                db.inventoryCountEntryDao().markSynced(unsyncedInventoryEntries.map { it.entry_id })
            }

            // Delete locally-created deliveries (id=0) after successful push
            // Server creates them with real IDs — they'll be pulled back on next sync
            if (unsyncedDeliveries.isNotEmpty()) {
                db.deliveryDao().deleteUnsyncedByAccount(accountId)
                Log.d(TAG, "Pushed ${unsyncedDeliveries.size} deliveries, cleared local stubs")
            }

            // Update local Account with BRN/TAN from tax config (for receipt printing)
            syncResponse.taxConfig?.let { tc ->
                val brn = tc["brn"] as? String
                val tan = tc["tan"] as? String
                val enabled = tc["is_enabled"] == true
                if (enabled && (brn != null || tan != null)) {
                    try {
                        val account = db.accountDao().getAccountById(accountId)
                        if (account != null && (account.brn != brn || account.tan != tan)) {
                            db.accountDao().insertAccounts(listOf(account.copy(brn = brn, tan = tan)))
                            Log.d(TAG, "Updated Account BRN=$brn TAN=$tan")
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Failed to update account tax info: ${e.message}")
                    }
                }
            }

            // Mark error logs as synced and clean up old ones
            if (unsyncedErrorLogs.isNotEmpty()) {
                db.errorLogDao().markSynced(unsyncedErrorLogs.map { it.id })
                val cutoff = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000L)
                db.errorLogDao().deleteOldSyncedLogs(cutoff)
            }

            // Update last sync timestamp
            val syncTime = System.currentTimeMillis()
            syncResponse.serverTime?.let {
                prefsManager.setString(syncDateKey(accountId), it)
            }

            val stats = SyncStats(
                ordersPushed = syncResponse.ordersSynced,
                tillsPushed = syncResponse.tillsSynced,
                productsPulled = syncResponse.products?.size ?: 0,
                categoriesPulled = syncResponse.productCategories?.size ?: 0,
                taxesPulled = syncResponse.taxes?.size ?: 0,
                customersPulled = syncResponse.customers?.size ?: 0,
                errors = syncResponse.errors ?: emptyList()
            )

            // Emit completion with full summary
            val summary = SyncStatusManager.SyncSummary(
                ordersPushed = syncResponse.ordersSynced,
                orderLinesPushed = syncResponse.orderLinesSynced,
                tillsPushed = syncResponse.tillsSynced,
                productsPulled = syncResponse.products?.size ?: 0,
                categoriesPulled = syncResponse.productCategories?.size ?: 0,
                taxesPulled = syncResponse.taxes?.size ?: 0,
                modifiersPulled = syncResponse.modifiers?.size ?: 0,
                customersPulled = syncResponse.customers?.size ?: 0,
                usersPulled = syncResponse.users?.size ?: 0,
                storesPulled = syncResponse.stores?.size ?: 0,
                terminalsPulled = syncResponse.terminals?.size ?: 0,
                discountCodesPulled = syncResponse.discountCodes?.size ?: 0,
                preferencesPulled = syncResponse.preferences?.size ?: 0,
                tablesPulled = syncResponse.restaurantTables?.size ?: 0,
                sectionsPulled = syncResponse.tableSections?.size ?: 0,
                stationsPulled = syncResponse.preparationStations?.size ?: 0,
                errors = syncResponse.errors ?: emptyList(),
                durationMs = System.currentTimeMillis() - startTime,
            )
            SyncStatusManager.complete(summary, syncTime)

            Log.d(TAG, "Sync complete: $stats")
            if (stats.errors.isNotEmpty()) {
                Log.w(TAG, "Sync errors: ${stats.errors.joinToString("; ")}")
                // Persist sync errors to error_logs table for visibility
                try {
                    val errorLog = com.posterita.pos.android.data.local.entity.ErrorLog(
                        accountId = accountId,
                        severity = "WARNING",
                        tag = "CloudSync",
                        message = "Sync completed with ${stats.errors.size} error(s): ${stats.errors.take(3).joinToString("; ")}",
                        stacktrace = stats.errors.joinToString("\n"),
                        screen = "CloudSyncService",
                        terminalId = terminalId,
                        storeId = storeId
                    )
                    db.errorLogDao().insert(errorLog)
                } catch (_: Exception) {}
            }

            // Update pending counts after sync
            val remainingOrders = db.orderDao().getUnSyncedOrders().size
            val remainingTills = db.tillDao().getAllUnsyncedTills().size
            SyncStatusManager.updatePendingCounts(remainingOrders, remainingTills)

            Result.success(stats)
        } catch (e: Exception) {
            Log.e(TAG, "Cloud sync failed", e)
            SyncStatusManager.error(e.message ?: "Unknown error")
            // Log fatal sync errors to DB
            try {
                val errorLog = com.posterita.pos.android.data.local.entity.ErrorLog(
                    accountId = prefsManager.accountId,
                    severity = "ERROR",
                    tag = "CloudSync",
                    message = "Sync failed: ${e.message}",
                    stacktrace = e.stackTraceToString().take(2000),
                    screen = "CloudSyncService"
                )
                db.errorLogDao().insert(errorLog)
            } catch (_: Exception) {}
            Result.failure(e)
        }
    }

    /**
     * Quick sync — only push unsynced orders immediately (called after order completion).
     */
    suspend fun pushOrdersNow(cloudSyncApi: CloudSyncApi): Result<Int> {
        return try {
            val accountId = prefsManager.accountId
            val terminalId = prefsManager.terminalId
            val storeId = prefsManager.storeId

            if (accountId.isEmpty() || terminalId == 0) {
                return Result.failure(Exception("Not configured"))
            }

            val unsyncedOrders = db.orderDao().getUnSyncedOrders()
            if (unsyncedOrders.isEmpty()) return Result.success(0)

            val orderLines = mutableListOf<OrderLine>()
            for (order in unsyncedOrders) {
                orderLines.addAll(db.orderLineDao().getOrderLinesByOrderId(order.orderId))
            }

            val lastSyncAt = prefsManager.getString(syncDateKey(accountId), "1970-01-01T00:00:00.000Z")

            val request = CloudSyncRequest(
                accountId = accountId,
                terminalId = terminalId,
                storeId = storeId,
                lastSyncAt = lastSyncAt,
                orders = unsyncedOrders.map { it.toSyncOrder() },
                orderLines = if (orderLines.isNotEmpty()) orderLines.map { it.toSyncOrderLine() } else null,
            )

            val response = cloudSyncApi.sync(request)
            if (!response.isSuccessful) {
                return Result.failure(Exception("Push failed: ${response.code()}"))
            }

            val syncResponse = response.body() ?: return Result.failure(Exception("Empty response"))

            // Mark orders as synced
            if (syncResponse.ordersSynced > 0) {
                for (order in unsyncedOrders) {
                    db.orderDao().updateOrder(order.copy(isSync = true))
                }
            }

            // Also process any pulled data
            processSyncResponse(syncResponse, unsyncedOrders, emptyList())

            syncResponse.serverTime?.let {
                prefsManager.setString(syncDateKey(accountId), it)
            }

            Log.d(TAG, "Quick sync: pushed ${syncResponse.ordersSynced} orders")
            Result.success(syncResponse.ordersSynced)
        } catch (e: Exception) {
            Log.e(TAG, "Quick order sync failed", e)
            Result.failure(e)
        }
    }

    /**
     * Process the sync response: mark pushed items as synced, insert pulled data.
     */
    private suspend fun processSyncResponse(
        response: CloudSyncResponse,
        pushedOrders: List<Order>,
        pushedTills: List<Till>
    ) {
        // Mark pushed orders as synced
        // If server synced fewer than we pushed, some failed — record error on unsynced ones
        val serverErrors = response.errors ?: emptyList()
        if (response.ordersSynced > 0) {
            for (order in pushedOrders) {
                val errorForOrder = serverErrors.find { it.contains(order.uuid ?: "") }
                if (errorForOrder != null) {
                    // This specific order failed — record the error but don't mark as synced
                    Log.w(TAG, "Order ${order.uuid} failed: $errorForOrder")
                } else {
                    db.orderDao().updateOrder(order.copy(isSync = true))
                }
            }
        } else if (pushedOrders.isNotEmpty() && response.ordersSynced == 0) {
            // All orders failed — log but don't mark as synced (will retry next cycle)
            Log.w(TAG, "All ${pushedOrders.size} orders failed to sync")
        }

        // Mark pushed tills as synced (both open and closed).
        // Open till: syncs once at open → isSync=true. When closed, TillService
        // sets isSync=false → triggers second sync pass with final amounts.
        if (response.tillsSynced > 0) {
            for (till in pushedTills) {
                val errorForTill = serverErrors.find { it.contains(till.uuid ?: "") }
                if (errorForTill != null) {
                    db.tillDao().updateTill(till.copy(syncErrorMessage = errorForTill))
                    Log.w(TAG, "Till ${till.uuid} failed: $errorForTill")
                } else {
                    db.tillDao().updateTill(till.copy(isSync = true, syncErrorMessage = null))
                }
            }
        } else if (pushedTills.isNotEmpty() && response.tillsSynced == 0) {
            Log.w(TAG, "All ${pushedTills.size} tills failed to sync")
        }

        // Pull: insert/update server data into local Room database
        // Calculate total items for progress reporting
        val totalPullItems = (response.products?.size ?: 0) +
                (response.productCategories?.size ?: 0) +
                (response.taxes?.size ?: 0) +
                (response.modifiers?.size ?: 0) +
                (response.customers?.size ?: 0) +
                (response.users?.size ?: 0) +
                (response.discountCodes?.size ?: 0) +
                (response.preferences?.size ?: 0) +
                (response.restaurantTables?.size ?: 0) +
                (response.tableSections?.size ?: 0) +
                (response.preparationStations?.size ?: 0) +
                (response.categoryStationMappings?.size ?: 0)
        var processedItems = 0

        SyncStatusManager.update(
            SyncStatusManager.SyncState.SAVING,
            "↓ Receiving $totalPullItems items from cloud...",
            "0/$totalPullItems saved",
            percent = 50
        )

        db.withTransaction {
            // Products
            response.products?.let { list ->
                if (list.isNotEmpty()) {
                    val pct = 50 + (processedItems * 50 / totalPullItems.coerceAtLeast(1))
                    SyncStatusManager.update(SyncStatusManager.SyncState.PULLING_PRODUCTS,
                        "↓ Saving ${list.size} products...",
                        "$processedItems/$totalPullItems", percent = pct)
                    val products = list.mapNotNull { mapToProduct(it) }
                    if (products.isNotEmpty()) {
                        db.productDao().insertProducts(products)
                        Log.d(TAG, "Pulled ${products.size} products")
                    }
                    processedItems += list.size
                }
            }

            // Categories
            response.productCategories?.let { list ->
                if (list.isNotEmpty()) {
                    val pct = 50 + (processedItems * 50 / totalPullItems.coerceAtLeast(1))
                    SyncStatusManager.update(SyncStatusManager.SyncState.PULLING_CATEGORIES,
                        "↓ Saving ${list.size} categories...",
                        "$processedItems/$totalPullItems", percent = pct)
                    val categories = list.mapNotNull { mapToCategory(it) }
                    if (categories.isNotEmpty()) {
                        db.productCategoryDao().insertProductCategories(categories)
                        Log.d(TAG, "Pulled ${categories.size} categories")
                    }
                    processedItems += list.size
                }
            }

            // Taxes
            response.taxes?.let { list ->
                if (list.isNotEmpty()) {
                    val pct = 50 + (processedItems * 50 / totalPullItems.coerceAtLeast(1))
                    SyncStatusManager.update(SyncStatusManager.SyncState.PULLING_TAXES,
                        "↓ Saving ${list.size} taxes...",
                        "$processedItems/$totalPullItems", percent = pct)
                    val taxes = list.mapNotNull { mapToTax(it) }
                    if (taxes.isNotEmpty()) {
                        db.taxDao().insertTaxes(taxes)
                        Log.d(TAG, "Pulled ${taxes.size} taxes")
                    }
                    processedItems += list.size
                }
            }

            // Modifiers
            response.modifiers?.let { list ->
                if (list.isNotEmpty()) {
                    val pct = 50 + (processedItems * 50 / totalPullItems.coerceAtLeast(1))
                    SyncStatusManager.update(SyncStatusManager.SyncState.PULLING_MODIFIERS,
                        "↓ Saving ${list.size} modifiers...",
                        "$processedItems/$totalPullItems", percent = pct)
                    val modifiers = list.mapNotNull { mapToModifier(it) }
                    if (modifiers.isNotEmpty()) {
                        db.modifierDao().insertModifiers(modifiers)
                        Log.d(TAG, "Pulled ${modifiers.size} modifiers")
                    }
                    processedItems += list.size
                }
            }

            // Customers
            response.customers?.let { list ->
                if (list.isNotEmpty()) {
                    val pct = 50 + (processedItems * 50 / totalPullItems.coerceAtLeast(1))
                    SyncStatusManager.update(SyncStatusManager.SyncState.PULLING_CUSTOMERS,
                        "↓ Saving ${list.size} customers...",
                        "$processedItems/$totalPullItems", percent = pct)
                    val customers = list.mapNotNull { mapToCustomer(it) }
                    if (customers.isNotEmpty()) {
                        db.customerDao().insertCustomers(customers)
                        Log.d(TAG, "Pulled ${customers.size} customers")
                    }
                    processedItems += list.size
                }
            }

            // Users
            response.users?.let { list ->
                if (list.isNotEmpty()) {
                    val pct = 50 + (processedItems * 50 / totalPullItems.coerceAtLeast(1))
                    SyncStatusManager.update(SyncStatusManager.SyncState.PULLING_USERS,
                        "↓ Saving ${list.size} users...",
                        "$processedItems/$totalPullItems", percent = pct)
                    val users = list.mapNotNull { mapToUser(it) }
                    if (users.isNotEmpty()) {
                        db.userDao().insertUsers(users)
                        Log.d(TAG, "Pulled ${users.size} users")
                    }
                    processedItems += list.size
                }
            }

            // Discount codes
            response.discountCodes?.let { list ->
                if (list.isNotEmpty()) {
                    val codes = list.mapNotNull { mapToDiscountCode(it) }
                    if (codes.isNotEmpty()) {
                        db.discountCodeDao().insertDiscountCodes(codes)
                        Log.d(TAG, "Pulled ${codes.size} discount codes")
                    }
                    processedItems += list.size
                }
            }

            // Preferences
            response.preferences?.let { list ->
                if (list.isNotEmpty()) {
                    val prefs = list.mapNotNull { mapToPreference(it) }
                    if (prefs.isNotEmpty()) {
                        db.preferenceDao().insertPreferences(prefs)
                        Log.d(TAG, "Pulled ${prefs.size} preferences")
                    }
                    processedItems += list.size
                }
            }

            // Restaurant tables
            response.restaurantTables?.let { list ->
                if (list.isNotEmpty()) {
                    val tables = list.mapNotNull { mapToRestaurantTable(it) }
                    if (tables.isNotEmpty()) {
                        db.restaurantTableDao().insertTables(tables)
                        Log.d(TAG, "Pulled ${tables.size} restaurant tables")
                    }
                    processedItems += list.size
                }
            }

            // Table sections
            response.tableSections?.let { list ->
                if (list.isNotEmpty()) {
                    val sections = list.mapNotNull { mapToTableSection(it) }
                    if (sections.isNotEmpty()) {
                        db.tableSectionDao().insertAll(sections)
                        Log.d(TAG, "Pulled ${sections.size} table sections")
                    }
                    processedItems += list.size
                }
            }

            // Preparation stations
            response.preparationStations?.let { list ->
                if (list.isNotEmpty()) {
                    val stations = list.mapNotNull { mapToPreparationStation(it) }
                    if (stations.isNotEmpty()) {
                        db.preparationStationDao().insertAll(stations)
                        Log.d(TAG, "Pulled ${stations.size} preparation stations")
                    }
                    processedItems += list.size
                }
            }

            // Category station mappings (full replace for consistency)
            response.categoryStationMappings?.let { list ->
                db.categoryStationMappingDao().deleteByAccount(prefsManager.accountId)
                if (list.isNotEmpty()) {
                    val mappings = list.mapNotNull { mapToCategoryStationMapping(it) }
                    if (mappings.isNotEmpty()) {
                        db.categoryStationMappingDao().insertAll(mappings)
                        Log.d(TAG, "Pulled ${mappings.size} category station mappings")
                    }
                    processedItems += list.size
                }
            }

            // Serial items (VIN/IMEI/serial tracked inventory)
            response.serialItems?.let { list ->
                if (list.isNotEmpty()) {
                    val items = list.mapNotNull { mapToSerialItem(it) }
                    if (items.isNotEmpty()) {
                        db.serialItemDao().insertAll(items)
                        Log.d(TAG, "Pulled ${items.size} serial items")
                    }
                    processedItems += list.size
                }
            }

            // Stores
            response.stores?.let { list ->
                if (list.isNotEmpty()) {
                    val stores = list.mapNotNull { mapToStore(it) }
                    if (stores.isNotEmpty()) {
                        db.storeDao().insertStores(stores)
                        Log.d(TAG, "Pulled ${stores.size} stores")
                    }
                }
            }

            // Terminals
            response.terminals?.let { list ->
                if (list.isNotEmpty()) {
                    val terminals = list.mapNotNull { mapToTerminal(it) }
                    if (terminals.isNotEmpty()) {
                        db.terminalDao().insertTerminals(terminals)
                        Log.d(TAG, "Pulled ${terminals.size} terminals")
                    }
                }
            }

            // Inventory count sessions
            response.inventorySessions?.let { list ->
                if (list.isNotEmpty()) {
                    val sessions = list.mapNotNull { mapToInventoryCountSession(it) }
                    if (sessions.isNotEmpty()) {
                        db.inventoryCountSessionDao().insertSessions(sessions)
                        Log.d(TAG, "Pulled ${sessions.size} inventory count sessions")
                    }
                }
            }

            // Loyalty config (full replace per account)
            response.loyaltyConfigs?.let { list ->
                db.loyaltyConfigDao().deleteByAccount(prefsManager.accountId)
                if (list.isNotEmpty()) {
                    val configs = list.mapNotNull { mapToLoyaltyConfig(it) }
                    if (configs.isNotEmpty()) {
                        db.loyaltyConfigDao().insertAll(configs)
                        Log.d(TAG, "Pulled ${configs.size} loyalty configs")
                    }
                }
            }

            // Promotions
            response.promotions?.let { list ->
                if (list.isNotEmpty()) {
                    val promotions = list.mapNotNull { mapToPromotion(it) }
                    if (promotions.isNotEmpty()) {
                        db.promotionDao().insertAll(promotions)
                        Log.d(TAG, "Pulled ${promotions.size} promotions")
                    }
                    processedItems += list.size
                }
            }

            // Menu schedules
            response.menuSchedules?.let { list ->
                if (list.isNotEmpty()) {
                    val schedules = list.mapNotNull { mapToMenuSchedule(it) }
                    if (schedules.isNotEmpty()) {
                        db.menuScheduleDao().insertAll(schedules)
                        Log.d(TAG, "Pulled ${schedules.size} menu schedules")
                    }
                    processedItems += list.size
                }
            }

            // Shifts
            response.shifts?.let { list ->
                if (list.isNotEmpty()) {
                    val shifts = list.mapNotNull { mapToShift(it) }
                    if (shifts.isNotEmpty()) {
                        db.shiftDao().insertAll(shifts)
                        Log.d(TAG, "Pulled ${shifts.size} shifts")
                    }
                    processedItems += list.size
                }
            }

            // Deliveries
            response.deliveries?.let { list ->
                if (list.isNotEmpty()) {
                    val deliveries = list.mapNotNull { mapToDelivery(it) }
                    if (deliveries.isNotEmpty()) {
                        db.deliveryDao().insertAll(deliveries)
                        Log.d(TAG, "Pulled ${deliveries.size} deliveries")
                    }
                    processedItems += list.size
                }
            }

            // Tag groups (full replace per account)
            response.tagGroups?.let { list ->
                db.tagGroupDao().deleteByAccount(prefsManager.accountId)
                if (list.isNotEmpty()) {
                    val groups = list.mapNotNull { mapToTagGroup(it) }
                    if (groups.isNotEmpty()) {
                        db.tagGroupDao().insertAll(groups)
                        Log.d(TAG, "Pulled ${groups.size} tag groups")
                    }
                }
            }

            // Tags (full replace per account)
            response.tags?.let { list ->
                db.tagDao().deleteByAccount(prefsManager.accountId)
                if (list.isNotEmpty()) {
                    val tags = list.mapNotNull { mapToTag(it) }
                    if (tags.isNotEmpty()) {
                        db.tagDao().insertAll(tags)
                        Log.d(TAG, "Pulled ${tags.size} tags")
                    }
                }
            }

            // Product tags (full replace per account)
            response.productTags?.let { list ->
                db.productTagDao().deleteByAccount(prefsManager.accountId)
                if (list.isNotEmpty()) {
                    val productTags = list.mapNotNull { mapToProductTag(it) }
                    if (productTags.isNotEmpty()) {
                        db.productTagDao().insertAll(productTags)
                        Log.d(TAG, "Pulled ${productTags.size} product tags")
                    }
                }
            }

        }
    }

    /** Returns sibling brands from the last sync response (for worker to register) */
    var lastSiblingBrands: List<Map<String, Any?>>? = null
        private set

    // ========================================
    // Entity → SyncModel mappers (push)
    // ========================================

    private fun Order.toSyncOrder(): SyncOrder {
        val jsonMap: Map<String, Any?>? = this.json?.let {
            try {
                @Suppress("UNCHECKED_CAST")
                objectMapper.readValue(it.toString(), Map::class.java) as Map<String, Any?>
            } catch (e: Exception) {
                null
            }
        }

        return SyncOrder(
            orderId = orderId,
            customerId = customerId,
            salesRepId = salesRepId,
            tillId = tillId,
            tillUuid = tillUuid,
            terminalId = terminalId,
            storeId = storeId,
            orderType = orderType,
            documentNo = documentNo,
            docStatus = docStatus,
            isPaid = isPaid,
            taxTotal = taxTotal,
            grandTotal = grandTotal,
            qtyTotal = qtyTotal,
            subtotal = subtotal,
            dateOrdered = dateOrdered?.let { dateFormat.format(Date(it.time)) },
            json = jsonMap,
            uuid = uuid,
            currency = currency,
            tips = tips,
            note = note,
            couponids = couponids,
        )
    }

    private fun OrderLine.toSyncOrderLine(): SyncOrderLine {
        return SyncOrderLine(
            orderLineId = orderline_id,
            orderId = order_id,
            productId = product_id,
            productCategoryId = productcategory_id,
            taxId = tax_id,
            qtyEntered = qtyentered,
            lineAmt = lineamt,
            lineNetAmt = linenetamt,
            priceEntered = priceentered,
            costAmt = costamt,
            productName = productname,
            productDescription = productdescription,
            serialItemId = serial_item_id,
        )
    }

    private fun Till.toSyncTill(): SyncTill {
        val jsonMap: Map<String, Any?>? = this.json?.let {
            try {
                @Suppress("UNCHECKED_CAST")
                objectMapper.readValue(it.toString(), Map::class.java) as Map<String, Any?>
            } catch (e: Exception) {
                null
            }
        }

        return SyncTill(
            tillId = tillId,
            storeId = store_id,
            terminalId = terminal_id,
            openBy = openBy,
            closeBy = closeBy,
            openingAmt = openingAmt,
            closingAmt = closingAmt,
            dateOpened = dateOpened?.let { dateFormat.format(Date(it.time)) },
            dateClosed = dateClosed?.let { dateFormat.format(Date(it.time)) },
            json = jsonMap,
            uuid = uuid,
            documentNo = documentno,
            vouchers = vouchers,
            adjustmentTotal = adjustmenttotal,
            cashAmt = cashamt,
            cardAmt = cardamt,
            subtotal = subtotal,
            taxTotal = taxtotal,
            grandTotal = grandtotal,
            forexCurrency = forexcurrency,
            forexAmt = forexamt,
            status = if (dateClosed == null) "open" else "closed",
        )
    }

    private fun Store.toSyncStore(): SyncStore {
        return SyncStore(
            storeId = storeId,
            name = name,
            address = address,
            city = city,
            state = state,
            zip = zip,
            country = country,
            currency = currency,
            isActive = isactive ?: "Y",
        )
    }

    private fun Terminal.toSyncTerminal(): SyncTerminal {
        return SyncTerminal(
            terminalId = terminalId,
            storeId = store_id,
            name = name,
            prefix = prefix,
            sequence = sequence,
            cashUpSequence = cash_up_sequence,
            isActive = isactive ?: "Y",
        )
    }

    private fun User.toSyncUser(): SyncUser {
        return SyncUser(
            userId = user_id,
            username = username,
            firstname = firstname,
            lastname = lastname,
            pin = pin,
            role = role,
            isAdmin = isadmin,
            isSalesRep = issalesrep,
            permissions = permissions,
            discountLimit = discountlimit,
            isActive = isactive ?: "Y",
        )
    }

    private fun ProductCategory.toSyncCategory(): SyncCategory {
        return SyncCategory(
            productCategoryId = productcategory_id,
            name = name,
            isActive = isactive ?: "Y",
            display = display,
            position = position,
            taxId = tax_id,
        )
    }

    private fun Product.toSyncProduct(): SyncProduct {
        return SyncProduct(
            productId = product_id,
            name = name,
            description = description,
            sellingPrice = sellingprice,
            costPrice = costprice,
            taxAmount = taxamount,
            taxId = tax_id,
            productCategoryId = productcategory_id,
            image = image,
            upc = upc,
            itemCode = itemcode,
            barcodeType = barcodetype,
            isActive = isactive ?: "Y",
            isTaxIncluded = istaxincluded,
            isStock = isstock,
            isVariableItem = isvariableitem,
            isKitchenItem = iskitchenitem,
            isModifier = ismodifier,
            isFavourite = isfavourite,
            wholesalePrice = wholesaleprice,
            needsPriceReview = needs_price_review,
            priceSetBy = price_set_by,
        )
    }

    private fun Tax.toSyncTax(): SyncTax {
        return SyncTax(
            taxId = tax_id,
            name = name,
            rate = rate,
            taxCode = taxcode,
            isActive = isactive ?: "Y",
        )
    }

    private fun RestaurantTable.toSyncRestaurantTable(): SyncRestaurantTable {
        return SyncRestaurantTable(
            tableId = table_id,
            tableName = table_name,
            seats = seats,
            isOccupied = is_occupied,
            currentOrderId = current_order_id,
            storeId = store_id,
            terminalId = terminal_id,
            created = created,
            updated = updated,
        )
    }

    private fun InventoryCountEntry.toSyncInventoryCountEntry(): SyncInventoryCountEntry {
        return SyncInventoryCountEntry(
            sessionId = session_id,
            productId = product_id,
            productName = product_name,
            upc = upc,
            quantity = quantity,
            scannedBy = scanned_by,
            terminalId = terminal_id,
        )
    }

    private fun Payment.toSyncPayment(): SyncPayment {
        return SyncPayment(
            paymentId = paymentId,
            orderId = orderId,
            documentNo = documentNo,
            tendered = tendered,
            amount = amount,
            change = change,
            paymentType = paymentType,
            datePaid = datePaid?.let { dateFormat.format(Date(it.time)) },
            payAmt = payAmt,
            status = status,
            checkNumber = checknumber,
        )
    }

    private fun Customer.toSyncCustomer(): SyncCustomer {
        return SyncCustomer(
            customerId = customer_id,
            name = name,
            identifier = identifier,
            phone1 = phone1,
            phone2 = phone2,
            mobile = mobile,
            email = email,
            address1 = address1,
            address2 = address2,
            city = city,
            state = state,
            zip = zip,
            country = country,
            creditLimit = creditlimit,
            balance = openbalance,
            isActive = isactive ?: "Y",
            loyaltyPoints = loyaltypoints,
            discountCodeId = discountcode_id,
            gender = gender,
            dob = dob,
            regno = regno,
            note = note,
            creditTerm = creditterm,
        )
    }

    // ========================================
    // Map → Entity mappers (pull)
    // ========================================

    private fun mapToProduct(map: Map<String, Any?>): Product? {
        return try {
            Product(
                product_id = (map["product_id"] as? Number)?.toInt() ?: return null,
                name = map["name"] as? String,
                sellingprice = (map["sellingprice"] as? Number)?.toDouble() ?: 0.0,
                costprice = (map["costprice"] as? Number)?.toDouble() ?: 0.0,
                productcategory_id = (map["productcategory_id"] as? Number)?.toInt() ?: 0,
                tax_id = (map["tax_id"] as? Number)?.toInt() ?: 0,
                image = map["image"] as? String,
                upc = map["upc"] as? String,
                isactive = map["isactive"] as? String ?: "Y",
                istaxincluded = map["istaxincluded"] as? String,
                description = map["description"] as? String,
                isstock = map["isstock"] as? String,
                isvariableitem = map["isvariableitem"] as? String,
                isbom = map["isbom"] as? String,
                ismodifier = map["ismodifier"] as? String,
                iseditable = map["iseditable"] as? String,
                isfavourite = map["isfavourite"] as? String,
                iskitchenitem = map["iskitchenitem"] as? String,
                taxamount = (map["taxamount"] as? Number)?.toDouble() ?: 0.0,
                iswholesaleprice = map["iswholesaleprice"] as? String,
                wholesaleprice = (map["wholesaleprice"] as? Number)?.toDouble() ?: 0.0,
                barcodetype = map["barcodetype"] as? String,
                printordercopy = map["printordercopy"] as? String,
                itemcode = map["itemcode"] as? String,
                needs_price_review = map["needs_price_review"] as? String,
                price_set_by = (map["price_set_by"] as? Number)?.toInt() ?: 0,
                account_id = map["account_id"]?.toString() ?: "",
                product_status = map["product_status"] as? String ?: "live",
                source = map["source"] as? String ?: "manual",
                station_override_id = (map["station_override_id"] as? Number)?.toInt(),
                is_deleted = map["is_deleted"] == true,
                deleted_at = map["deleted_at"] as? String,
                is_serialized = map["is_serialized"] as? String ?: "N",
                created_at = map["created_at"] as? String,
                updated_at = map["updated_at"] as? String,
                quantity_on_hand = (map["quantity_on_hand"] as? Number)?.toDouble() ?: 0.0,
                reorder_point = (map["reorder_point"] as? Number)?.toDouble() ?: 0.0,
                track_stock = if (map["track_stock"] == false) 0 else 1,
                shelf_location = map["shelf_location"] as? String,
                batch_number = map["batch_number"] as? String,
                expiry_date = map["expiry_date"] as? String,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map product: ${e.message}")
            null
        }
    }

    private fun mapToCategory(map: Map<String, Any?>): ProductCategory? {
        return try {
            ProductCategory(
                productcategory_id = (map["productcategory_id"] as? Number)?.toInt() ?: return null,
                name = map["name"] as? String,
                isactive = map["isactive"] as? String ?: "Y",
                display = map["display"] as? String,
                position = (map["position"] as? Number)?.toInt() ?: 0,
                tax_id = map["tax_id"] as? String,
                account_id = map["account_id"]?.toString() ?: "",
                parent_category_id = (map["parent_category_id"] as? Number)?.toInt(),
                level = (map["level"] as? Number)?.toInt() ?: 0,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map category: ${e.message}")
            null
        }
    }

    private fun mapToTax(map: Map<String, Any?>): Tax? {
        return try {
            Tax(
                tax_id = (map["tax_id"] as? Number)?.toInt() ?: return null,
                name = map["name"] as? String,
                rate = (map["rate"] as? Number)?.toDouble() ?: 0.0,
                isactive = map["isactive"] as? String ?: "Y",
                account_id = map["account_id"]?.toString() ?: "",
                taxcode = map["taxcode"] as? String,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map tax: ${e.message}")
            null
        }
    }

    private fun mapToModifier(map: Map<String, Any?>): Modifier? {
        return try {
            Modifier(
                modifier_id = (map["modifier_id"] as? Number)?.toInt() ?: return null,
                name = map["name"] as? String,
                sellingprice = (map["sellingprice"] as? Number)?.toDouble() ?: 0.0,
                costprice = (map["costprice"] as? Number)?.toDouble() ?: 0.0,
                isactive = map["isactive"] as? String ?: "Y",
                tax_id = (map["tax_id"] as? Number)?.toInt() ?: 0,
                productcategory_id = (map["productcategory_id"] as? Number)?.toInt() ?: 0,
                product_id = (map["product_id"] as? Number)?.toInt() ?: 0,
                taxamount = (map["taxamount"] as? Number)?.toDouble() ?: 0.0,
                image = map["image"] as? String,
                description = map["description"] as? String,
                ismodifier = map["ismodifier"] as? String,
                upc = map["upc"] as? String,
                istaxincluded = map["istaxincluded"] as? String,
                iskitchenitem = map["iskitchenitem"] as? String,
                account_id = map["account_id"]?.toString() ?: "",
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map modifier: ${e.message}")
            null
        }
    }

    private fun mapToCustomer(map: Map<String, Any?>): Customer? {
        return try {
            Customer(
                customer_id = (map["customer_id"] as? Number)?.toInt() ?: return null,
                name = map["name"] as? String,
                identifier = map["identifier"] as? String,
                phone1 = map["phone1"] as? String,
                phone2 = map["phone2"] as? String,
                mobile = map["mobile"] as? String,
                email = map["email"] as? String,
                address1 = map["address1"] as? String,
                address2 = map["address2"] as? String,
                city = map["city"] as? String,
                state = map["state"] as? String,
                zip = map["zip"] as? String,
                country = map["country"] as? String,
                creditlimit = (map["creditlimit"] as? Number ?: map["credit_limit"] as? Number)?.toDouble() ?: 0.0,
                isactive = map["isactive"] as? String ?: "Y",
                loyaltypoints = (map["loyaltypoints"] as? Number ?: map["loyalty_points"] as? Number)?.toInt() ?: 0,
                discountcode_id = (map["discountcode_id"] as? Number)?.toInt() ?: 0,
                account_id = map["account_id"]?.toString() ?: "",
                gender = map["gender"] as? String,
                dob = map["dob"] as? String,
                regno = map["regno"] as? String,
                note = map["note"] as? String,
                allowcredit = map["allowcredit"] as? String,
                creditterm = (map["creditterm"] as? Number)?.toInt() ?: 0,
                openbalance = (map["openbalance"] as? Number)?.toDouble() ?: 0.0,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map customer: ${e.message}")
            null
        }
    }

    private fun mapToUser(map: Map<String, Any?>): User? {
        return try {
            User(
                user_id = (map["user_id"] as? Number)?.toInt() ?: return null,
                username = map["username"] as? String,
                firstname = map["firstname"] as? String,
                lastname = map["lastname"] as? String,
                pin = map["pin"] as? String,
                role = map["role"] as? String ?: "staff",
                isadmin = map["isadmin"] as? String,
                issalesrep = map["issalesrep"] as? String,
                permissions = map["permissions"] as? String,
                discountlimit = (map["discountlimit"] as? Number)?.toDouble() ?: 0.0,
                isactive = map["isactive"] as? String ?: "Y",
                email = map["email"] as? String,
                account_id = map["account_id"]?.toString() ?: "",
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map user: ${e.message}")
            null
        }
    }

    private fun mapToDiscountCode(map: Map<String, Any?>): DiscountCode? {
        return try {
            DiscountCode(
                discountcode_id = (map["discountcode_id"] as? Number)?.toInt() ?: return null,
                name = map["name"] as? String,
                percentage = (map["percentage"] as? Number)?.toDouble()
                    ?: (map["discountpercentage"] as? Number)?.toDouble() ?: 0.0,
                isactive = map["isactive"] as? String ?: "Y",
                value = (map["value"] as? Number)?.toDouble() ?: 0.0,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map discount code: ${e.message}")
            null
        }
    }

    private fun mapToPreference(map: Map<String, Any?>): Preference? {
        return try {
            Preference(
                preference_id = (map["preference_id"] as? Number)?.toInt() ?: return null,
                isactive = map["isactive"] as? String ?: "Y",
                preventzeroqtysales = map["preventzeroqtysales"] as? String,
                showreceiptlogo = map["showreceiptlogo"] as? String,
                showsignature = map["showsignature"] as? String,
                showcustomerbrn = map["showcustomerbrn"] as? String,
                showstocktransfer = map["showstocktransfer"] as? String,
                printpaymentrule = map["printpaymentrule"] as? String,
                showunitprice = map["showunitprice"] as? String,
                acceptpaymentrule = map["acceptpaymentrule"] as? String,
                showtaxcode = map["showtaxcode"] as? String,
                opencashdrawer = map["opencashdrawer"] as? String,
                ai_api_key = map["ai_api_key"] as? String,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map preference: ${e.message}")
            null
        }
    }

    private fun mapToRestaurantTable(map: Map<String, Any?>): RestaurantTable? {
        return try {
            RestaurantTable(
                table_id = (map["table_id"] as? Number)?.toInt() ?: return null,
                table_name = (map["table_name"] as? String) ?: (map["name"] as? String) ?: "Table",
                store_id = (map["store_id"] as? Number)?.toInt() ?: 0,
                seats = (map["seats"] as? Number)?.toInt() ?: (map["capacity"] as? Number)?.toInt() ?: 4,
                is_occupied = map["is_occupied"] as? Boolean ?: false,
                section_id = (map["section_id"] as? Number)?.toInt(),
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map restaurant table: ${e.message}")
            null
        }
    }

    private fun mapToTableSection(map: Map<String, Any?>): TableSection? {
        return try {
            TableSection(
                section_id = (map["section_id"] as? Number)?.toInt() ?: return null,
                account_id = map["account_id"] as? String ?: return null,
                store_id = (map["store_id"] as? Number)?.toInt() ?: 0,
                name = map["name"] as? String ?: "Section",
                display_order = (map["display_order"] as? Number)?.toInt() ?: 0,
                color = map["color"] as? String ?: "#6B7280",
                is_active = map["is_active"] as? Boolean ?: true,
                is_takeaway = map["is_takeaway"] as? Boolean ?: false,
                created_at = map["created_at"] as? String,
                updated_at = map["updated_at"] as? String,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map table section: ${e.message}")
            null
        }
    }

    private fun mapToPreparationStation(map: Map<String, Any?>): PreparationStation? {
        return try {
            PreparationStation(
                station_id = (map["station_id"] as? Number)?.toInt() ?: return null,
                account_id = map["account_id"] as? String ?: return null,
                store_id = (map["store_id"] as? Number)?.toInt() ?: 0,
                name = map["name"] as? String ?: "Station",
                station_type = map["station_type"] as? String ?: "kitchen",
                printer_id = (map["printer_id"] as? Number)?.toInt(),
                color = map["color"] as? String ?: "#3B82F6",
                display_order = (map["display_order"] as? Number)?.toInt() ?: 0,
                is_active = map["is_active"] as? Boolean ?: true,
                created_at = map["created_at"] as? String,
                updated_at = map["updated_at"] as? String,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map preparation station: ${e.message}")
            null
        }
    }

    private fun mapToCategoryStationMapping(map: Map<String, Any?>): CategoryStationMapping? {
        return try {
            CategoryStationMapping(
                id = (map["id"] as? Number)?.toInt() ?: return null,
                account_id = map["account_id"] as? String ?: return null,
                category_id = (map["category_id"] as? Number)?.toInt() ?: return null,
                station_id = (map["station_id"] as? Number)?.toInt() ?: return null,
                created_at = map["created_at"] as? String,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map category station mapping: ${e.message}")
            null
        }
    }

    private fun mapToSerialItem(map: Map<String, Any?>): com.posterita.pos.android.data.local.entity.SerialItem? {
        return try {
            com.posterita.pos.android.data.local.entity.SerialItem(
                serialItemId = (map["serial_item_id"] as? Number)?.toInt() ?: return null,
                accountId = map["account_id"] as? String ?: return null,
                productId = (map["product_id"] as? Number)?.toInt() ?: 0,
                storeId = (map["store_id"] as? Number)?.toInt() ?: 0,
                serialNumber = map["serial_number"] as? String ?: return null,
                serialType = map["serial_type"] as? String ?: "serial",
                status = map["status"] as? String ?: "in_stock",
                supplierName = map["supplier_name"] as? String,
                purchaseDate = map["purchase_date"] as? String,
                costPrice = (map["cost_price"] as? Number)?.toDouble() ?: 0.0,
                orderId = (map["order_id"] as? Number)?.toInt(),
                orderlineId = (map["orderline_id"] as? Number)?.toInt(),
                customerId = (map["customer_id"] as? Number)?.toInt(),
                soldDate = map["sold_date"] as? String,
                sellingPrice = (map["selling_price"] as? Number)?.toDouble(),
                deliveredDate = map["delivered_date"] as? String,
                warrantyMonths = (map["warranty_months"] as? Number)?.toInt() ?: 0,
                warrantyExpiry = map["warranty_expiry"] as? String,
                color = map["color"] as? String,
                year = (map["year"] as? Number)?.toInt(),
                engineNumber = map["engine_number"] as? String,
                notes = map["notes"] as? String,
                isDeleted = map["is_deleted"] == true,
                isSync = true, // pulled from server = already synced
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map serial item: ${e.message}")
            null
        }
    }

    private fun mapToStore(map: Map<String, Any?>): Store? {
        return try {
            Store(
                storeId = (map["store_id"] as? Number)?.toInt() ?: return null,
                name = map["name"] as? String,
                address = map["address"] as? String,
                city = map["city"] as? String,
                state = map["state"] as? String,
                zip = map["zip"] as? String,
                country = map["country"] as? String,
                currency = map["currency"] as? String,
                isactive = map["isactive"] as? String ?: "Y",
                account_id = map["account_id"]?.toString() ?: "",
                store_type = map["store_type"] as? String ?: "retail",
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map store: ${e.message}")
            null
        }
    }

    private fun mapToTerminal(map: Map<String, Any?>): Terminal? {
        return try {
            Terminal(
                terminalId = (map["terminal_id"] as? Number)?.toInt() ?: return null,
                store_id = (map["store_id"] as? Number)?.toInt() ?: 0,
                name = map["name"] as? String,
                prefix = map["prefix"] as? String,
                sequence = (map["sequence"] as? Number)?.toInt() ?: 0,
                cash_up_sequence = (map["cash_up_sequence"] as? Number)?.toInt() ?: 0,
                isactive = map["isactive"] as? String ?: "Y",
                account_id = map["account_id"]?.toString() ?: "",
                terminal_type = map["terminal_type"] as? String ?: "pos_retail",
                zone = map["zone"] as? String,
                mraebs_id = map["mraebs_id"] as? String,
                floatamt = (map["floatamt"] as? Number)?.toDouble() ?: 0.0,
                last_std_invoice_no = (map["last_std_invoice_no"] as? Number)?.toInt() ?: 0,
                last_crn_invoice_no = (map["last_crn_invoice_no"] as? Number)?.toInt() ?: 0,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map terminal: ${e.message}")
            null
        }
    }

    private fun mapToInventoryCountSession(map: Map<String, Any?>): InventoryCountSession? {
        return try {
            InventoryCountSession(
                session_id = (map["session_id"] as? Number)?.toInt() ?: return null,
                account_id = map["account_id"]?.toString() ?: "",
                store_id = (map["store_id"] as? Number)?.toInt() ?: 0,
                type = map["type"] as? String ?: "spot_check",
                status = map["status"] as? String ?: "created",
                name = map["name"] as? String,
                started_at = map["started_at"] as? String,
                completed_at = map["completed_at"] as? String,
                created_by = (map["created_by"] as? Number)?.toInt() ?: 0,
                created_at = map["created_at"] as? String,
                updated_at = map["updated_at"] as? String,
                notes = map["notes"] as? String,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map inventory count session: ${e.message}")
            null
        }
    }

    private fun mapToLoyaltyConfig(map: Map<String, Any?>): com.posterita.pos.android.data.local.entity.LoyaltyConfig? {
        return try {
            com.posterita.pos.android.data.local.entity.LoyaltyConfig(
                id = (map["id"] as? Number)?.toInt() ?: return null,
                account_id = map["account_id"]?.toString() ?: return null,
                points_per_currency = (map["points_per_currency"] as? Number)?.toDouble() ?: 1.0,
                redemption_rate = (map["redemption_rate"] as? Number)?.toDouble() ?: 0.01,
                min_redeem_points = (map["min_redeem_points"] as? Number)?.toInt() ?: 100,
                is_active = map["is_active"] as? Boolean ?: true,
                welcome_bonus = (map["welcome_bonus"] as? Number)?.toInt() ?: 0,
                created_at = map["created_at"] as? String,
                updated_at = map["updated_at"] as? String,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map loyalty config: ${e.message}")
            null
        }
    }

    private fun mapToPromotion(map: Map<String, Any?>): com.posterita.pos.android.data.local.entity.Promotion? {
        return try {
            com.posterita.pos.android.data.local.entity.Promotion(
                id = (map["id"] as? Number)?.toInt() ?: return null,
                account_id = map["account_id"]?.toString() ?: return null,
                name = map["name"] as? String ?: "",
                description = map["description"] as? String,
                type = map["type"] as? String ?: "percentage_off",
                discount_value = (map["discount_value"] as? Number)?.toDouble() ?: 0.0,
                buy_quantity = (map["buy_quantity"] as? Number)?.toInt(),
                get_quantity = (map["get_quantity"] as? Number)?.toInt(),
                applies_to = map["applies_to"] as? String ?: "order",
                product_ids = map["product_ids"]?.toString(),
                category_ids = map["category_ids"]?.toString(),
                min_order_amount = (map["min_order_amount"] as? Number)?.toDouble(),
                max_discount_amount = (map["max_discount_amount"] as? Number)?.toDouble(),
                promo_code = map["promo_code"] as? String,
                max_uses = (map["max_uses"] as? Number)?.toInt(),
                max_uses_per_customer = (map["max_uses_per_customer"] as? Number)?.toInt(),
                start_date = map["start_date"] as? String,
                end_date = map["end_date"] as? String,
                days_of_week = map["days_of_week"]?.toString(),
                start_time = map["start_time"] as? String,
                end_time = map["end_time"] as? String,
                is_active = map["is_active"] as? Boolean ?: true,
                store_id = (map["store_id"] as? Number)?.toInt(),
                priority = (map["priority"] as? Number)?.toInt() ?: 0,
                is_deleted = map["is_deleted"] == true,
                created_at = map["created_at"] as? String,
                updated_at = map["updated_at"] as? String,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map promotion: ${e.message}")
            null
        }
    }

    private fun mapToMenuSchedule(map: Map<String, Any?>): com.posterita.pos.android.data.local.entity.MenuSchedule? {
        return try {
            com.posterita.pos.android.data.local.entity.MenuSchedule(
                id = (map["id"] as? Number)?.toInt() ?: return null,
                account_id = map["account_id"]?.toString() ?: return null,
                store_id = (map["store_id"] as? Number)?.toInt() ?: 0,
                name = map["name"] as? String ?: "",
                description = map["description"] as? String,
                category_ids = map["category_ids"]?.toString(),
                start_time = map["start_time"] as? String,
                end_time = map["end_time"] as? String,
                days_of_week = map["days_of_week"]?.toString(),
                priority = (map["priority"] as? Number)?.toInt() ?: 0,
                is_active = map["is_active"] as? Boolean ?: true,
                created_at = map["created_at"] as? String,
                updated_at = map["updated_at"] as? String,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map menu schedule: ${e.message}")
            null
        }
    }

    private fun mapToShift(map: Map<String, Any?>): com.posterita.pos.android.data.local.entity.Shift? {
        return try {
            com.posterita.pos.android.data.local.entity.Shift(
                id = (map["id"] as? Number)?.toInt() ?: return null,
                account_id = map["account_id"]?.toString() ?: return null,
                store_id = (map["store_id"] as? Number)?.toInt() ?: 0,
                terminal_id = (map["terminal_id"] as? Number)?.toInt() ?: 0,
                user_id = (map["user_id"] as? Number)?.toInt() ?: 0,
                user_name = map["user_name"] as? String,
                clock_in = map["clock_in"] as? String,
                clock_out = map["clock_out"] as? String,
                break_minutes = (map["break_minutes"] as? Number)?.toInt() ?: 0,
                hours_worked = (map["hours_worked"] as? Number)?.toDouble(),
                notes = map["notes"] as? String,
                status = map["status"] as? String ?: "active",
                created_at = map["created_at"] as? String,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map shift: ${e.message}")
            null
        }
    }

    private fun mapToDelivery(map: Map<String, Any?>): com.posterita.pos.android.data.local.entity.Delivery? {
        return try {
            com.posterita.pos.android.data.local.entity.Delivery(
                id = (map["id"] as? Number)?.toInt() ?: return null,
                account_id = map["account_id"]?.toString() ?: return null,
                order_id = (map["order_id"] as? Number)?.toInt(),
                store_id = (map["store_id"] as? Number)?.toInt() ?: 0,
                customer_id = (map["customer_id"] as? Number)?.toInt(),
                customer_name = map["customer_name"] as? String,
                customer_phone = map["customer_phone"] as? String,
                delivery_address = map["delivery_address"] as? String,
                delivery_city = map["delivery_city"] as? String,
                delivery_notes = map["delivery_notes"] as? String,
                driver_id = (map["driver_id"] as? Number)?.toInt(),
                driver_name = map["driver_name"] as? String,
                status = map["status"] as? String ?: "pending",
                estimated_time = map["estimated_time"] as? String,
                actual_delivery_at = map["actual_delivery_at"] as? String,
                assigned_at = map["assigned_at"] as? String,
                picked_up_at = map["picked_up_at"] as? String,
                distance_km = (map["distance_km"] as? Number)?.toDouble(),
                delivery_fee = (map["delivery_fee"] as? Number)?.toDouble(),
                is_deleted = map["is_deleted"] == true,
                created_at = map["created_at"] as? String,
                updated_at = map["updated_at"] as? String,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map delivery: ${e.message}")
            null
        }
    }

    private fun mapToTagGroup(map: Map<String, Any?>): com.posterita.pos.android.data.local.entity.TagGroup? {
        return try {
            com.posterita.pos.android.data.local.entity.TagGroup(
                tag_group_id = (map["tag_group_id"] as? Number)?.toInt() ?: return null,
                account_id = map["account_id"]?.toString() ?: return null,
                name = map["name"] as? String ?: "",
                description = map["description"] as? String,
                color = map["color"] as? String ?: "#6B7280",
                is_active = map["is_active"] != false,
                is_deleted = map["is_deleted"] == true,
                created_at = map["created_at"] as? String,
                updated_at = map["updated_at"] as? String,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map tag group: ${e.message}")
            null
        }
    }

    private fun mapToTag(map: Map<String, Any?>): com.posterita.pos.android.data.local.entity.Tag? {
        return try {
            com.posterita.pos.android.data.local.entity.Tag(
                tag_id = (map["tag_id"] as? Number)?.toInt() ?: return null,
                account_id = map["account_id"]?.toString() ?: return null,
                tag_group_id = (map["tag_group_id"] as? Number)?.toInt() ?: 0,
                name = map["name"] as? String ?: "",
                color = map["color"] as? String,
                position = (map["position"] as? Number)?.toInt() ?: 0,
                is_active = map["is_active"] != false,
                is_deleted = map["is_deleted"] == true,
                created_at = map["created_at"] as? String,
                updated_at = map["updated_at"] as? String,
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map tag: ${e.message}")
            null
        }
    }

    private fun mapToProductTag(map: Map<String, Any?>): com.posterita.pos.android.data.local.entity.ProductTag? {
        return try {
            com.posterita.pos.android.data.local.entity.ProductTag(
                product_id = (map["product_id"] as? Number)?.toInt() ?: return null,
                tag_id = (map["tag_id"] as? Number)?.toInt() ?: return null,
                account_id = map["account_id"]?.toString() ?: "",
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map product tag: ${e.message}")
            null
        }
    }

    /**
     * Sync statistics returned after each sync cycle.
     */
    data class SyncStats(
        val ordersPushed: Int = 0,
        val tillsPushed: Int = 0,
        val productsPulled: Int = 0,
        val categoriesPulled: Int = 0,
        val taxesPulled: Int = 0,
        val customersPulled: Int = 0,
        val errors: List<String> = emptyList()
    ) {
        override fun toString(): String =
            "pushed=$ordersPushed orders, $tillsPushed tills | " +
            "pulled=$productsPulled products, $categoriesPulled categories, $taxesPulled taxes, $customersPulled customers" +
            if (errors.isNotEmpty()) " | ${errors.size} errors" else ""
    }

    // ---- Error Log Mapper ----

    private fun ErrorLog.toSyncErrorLog(): SyncErrorLog = SyncErrorLog(
        id = id,
        timestamp = timestamp,
        severity = severity,
        tag = tag,
        message = message,
        stacktrace = stacktrace,
        screen = screen,
        userId = userId,
        userName = userName,
        storeId = storeId,
        terminalId = terminalId,
        accountId = accountId,
        deviceId = deviceId,
        appVersion = appVersion,
        osVersion = osVersion
    )

    private fun com.posterita.pos.android.data.local.entity.SerialItem.toSyncSerialItem(): SyncSerialItem = SyncSerialItem(
        serialItemId = serialItemId,
        serialNumber = serialNumber,
        productId = productId,
        storeId = storeId,
        serialType = serialType,
        status = status,
        orderId = orderId,
        orderlineId = orderlineId,
        customerId = customerId,
        soldDate = soldDate,
        sellingPrice = sellingPrice,
        deliveredDate = deliveredDate,
    )

    private fun com.posterita.pos.android.data.local.entity.Delivery.toSyncDelivery(): SyncDelivery = SyncDelivery(
        orderId = order_id,
        storeId = store_id,
        customerId = customer_id,
        customerName = customer_name,
        customerPhone = customer_phone,
        deliveryAddress = delivery_address,
        deliveryCity = delivery_city,
        deliveryNotes = delivery_notes,
        status = status,
    )
}
