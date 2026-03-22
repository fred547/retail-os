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
        private const val CLOUD_SYNC_DATE_KEY = "cloud_last_sync_at"
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
            val terminalId = prefsManager.terminalId
            val storeId = prefsManager.storeId

            if (accountId.isEmpty()) {
                return Result.failure(Exception("No account configured"))
            }
            if (terminalId == 0) {
                return Result.failure(Exception("No terminal selected"))
            }

            SyncStatusManager.update(
                SyncStatusManager.SyncState.CONNECTING,
                "Connecting to cloud..."
            )

            val lastSyncAt = prefsManager.getString(CLOUD_SYNC_DATE_KEY, "1970-01-01T00:00:00.000Z")

            // Collect local data to push
            val unsyncedOrders = db.orderDao().getUnSyncedOrders()
            val unsyncedTills = db.tillDao().getClosedTillByTerminalId(terminalId)
                .filter { !it.isSync }

            // Collect order lines and payments for unsynced orders
            val orderLines = mutableListOf<OrderLine>()
            val payments = mutableListOf<Payment>()
            for (order in unsyncedOrders) {
                orderLines.addAll(db.orderLineDao().getOrderLinesByOrderId(order.orderId))
                payments.addAll(db.paymentDao().getPaymentsByOrderId(order.orderId))
            }

            // Collect customers to push (all active customers)
            val allCustomers = db.customerDao().getAllCustomersSync()

            // Report push status
            if (unsyncedOrders.isNotEmpty()) {
                SyncStatusManager.update(
                    SyncStatusManager.SyncState.PUSHING_ORDERS,
                    "Uploading orders...",
                    "${unsyncedOrders.size} orders, ${orderLines.size} lines"
                )
            }
            if (unsyncedTills.isNotEmpty()) {
                SyncStatusManager.update(
                    SyncStatusManager.SyncState.PUSHING_TILLS,
                    "Uploading till records...",
                    "${unsyncedTills.size} tills"
                )
            }

            // Collect master data to push (stores, terminals, users, categories, products, taxes)
            val allStores = db.storeDao().getAllStores()
            val allTerminals = db.terminalDao().getAllTerminals()
            val allUsers = db.userDao().getAllUsers()
            val allCategories = db.productCategoryDao().getAllProductCategoriesSync()
            val allProducts = db.productDao().getAllProductsSync()
            val allTaxes = db.taxDao().getAllTaxesSync()
            val allTables = db.restaurantTableDao().getTablesByStore(storeId)

            // Collect unsynced error logs
            val unsyncedErrorLogs = db.errorLogDao().getUnsyncedLogs()

            // Build sync request
            val request = CloudSyncRequest(
                accountId = accountId,
                terminalId = terminalId,
                storeId = storeId,
                lastSyncAt = lastSyncAt,
                orders = if (unsyncedOrders.isNotEmpty()) unsyncedOrders.map { it.toSyncOrder() } else null,
                orderLines = if (orderLines.isNotEmpty()) orderLines.map { it.toSyncOrderLine() } else null,
                payments = if (payments.isNotEmpty()) payments.map { it.toSyncPayment() } else null,
                tills = if (unsyncedTills.isNotEmpty()) unsyncedTills.map { it.toSyncTill() } else null,
                customers = if (allCustomers.isNotEmpty()) allCustomers.map { it.toSyncCustomer() } else null,
                stores = if (allStores.isNotEmpty()) allStores.map { it.toSyncStore() } else null,
                terminals = if (allTerminals.isNotEmpty()) allTerminals.map { it.toSyncTerminal() } else null,
                users = if (allUsers.isNotEmpty()) allUsers.map { it.toSyncUser() } else null,
                categories = if (allCategories.isNotEmpty()) allCategories.map { it.toSyncCategory() } else null,
                products = if (allProducts.isNotEmpty()) allProducts.map { it.toSyncProduct() } else null,
                taxes = if (allTaxes.isNotEmpty()) allTaxes.map { it.toSyncTax() } else null,
                restaurantTables = if (allTables.isNotEmpty()) allTables.map { it.toSyncRestaurantTable() } else null,
                errorLogs = if (unsyncedErrorLogs.isNotEmpty()) unsyncedErrorLogs.map { it.toSyncErrorLog() } else null,
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

            // Process the response with detailed progress
            processSyncResponse(syncResponse, unsyncedOrders, unsyncedTills)

            // Mark error logs as synced and clean up old ones
            if (unsyncedErrorLogs.isNotEmpty()) {
                db.errorLogDao().markSynced(unsyncedErrorLogs.map { it.id })
                val cutoff = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000L)
                db.errorLogDao().deleteOldSyncedLogs(cutoff)
            }

            // Update last sync timestamp
            val syncTime = System.currentTimeMillis()
            syncResponse.serverTime?.let {
                prefsManager.setString(CLOUD_SYNC_DATE_KEY, it)
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
                discountCodesPulled = syncResponse.discountCodes?.size ?: 0,
                preferencesPulled = syncResponse.preferences?.size ?: 0,
                tablesPulled = syncResponse.restaurantTables?.size ?: 0,
                errors = syncResponse.errors ?: emptyList(),
                durationMs = System.currentTimeMillis() - startTime,
            )
            SyncStatusManager.complete(summary, syncTime)

            Log.d(TAG, "Sync complete: $stats")
            if (stats.errors.isNotEmpty()) {
                Log.w(TAG, "Sync errors: ${stats.errors.joinToString("; ")}")
            }
            Result.success(stats)
        } catch (e: Exception) {
            Log.e(TAG, "Cloud sync failed", e)
            SyncStatusManager.error(e.message ?: "Unknown error")
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

            val lastSyncAt = prefsManager.getString(CLOUD_SYNC_DATE_KEY, "1970-01-01T00:00:00.000Z")

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
                prefsManager.setString(CLOUD_SYNC_DATE_KEY, it)
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
        if (response.ordersSynced > 0) {
            for (order in pushedOrders) {
                db.orderDao().updateOrder(order.copy(isSync = true))
            }
        }

        // Mark pushed tills as synced
        if (response.tillsSynced > 0) {
            for (till in pushedTills) {
                db.tillDao().updateTill(till.copy(isSync = true))
            }
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
                (response.restaurantTables?.size ?: 0)
        var processedItems = 0

        SyncStatusManager.update(
            SyncStatusManager.SyncState.SAVING,
            "Saving data locally...",
            "0 / $totalPullItems items",
            percent = 50
        )

        db.withTransaction {
            // Products
            response.products?.let { list ->
                if (list.isNotEmpty()) {
                    SyncStatusManager.update(
                        SyncStatusManager.SyncState.PULLING_PRODUCTS,
                        "Downloading products...",
                        "${list.size} products",
                        percent = 50 + (processedItems * 50 / totalPullItems.coerceAtLeast(1))
                    )
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
                    SyncStatusManager.update(
                        SyncStatusManager.SyncState.PULLING_CATEGORIES,
                        "Downloading categories...",
                        "${list.size} categories",
                        percent = 50 + (processedItems * 50 / totalPullItems.coerceAtLeast(1))
                    )
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
                    SyncStatusManager.update(
                        SyncStatusManager.SyncState.PULLING_TAXES,
                        "Downloading taxes...",
                        "${list.size} taxes",
                        percent = 50 + (processedItems * 50 / totalPullItems.coerceAtLeast(1))
                    )
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
                    SyncStatusManager.update(
                        SyncStatusManager.SyncState.PULLING_MODIFIERS,
                        "Downloading modifiers...",
                        "${list.size} modifiers",
                        percent = 50 + (processedItems * 50 / totalPullItems.coerceAtLeast(1))
                    )
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
                    SyncStatusManager.update(
                        SyncStatusManager.SyncState.PULLING_CUSTOMERS,
                        "Downloading customers...",
                        "${list.size} customers",
                        percent = 50 + (processedItems * 50 / totalPullItems.coerceAtLeast(1))
                    )
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
                    SyncStatusManager.update(
                        SyncStatusManager.SyncState.PULLING_USERS,
                        "Downloading users...",
                        "${list.size} users",
                        percent = 50 + (processedItems * 50 / totalPullItems.coerceAtLeast(1))
                    )
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
        }
    }

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
                account_id = (map["account_id"] as? Number)?.toInt() ?: 0,
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
                creditlimit = (map["credit_limit"] as? Number)?.toDouble() ?: 0.0,
                isactive = map["isactive"] as? String ?: "Y",
                loyaltypoints = (map["loyalty_points"] as? Number)?.toInt() ?: 0,
                discountcode_id = (map["discountcode_id"] as? Number)?.toInt() ?: 0,
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
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map restaurant table: ${e.message}")
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
            )
        } catch (e: Exception) {
            Log.w(TAG, "Failed to map terminal: ${e.message}")
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
}
