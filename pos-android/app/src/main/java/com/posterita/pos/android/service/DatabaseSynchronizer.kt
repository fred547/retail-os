package com.posterita.pos.android.service

import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.registerKotlinModule
import androidx.room.withTransaction
import com.posterita.pos.android.data.local.AppDatabase
import com.posterita.pos.android.data.local.entity.*
import com.posterita.pos.android.data.remote.ApiService
import com.posterita.pos.android.data.remote.model.response.PushDataResponse
import com.posterita.pos.android.util.SharedPreferencesManager
import org.json.JSONArray
import org.json.JSONObject
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DatabaseSynchronizer @Inject constructor(
    private val apiService: ApiService,
    private val db: AppDatabase,
    private val prefsManager: SharedPreferencesManager
) {
    private val objectMapper = ObjectMapper().apply {
        registerKotlinModule()
        configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
    }

    suspend fun pullData(): Result<Unit> {
        return try {
            val accountKey = prefsManager.accountId
            val syncDate = prefsManager.syncDate

            val response = apiService.pullData(accountKey, syncDate)
            if (!response.isSuccessful) {
                return Result.failure(Exception("Pull data failed: ${response.code()}"))
            }

            val rawJson = response.body() ?: return Result.failure(Exception("Empty response"))
            val jsonObject = JSONObject(rawJson)

            processPullDataResponse(jsonObject)
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private suspend fun processPullDataResponse(json: JSONObject) {
        // Save sync date
        json.optString("sync_date", "").let {
            if (it.isNotEmpty()) prefsManager.syncDate = it
        }

        // Parse all entities first (outside transaction to avoid holding DB lock during JSON parsing)
        val stores = parseJsonArray<Store>(json, "store")
        val terminals = parseJsonArray<Terminal>(json, "terminal")
        val customers = parseJsonArray<Customer>(json, "customer")
        val products = parseJsonArray<Product>(json, "product")
        val categories = parseJsonArray<ProductCategory>(json, "productcategory")
        val codes = parseJsonArray<DiscountCode>(json, "discountcode")
        val modifiers = parseJsonArray<Modifier>(json, "modifier")
        val prefs = parseJsonArray<Preference>(json, "preference")
        val taxes = parseJsonArray<Tax>(json, "tax")
        val integrations = parseJsonArray<Integration>(json, "integration")
        val accounts = parseJsonArray<Account>(json, "account")
        val users = parseJsonArray<User>(json, "user")

        // Insert all entities in a single transaction to prevent partial sync
        db.withTransaction {
            stores?.let { db.storeDao().insertStores(it) }
            terminals?.let { db.terminalDao().insertTerminals(it) }
            customers?.let { db.customerDao().insertCustomers(it) }
            products?.let { db.productDao().insertProducts(it) }
            categories?.let { db.productCategoryDao().insertProductCategories(it) }
            codes?.let { db.discountCodeDao().insertDiscountCodes(it) }
            modifiers?.let { db.modifierDao().insertModifiers(it) }
            prefs?.let { db.preferenceDao().insertPreferences(it) }
            taxes?.let { db.taxDao().insertTaxes(it) }
            integrations?.let { db.integrationDao().insertIntegrations(it) }
            accounts?.let { db.accountDao().insertAccounts(it) }
            users?.let { db.userDao().insertUsers(it) }
        }
    }

    private inline fun <reified T> parseJsonArray(json: JSONObject, key: String): List<T>? {
        return json.optJSONArray(key)?.toString()?.let {
            objectMapper.readValue(
                it, objectMapper.typeFactory.constructCollectionType(List::class.java, T::class.java)
            ) as List<T>
        }
    }

    /**
     * Pushes all local data to the Posterita cloud server.
     *
     * This collects all entities from the local Room database and sends them
     * in the same JSON format that pull-data uses, so the server can import
     * the data as if it were creating a new account.
     *
     * @param email     The email to register/link the account with on the server
     * @param password  The password for the cloud account
     * @return Result containing the server response with created counts
     */
    suspend fun pushData(email: String, password: String): Result<PushDataResponse> {
        return try {
            val accountKey = prefsManager.accountId

            // Collect all local data
            val accounts = db.accountDao().getAllAccounts()
            val stores = db.storeDao().getAllStores()
            val terminals = db.terminalDao().getAllTerminals()
            val users = db.userDao().getAllUsers()
            val categories = db.productCategoryDao().getAllProductCategoriesSync()
            val products = db.productDao().getAllProductsSync()
            val taxes = db.taxDao().getAllTaxesSync()
            val modifiers = db.modifierDao().getAllModifiers()

            // Build JSON payload mirroring pull-data format
            val payload = JSONObject().apply {
                put("email", email)
                put("password", password)
                put("business_name", accounts.firstOrNull()?.businessname ?: prefsManager.storeName)
                put("currency", accounts.firstOrNull()?.currency ?: prefsManager.getString("currency"))

                put("account", JSONArray(objectMapper.writeValueAsString(accounts)))
                put("store", JSONArray(objectMapper.writeValueAsString(stores)))
                put("terminal", JSONArray(objectMapper.writeValueAsString(terminals)))
                put("user", JSONArray(objectMapper.writeValueAsString(users)))
                put("productcategory", JSONArray(objectMapper.writeValueAsString(categories)))
                put("product", JSONArray(objectMapper.writeValueAsString(products)))
                put("tax", JSONArray(objectMapper.writeValueAsString(taxes)))
                put("modifier", JSONArray(objectMapper.writeValueAsString(modifiers)))
            }

            val response = apiService.pushData(accountKey, payload.toString())

            if (!response.isSuccessful) {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                return Result.failure(Exception("Push data failed (${response.code()}): $errorBody"))
            }

            val pushResponse = response.body()
                ?: return Result.failure(Exception("Empty response from server"))

            if (!pushResponse.success) {
                return Result.failure(Exception(pushResponse.message ?: "Server rejected the data"))
            }

            // If the server assigned a new account key, update it locally
            pushResponse.account_key?.let { newKey ->
                if (newKey.isNotBlank() && newKey != accountKey) {
                    prefsManager.accountId = newKey
                }
            }

            // Mark as synced — store the setup mode as "cloud" so future syncs work
            prefsManager.setString("setup_mode", "cloud")
            prefsManager.email = email

            Result.success(pushResponse)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Builds a summary of what local data would be pushed.
     * Useful for showing to the user before they confirm.
     */
    suspend fun getPushDataSummary(): PushDataSummary {
        val stores = db.storeDao().getAllStores()
        val terminals = db.terminalDao().getAllTerminals()
        val users = db.userDao().getAllUsers()
        val categories = db.productCategoryDao().getAllProductCategoriesSync()
        val products = db.productDao().getAllProductsSync()
        val taxes = db.taxDao().getAllTaxesSync()
        val modifiers = db.modifierDao().getAllModifiers()

        return PushDataSummary(
            storeCount = stores.size,
            terminalCount = terminals.size,
            userCount = users.size,
            categoryCount = categories.size,
            productCount = products.size,
            taxCount = taxes.size,
            modifierCount = modifiers.size
        )
    }

    data class PushDataSummary(
        val storeCount: Int,
        val terminalCount: Int,
        val userCount: Int,
        val categoryCount: Int,
        val productCount: Int,
        val taxCount: Int,
        val modifierCount: Int
    )

    suspend fun updateSequences(terminal: Terminal) {
        // Update order document number sequence
        val orderSeq = db.sequenceDao().getSequenceByNameForTerminal(
            Sequence.ORDER_DOCUMENT_NO, terminal.terminalId
        )
        if (orderSeq != null && terminal.sequence > orderSeq.sequenceNo) {
            db.sequenceDao().updateSequence(orderSeq.copy(sequenceNo = terminal.sequence))
        }

        // Update till document number sequence
        val tillSeq = db.sequenceDao().getSequenceByNameForTerminal(
            Sequence.TILL_DOCUMENT_NO, terminal.terminalId
        )
        if (tillSeq != null && terminal.cash_up_sequence > tillSeq.sequenceNo) {
            db.sequenceDao().updateSequence(tillSeq.copy(sequenceNo = terminal.cash_up_sequence))
        }
    }
}
