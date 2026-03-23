package com.posterita.pos.android.kds

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * In-process event bus for KDS state changes.
 * Cart/Kitchen activities emit events → KdsServer relays to SSE clients.
 * KdsDisplayActivity also subscribes for local display when running on same device.
 */
object KdsEventBus {

    sealed class KdsEvent {
        data class OrderCreated(val holdOrderId: Int, val tableName: String) : KdsEvent()
        data class OrderUpdated(val holdOrderId: Int) : KdsEvent()
        data class ItemBumped(val holdOrderId: Int, val lineIndex: Int, val newStatus: String) : KdsEvent()
        data class OrderBumped(val holdOrderId: Int, val newStatus: String) : KdsEvent()
        data class OrderRecalled(val holdOrderId: Int) : KdsEvent()
        data class OrderDeleted(val holdOrderId: Int) : KdsEvent()
        data class TableTransferred(val holdOrderId: Int, val fromTable: String, val toTable: String) : KdsEvent()
        data class OrderMerged(val sourceOrderId: Int, val targetOrderId: Int) : KdsEvent()
        object Heartbeat : KdsEvent()
    }

    private val _events = MutableSharedFlow<KdsEvent>(extraBufferCapacity = 64)
    val events: SharedFlow<KdsEvent> = _events.asSharedFlow()

    fun emit(event: KdsEvent) {
        _events.tryEmit(event)
    }
}
