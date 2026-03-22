package com.posterita.pos.android.service

import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

/**
 * Singleton that holds live sync status observable by the UI.
 * Updated by CloudSyncWorker/CloudSyncService during sync operations.
 */
object SyncStatusManager {

    /** Current sync state */
    enum class SyncState {
        IDLE,
        CONNECTING,
        REGISTERING,
        PUSHING_ORDERS,
        PUSHING_TILLS,
        PULLING_PRODUCTS,
        PULLING_CATEGORIES,
        PULLING_TAXES,
        PULLING_MODIFIERS,
        PULLING_CUSTOMERS,
        PULLING_USERS,
        PULLING_IMAGES,
        SAVING,
        COMPLETE,
        ERROR
    }

    data class SyncStatus(
        val state: SyncState = SyncState.IDLE,
        val message: String = "",
        /** e.g. "10 / 100" for products */
        val progressDetail: String = "",
        /** 0..100, -1 for indeterminate */
        val progressPercent: Int = -1,
        /** Summary after sync completes */
        val summary: SyncSummary? = null,
        /** Error message if state == ERROR */
        val errorMessage: String? = null,
        /** Timestamp of last successful sync (millis) */
        val lastSyncTime: Long = 0L,
    )

    data class SyncSummary(
        val ordersPushed: Int = 0,
        val orderLinesPushed: Int = 0,
        val tillsPushed: Int = 0,
        val productsPulled: Int = 0,
        val categoriesPulled: Int = 0,
        val taxesPulled: Int = 0,
        val modifiersPulled: Int = 0,
        val customersPulled: Int = 0,
        val usersPulled: Int = 0,
        val storesPulled: Int = 0,
        val terminalsPulled: Int = 0,
        val discountCodesPulled: Int = 0,
        val preferencesPulled: Int = 0,
        val tablesPulled: Int = 0,
        val imagesSynced: Int = 0,
        val errors: List<String> = emptyList(),
        val durationMs: Long = 0,
    ) {
        val totalPushed get() = ordersPushed + tillsPushed
        val totalPulled get() = productsPulled + categoriesPulled + taxesPulled +
                modifiersPulled + customersPulled + usersPulled +
                storesPulled + terminalsPulled +
                discountCodesPulled + preferencesPulled + tablesPulled

        fun toDisplayString(): String {
            val parts = mutableListOf<String>()
            if (ordersPushed > 0) parts.add("$ordersPushed orders")
            if (tillsPushed > 0) parts.add("$tillsPushed tills")
            if (productsPulled > 0) parts.add("$productsPulled products")
            if (categoriesPulled > 0) parts.add("$categoriesPulled categories")
            if (taxesPulled > 0) parts.add("$taxesPulled taxes")
            if (modifiersPulled > 0) parts.add("$modifiersPulled modifiers")
            if (customersPulled > 0) parts.add("$customersPulled customers")
            if (usersPulled > 0) parts.add("$usersPulled users")
            if (storesPulled > 0) parts.add("$storesPulled stores")
            if (terminalsPulled > 0) parts.add("$terminalsPulled terminals")
            if (discountCodesPulled > 0) parts.add("$discountCodesPulled discount codes")
            if (preferencesPulled > 0) parts.add("$preferencesPulled preferences")
            if (tablesPulled > 0) parts.add("$tablesPulled tables")

            return if (parts.isEmpty()) "Everything up to date" else parts.joinToString(", ")
        }
    }

    private val _status = MutableStateFlow(SyncStatus())
    val status: StateFlow<SyncStatus> = _status.asStateFlow()

    fun update(state: SyncState, message: String, detail: String = "", percent: Int = -1) {
        _status.value = _status.value.copy(
            state = state,
            message = message,
            progressDetail = detail,
            progressPercent = percent,
            errorMessage = null,
        )
    }

    fun complete(summary: SyncSummary, lastSyncTime: Long) {
        _status.value = SyncStatus(
            state = SyncState.COMPLETE,
            message = "Sync complete",
            summary = summary,
            lastSyncTime = lastSyncTime,
        )
    }

    fun error(message: String) {
        _status.value = _status.value.copy(
            state = SyncState.ERROR,
            message = "Sync failed",
            errorMessage = message,
        )
    }

    fun idle(lastSyncTime: Long = _status.value.lastSyncTime) {
        _status.value = SyncStatus(
            state = SyncState.IDLE,
            lastSyncTime = lastSyncTime,
        )
    }

    fun setLastSyncTime(millis: Long) {
        _status.value = _status.value.copy(lastSyncTime = millis)
    }
}
